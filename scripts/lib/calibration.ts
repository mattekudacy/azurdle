import { chatComplete, MODEL } from "./model-provider";
import { parseJsonResponse } from "./json";
import type { Puzzle } from "../../src/lib/puzzle-schema";

export type CalibrationResult =
  | { passed: true }
  | { passed: false; reason: "too_vague" }
  | { passed: false; reason: "fact_check"; issues: string[] };

/**
 * Adversarial + fact calibration. This is the ENTIRE review gate — there is
 * no human step. A puzzle that passes both checks goes straight to
 * `queued`. See CLAUDE.md: the human review checklist that used to gate
 * `pending_review` -> `queued` is now enforced here instead.
 *
 * There used to be a third check here: sample 5 guesses from clue 1 alone
 * and reject if an LLM landed the answer too often. Removed after a human
 * spot-check of real rejected clues showed the check was measuring the
 * wrong thing — it tests whether a top-tier LLM (the same tier drafting
 * the clue) can pattern-match a service from a business description, which
 * is a much narrower, sharper skill than "would a human Azure professional
 * find this appropriately hard" (the actual audience — see PRODUCT.md). In
 * a blind read of real drafts, clues the check rejected at 100% LLM hit
 * rate read as genuinely ambiguous to a human. The check was rejecting good
 * clues, not catching bad ones. See CLAUDE.md for the fuller rationale.
 */
export async function calibrate(puzzle: Puzzle): Promise<CalibrationResult> {
  const shortlistReply = await chatComplete(MODEL, [
    {
      role: "system",
      content:
        "You are an Azure expert playing a guessing game. Given clues, reply with a comma-separated shortlist of candidate service names, or 'unknown' if you have no idea.",
    },
    { role: "user", content: puzzle.clues.slice(0, 3).join("\n") },
  ]);
  if (shortlistReply.toLowerCase().includes("unknown")) {
    console.log("  clues 1-3 too vague: model could not shortlist");
    return { passed: false, reason: "too_vague" };
  }

  const factResult = await passesFactCheck(puzzle);
  if (!factResult.passed) return factResult;

  return { passed: true };
}

/** Back-compat boolean wrapper — used by scripts/calibrate.ts's standalone
 * spot-check, which only needs pass/fail, not the revision-driving detail. */
export async function passesCalibration(puzzle: Puzzle): Promise<boolean> {
  return (await calibrate(puzzle)).passed;
}

type FactCheckResult = {
  factsCorrect: boolean;
  clue5Unique: boolean;
  ladderAscending: boolean;
  issues: string[];
};

/**
 * Replaces the human review checklist from CLAUDE.md with a model-graded
 * pass over the same criteria: facts correct and current (service name,
 * abbreviation, AWS equivalent), clue 5 identifies exactly one service, and
 * clues strictly increase in specificity (no early clue giving it away).
 */
async function passesFactCheck(
  puzzle: Puzzle,
): Promise<{ passed: true } | { passed: false; reason: "fact_check"; issues: string[] }> {
  const reply = await chatComplete(
    MODEL,
    [
      {
        role: "system",
        content:
          "You are a meticulous fact-checker for an Azure trivia game. Verify the puzzle below and " +
          "respond with ONLY a JSON object: " +
          '{"factsCorrect": boolean, "clue5Unique": boolean, "ladderAscending": boolean, "issues": string[]}. ' +
          "factsCorrect: is every factual claim actually made in the clues (which may include an AWS " +
          "equivalent, an abbreviation, or another specific claim — not all three are required, and some " +
          "Azure services genuinely have no common abbreviation, which is NOT itself an error) accurate and " +
          "current for Azure today? Do not fail this because a claim type is absent — only because a claim " +
          "that IS made is wrong. clue5Unique: does clue 5 alone identify exactly this one service, not a " +
          "family of services? ladderAscending: does each clue get MORE specific than the last, with no clue " +
          "before the last one already giving away the exact answer? issues: a list of specific problems " +
          "found. MANDATORY: if factsCorrect, clue5Unique, or ladderAscending is false, issues MUST contain " +
          "at least one specific, concrete explanation naming which clue and what is wrong with it — never " +
          "return false for any field with an empty issues array. Only return an empty issues array when " +
          "all three fields are true.",
      },
      {
        role: "user",
        content: JSON.stringify({
          answer: puzzle.answer,
          aliases: puzzle.aliases,
          clues: puzzle.clues,
        }),
      },
    ],
    { json: true },
  );

  const result = parseJsonResponse<FactCheckResult>(reply);

  if (!result.factsCorrect || !result.clue5Unique || !result.ladderAscending) {
    // Defensive fallback: the prompt mandates a populated `issues` array on
    // any failure, but prompt-following isn't guaranteed — if the model
    // still returns an empty array, synthesize which field(s) failed so the
    // log is never a dead end.
    const issues =
      result.issues.length > 0
        ? result.issues
        : [
            !result.factsCorrect && "factsCorrect was false",
            !result.clue5Unique && "clue5Unique was false",
            !result.ladderAscending && "ladderAscending was false",
          ].filter((issue): issue is string => Boolean(issue));
    console.log(`  fact check failed: ${issues.join("; ")}`);
    return { passed: false, reason: "fact_check", issues };
  }

  return { passed: true };
}
