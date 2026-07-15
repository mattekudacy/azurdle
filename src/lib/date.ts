/** "Today" is always the current UTC date — never server or client local time. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isFutureDate(date: string): boolean {
  return date > todayUtc();
}

/** Milliseconds until the next UTC daily rollover (00:00 UTC). */
export function msUntilNextUtcMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return nextMidnight.getTime() - now.getTime();
}
