import { chatText, runWithTools, MODEL } from "./model-provider";
import { tavilySearch } from "./tavily";
import { parseJsonResponse } from "./json";
import type { ToolDefinition } from "./chat-types";
import type { Puzzle } from "../../src/lib/puzzle-schema";
import type { ServiceEntry } from "../../src/lib/service-entry";

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
/**
 * Hard structural check — runs before any LLM call.
 * Fails immediately if any clue contains the answer name or an alias verbatim
 * (case-insensitive substring match). This catches the most obvious generation
 * failure — a clue that simply states "Azure Foo is a ..." — without burning
 * any API quota.
 */
function containsAnswerName(puzzle: Puzzle): string | null {
  const terms = [puzzle.answer, ...(puzzle.aliases ?? [])].map((t) => t.toLowerCase());
  for (let i = 0; i < puzzle.clues.length; i++) {
    const clue = puzzle.clues[i].toLowerCase();
    for (const term of terms) {
      if (term.length > 2 && clue.includes(term)) {
        return `Clue ${i + 1} contains the answer name "${term}" verbatim`;
      }
    }
  }
  return null;
}

export async function calibrate(puzzle: Puzzle, entry?: ServiceEntry): Promise<CalibrationResult> {
  const nameLeakIssue = containsAnswerName(puzzle);
  if (nameLeakIssue) {
    console.log(`  answer name leak: ${nameLeakIssue}`);
    return { passed: false, reason: "fact_check", issues: [nameLeakIssue] };
  }

  const shortlistReply = await chatText(MODEL, [
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

  const factResult = await passesFactCheck(puzzle, entry);
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

const SEARCH_TOOL: ToolDefinition = {
  name: "search_web",
  description:
    "Search the web for current, factual information about an Azure service — its name, " +
    "abbreviation, AWS equivalent, or a specific feature claim. Use this whenever you are not " +
    "fully certain a claim is accurate or current, especially for newer or less-common Azure " +
    "services you may not have complete or up-to-date knowledge of.",
  parameters: {
    type: "object",
    required: ["query"],
    properties: {
      query: { type: "string", description: "The search query, e.g. \"Azure Container Apps AWS equivalent\"" },
    },
  },
};

/**
 * Replaces the human review checklist from CLAUDE.md with a model-graded
 * pass over the same criteria: facts correct and current (service name,
 * abbreviation, AWS equivalent), clue 5 identifies exactly one service, and
 * clues strictly increase in specificity (no early clue giving it away).
 *
 * Has web search available (Tavily) — the model's own knowledge can be
 * stale or incomplete for newer/less-common services (see CLAUDE.md on
 * why answers now come from the full services.json vocab, not just what
 * the model already knows well). It's offered as a tool, not forced on
 * every call — the model decides when it's actually uncertain enough to
 * need it, per the tool's own description.
 */
async function passesFactCheck(
  puzzle: Puzzle,
  entry?: ServiceEntry,
): Promise<{ passed: true } | { passed: false; reason: "fact_check"; issues: string[] }> {
  const attributeNote = entry
    ? `\n\nThe following are authoritative ground-truth attributes for this service. ` +
      `Verify that the clues are CONSISTENT with these values — a clue that contradicts ` +
      `a known attribute (e.g. saying it scales to zero when pricingModel is "Per hour", ` +
      `or describing it as IaaS when computeModel is "Serverless") is a facts error:\n` +
      `  category:     ${entry.category}\n` +
      `  launchYear:   ${entry.launchYear}\n` +
      `  computeModel: ${entry.computeModel}\n` +
      `  pricingModel: ${entry.pricingModel}` +
      (entry.awsEquivalent ? `\n  awsEquivalent: ${entry.awsEquivalent}` : "") +
      (entry.description ? `\n  description:  ${entry.description}` : "") +
      (entry.documentation_links?.length
        ? `\n\nOfficial documentation links for this service (search these URLs first before ` +
          `using search_web — they are the authoritative source for fact-checking):\n` +
          entry.documentation_links.map((l) => `  - ${l}`).join("\n")
        : "")
    : "";

  const reply = await runWithTools(
    MODEL,
    [
      {
        role: "system",
        content:
          "You are a meticulous fact-checker for an Azure trivia game. You have a search_web tool — use it " +
          "when you're not fully certain a claim is accurate or current, especially for services you may not " +
          "know well. Verify the puzzle below and respond with ONLY a JSON object: " +
          '{"factsCorrect": boolean, "clue5Unique": boolean, "ladderAscending": boolean, "issues": string[]}. ' +
          "factsCorrect: is every factual claim actually made in the clues (which may include an " +
          "abbreviation or unique product fact — NOT an AWS equivalent, which is banned as a clue) accurate " +
          "and current for Azure today? Fail factsCorrect if clue 5 states the AWS equivalent of the service " +
          "as its giveaway — that is a design error, not a facts error per se, but use this field to flag " +
          "it. Some Azure services genuinely have no common abbreviation, which is NOT itself an error. " +
          "Do not fail this because a claim type is absent — only because a claim that IS made is wrong OR " +
          "because clue 5 is just 'the AWS equivalent is X'. clue5Unique: does clue 5 alone identify " +
          "exactly this one service, not a family of services? ladderAscending: does each clue get MORE " +
          "specific than the last, with no clue before the last one already giving away the exact answer? " +
          "issues: a list of specific problems found. MANDATORY: if factsCorrect, clue5Unique, or " +
          "ladderAscending is false, issues MUST contain at least one specific, concrete explanation naming " +
          "which clue and what is wrong with it — never return false for any field with an empty issues " +
          "array. Only return an empty issues array when all three fields are true. Once you've verified " +
          "(searching if needed), respond with ONLY the JSON object — no other text.",
      },
      {
        role: "user",
        content: JSON.stringify({
          answer: puzzle.answer,
          aliases: puzzle.aliases,
          clues: puzzle.clues,
        }) + attributeNote,
      },
    ],
    [SEARCH_TOOL],
    { search_web: async (args) => tavilySearch(String(args.query)) },
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
