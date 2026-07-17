import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "azurdle-progress";
const ALGORITHM = "sha256";

export type AnonProgress = {
  date: string;
  guesses: string[];
  cluesRevealed: number;
};

function secret(): string {
  const s = process.env.ANONYMOUS_PROGRESS_SECRET;
  if (!s) throw new Error("ANONYMOUS_PROGRESS_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac(ALGORITHM, secret()).update(payload).digest("hex");
}

export function serializeAnonProgress(progress: AnonProgress): string {
  const payload = JSON.stringify(progress);
  const mac = sign(payload);
  return Buffer.from(payload).toString("base64url") + "." + mac;
}

export function parseAnonProgress(cookie: string): AnonProgress | null {
  const dot = cookie.lastIndexOf(".");
  if (dot === -1) return null;
  const encodedPayload = cookie.slice(0, dot);
  const mac = cookie.slice(dot + 1);

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(payload);
  let macBuf: Buffer;
  try {
    macBuf = Buffer.from(mac, "hex");
  } catch {
    return null;
  }
  const expectedBuf = Buffer.from(expected, "hex");
  if (macBuf.length !== expectedBuf.length || !timingSafeEqual(macBuf, expectedBuf)) {
    return null;
  }

  try {
    const data = JSON.parse(payload) as AnonProgress;
    if (
      typeof data.date !== "string" ||
      !Array.isArray(data.guesses) ||
      typeof data.cluesRevealed !== "number"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
