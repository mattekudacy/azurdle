/**
 * Normalizes a service name or guess for comparison: lowercase, strip a
 * leading "azure "/"microsoft " brand prefix, then strip non-alphanumerics.
 * "AKS" and "Azure Kubernetes Service" must normalize to a comparable form
 * via the `aliases` list — this function alone does not expand abbreviations.
 */
export function normalizeGuess(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^(azure|microsoft)\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

export function isCorrectGuess(
  guess: string,
  answer: string,
  aliases: string[],
): boolean {
  const normalizedGuess = normalizeGuess(guess);
  const candidates = [answer, ...aliases].map(normalizeGuess);
  return candidates.includes(normalizedGuess);
}
