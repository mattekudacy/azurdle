import { z } from "zod";

// Reserve puzzles have no calendar slot until pulled off the shelf as a
// runtime fallback, so date/number are optional only for status "reserve".
// Accepts both undefined (generation builds these objects without the key
// at all) and null (Supabase returns null, not undefined, for an absent
// column when reading a row back) — .nullish() covers both, .optional()
// alone does not.
export const puzzleSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
      .nullish(),
    number: z.number().int().positive().nullish(),
    answer: z.string().min(1),
    aliases: z.array(z.string().min(1)).default([]),
    clues: z.array(z.string().min(1)).length(5, "clues must contain exactly 5 strings"),
    category: z.string().min(1),
    difficulty: z.enum(["easy", "medium", "hard"]),
    status: z.enum(["queued", "live", "retired", "reserve"]).default("queued"),
  })
  .refine((puzzle) => puzzle.status === "reserve" || (puzzle.date && puzzle.number), {
    message: "date and number are required unless status is 'reserve'",
  });

export type Puzzle = z.infer<typeof puzzleSchema>;
