import type { ServiceEntry } from "./service-entry";

export type AttributeComparison = {
  category:     { value: string; match: "exact" | "none" };
  launchYear:   { value: number; match: "exact" | "higher" | "lower" };
  computeModel: { value: string; match: "exact" | "none" };
  pricingModel: { value: string; match: "exact" | "none" };
};

/**
 * Compares a guessed service's attributes against the answer's attributes.
 * All `value` fields reflect the GUESSED service (not the answer).
 *
 * - String fields: "exact" if equal (case-insensitive), else "none".
 * - launchYear:
 *     "exact"  — years are equal
 *     "higher" — answer is newer (player should guess a newer service)
 *     "lower"  — answer is older (player should guess an older service)
 */
export function compareAttributes(
  guess: ServiceEntry,
  answer: ServiceEntry,
): AttributeComparison {
  return {
    category: {
      value: guess.category,
      match:
        guess.category.toLowerCase() === answer.category.toLowerCase()
          ? "exact"
          : "none",
    },
    launchYear: {
      value: guess.launchYear,
      match:
        guess.launchYear === answer.launchYear
          ? "exact"
          : answer.launchYear > guess.launchYear
          ? "higher"
          : "lower",
    },
    computeModel: {
      value: guess.computeModel,
      match:
        guess.computeModel.toLowerCase() === answer.computeModel.toLowerCase()
          ? "exact"
          : "none",
    },
    pricingModel: {
      value: guess.pricingModel,
      match:
        guess.pricingModel.toLowerCase() === answer.pricingModel.toLowerCase()
          ? "exact"
          : "none",
    },
  };
}
