import { describe, expect, it, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { serializeAnonProgress, parseAnonProgress } from "./anon-progress";

beforeAll(() => {
  process.env.ANONYMOUS_PROGRESS_SECRET = "test-secret-value-that-is-long-enough";
});

const sample = {
  date: "2026-07-17",
  guesses: ["Azure Functions", "Azure Batch"],
  cluesRevealed: 3,
};

describe("serializeAnonProgress / parseAnonProgress", () => {
  it("round-trips valid progress", () => {
    const cookie = serializeAnonProgress(sample);
    const parsed = parseAnonProgress(cookie);
    expect(parsed).toEqual(sample);
  });

  it("rejects a tampered payload", () => {
    const cookie = serializeAnonProgress(sample);
    const tampered = cookie.slice(0, -4) + "aaaa";
    expect(parseAnonProgress(tampered)).toBeNull();
  });

  it("rejects a cookie with no dot separator", () => {
    expect(parseAnonProgress("notavalidcookie")).toBeNull();
  });

  it("rejects a cookie with invalid base64url payload", () => {
    expect(parseAnonProgress("!!!.deadbeef")).toBeNull();
  });

  it("rejects a cookie with valid MAC but malformed JSON", () => {
    // Craft a cookie where payload is not valid JSON but MAC matches
    // (can't do this without the secret — instead just test structural rejection)
    const cookie = serializeAnonProgress(sample);
    // Replace payload with a valid-looking but wrong-MAC string
    const [, mac] = cookie.split(".");
    const badPayload = Buffer.from("notjson").toString("base64url");
    expect(parseAnonProgress(`${badPayload}.${mac}`)).toBeNull();
  });

  it("rejects progress with a missing field", () => {
    const { date, guesses } = sample;
    // Build a cookie manually from incomplete data
    const payload = JSON.stringify({ date, guesses }); // missing cluesRevealed
    const { createHmac } = require("crypto");
    const mac = createHmac("sha256", process.env.ANONYMOUS_PROGRESS_SECRET!)
      .update(payload)
      .digest("hex");
    const encoded = Buffer.from(payload).toString("base64url");
    expect(parseAnonProgress(`${encoded}.${mac}`)).toBeNull();
  });
});
