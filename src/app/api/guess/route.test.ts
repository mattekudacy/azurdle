import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { POST } from "./route";

// ---- module mocks --------------------------------------------------------

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@/lib/puzzles", () => ({
  getPuzzleForDate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/attempts", () => ({
  getAttempt: vi.fn(),
  upsertAttempt: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

vi.mock("@/lib/anon-progress", () => ({
  COOKIE_NAME: "azurdle-progress",
  parseAnonProgress: vi.fn(() => null),
  serializeAnonProgress: vi.fn(() => "signed-cookie-value"),
}));

// ---- import mocked modules -----------------------------------------------

import { headers, cookies } from "next/headers";
import { getPuzzleForDate } from "@/lib/puzzles";
import { createClient } from "@/lib/supabase/server";
import { getAttempt, upsertAttempt } from "@/lib/attempts";
import { isRateLimited } from "@/lib/rate-limit";
import { parseAnonProgress, serializeAnonProgress } from "@/lib/anon-progress";

// ---- helpers ---------------------------------------------------------------

const TODAY = "2026-07-17";

const fakePuzzle = {
  date: TODAY,
  number: 42,
  answer: "Azure Kubernetes Service",
  aliases: ["AKS"],
  clues: ["clue1", "clue2", "clue3", "clue4", "clue5"],
  category: "Containers",
  difficulty: "medium" as const,
  status: "live",
};

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAnonClient() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as never);
}

function mockAuthedClient(userId = "user-1", attempt: null | object = null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
  } as never);
  vi.mocked(getAttempt).mockResolvedValue(attempt as never);
}

function mockCookieStore(cookieValue: string | null = null) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === "azurdle-progress" && cookieValue ? { value: cookieValue } : undefined),
    set: vi.fn(),
    getAll: () => [],
  } as never);
}

function mockHeaders(forwardedFor = "1.2.3.4") {
  vi.mocked(headers).mockResolvedValue({
    get: (name: string) => (name === "x-forwarded-for" ? forwardedFor : null),
  } as never);
}

// ---- tests -----------------------------------------------------------------

beforeAll(() => {
  process.env.ANONYMOUS_PROGRESS_SECRET = "test-secret-at-least-32-chars-long-xxxx";
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPuzzleForDate).mockResolvedValue(fakePuzzle);
  vi.mocked(isRateLimited).mockResolvedValue(false);
  vi.mocked(upsertAttempt).mockResolvedValue(undefined);
  mockHeaders();
  mockCookieStore(null);
  // Default: fresh anon (no cookie)
  vi.mocked(parseAnonProgress).mockReturnValue(null);
});

describe("POST /api/guess — anonymous, no prior cookie", () => {
  it("returns correct=false and nextClue on a wrong first guess", async () => {
    mockAnonClient();

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.correct).toBe(false);
    expect(data.gameOver).toBe(false);
    expect(data.nextClue).toBe("clue2");
    expect(data.answer).toBeUndefined();
  });

  it("returns correct=true and answer on a correct first guess", async () => {
    mockAnonClient();

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Kubernetes Service" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.correct).toBe(true);
    expect(data.gameOver).toBe(true);
    expect(data.answer).toBe("Azure Kubernetes Service");
    expect(data.allClues).toEqual(fakePuzzle.clues);
  });

  it("accepts alias as a correct guess", async () => {
    mockAnonClient();

    const res = await POST(makeRequest({ date: TODAY, guess: "AKS" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.correct).toBe(true);
  });

  it("sets the signed cookie after a guess", async () => {
    mockAnonClient();
    const setCookieFn = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
      set: setCookieFn,
      getAll: () => [],
    } as never);

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));

    expect(res.status).toBe(200);
    // Cookie set via NextResponse.cookies.set — verify serializeAnonProgress was called
    expect(vi.mocked(serializeAnonProgress)).toHaveBeenCalledWith(
      expect.objectContaining({ date: TODAY, guesses: ["Azure Functions"] }),
    );
  });
});

describe("POST /api/guess — anonymous, with prior cookie", () => {
  it("uses cookie progress, not a fresh start", async () => {
    mockAnonClient();
    // Simulate 4 prior guesses from cookie — next guess triggers gameOver
    vi.mocked(parseAnonProgress).mockReturnValue({
      date: TODAY,
      guesses: ["a", "b", "c", "d"],
      cluesRevealed: 5,
    });
    mockCookieStore("a-valid-cookie");

    const res = await POST(makeRequest({ date: TODAY, guess: "still-wrong" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gameOver).toBe(true);
    expect(data.answer).toBe("Azure Kubernetes Service");
  });

  it("ignores a cookie for a different date", async () => {
    mockAnonClient();
    vi.mocked(parseAnonProgress).mockReturnValue({
      date: "2026-07-16", // yesterday
      guesses: ["a", "b", "c", "d"],
      cluesRevealed: 5,
    });
    mockCookieStore("stale-cookie");

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));
    const data = await res.json();

    // Fresh start — only 1 guess so far, not game over
    expect(data.gameOver).toBe(false);
    expect(data.correct).toBe(false);
  });

  it("does NOT accept priorGuesses in the request body for anon players", async () => {
    mockAnonClient();

    // Sending priorGuesses in body (old API) — server ignores it now
    const res = await POST(
      makeRequest({ date: TODAY, guess: "junk", priorGuesses: ["a", "b", "c", "d"] }),
    );
    const data = await res.json();

    // Body schema no longer includes priorGuesses, so it's silently stripped.
    // Only 1 guess (this one), so not game over.
    expect(res.status).toBe(200);
    expect(data.gameOver).toBe(false);
  });
});

describe("POST /api/guess — authenticated", () => {
  it("uses server-side attempt progress, ignores any cookie", async () => {
    mockAuthedClient("user-1", {
      user_id: "user-1",
      puzzle_date: TODAY,
      guesses: ["a", "b", "c", "d"],
      clues_revealed: 5,
      solved: false,
      completed_at: null,
    });

    const res = await POST(makeRequest({ date: TODAY, guess: "still-wrong" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gameOver).toBe(true);
    expect(data.answer).toBe("Azure Kubernetes Service");
    expect(vi.mocked(upsertAttempt)).toHaveBeenCalled();
  });

  it("rejects a guess when puzzle is already solved", async () => {
    mockAuthedClient("user-1", {
      user_id: "user-1",
      puzzle_date: TODAY,
      guesses: ["Azure Kubernetes Service"],
      clues_revealed: 1,
      solved: true,
      completed_at: "2026-07-17T10:00:00Z",
    });

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("puzzle already solved");
  });

  it("does not set the progress cookie for authenticated users", async () => {
    mockAuthedClient("user-1", null);
    const setCookieFn = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
      set: setCookieFn,
      getAll: () => [],
    } as never);

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));

    expect(res.status).toBe(200);
    expect(vi.mocked(serializeAnonProgress)).not.toHaveBeenCalled();
  });
});

describe("POST /api/guess — validation & edge cases", () => {
  it("returns 400 for a future date", async () => {
    mockAnonClient();

    const res = await POST(makeRequest({ date: "2099-01-01", guess: "Azure Functions" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("puzzle not available yet");
  });

  it("returns 404 when puzzle does not exist", async () => {
    mockAnonClient();
    vi.mocked(getPuzzleForDate).mockResolvedValue(null);

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("puzzle not found");
  });

  it("returns 400 for malformed request body", async () => {
    mockAnonClient();

    const res = await POST(
      new Request("http://localhost/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid request body");
  });

  it("returns 429 when rate limited", async () => {
    mockAnonClient();
    vi.mocked(isRateLimited).mockResolvedValue(true);

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBe("rate limited");
  });

  it("uses the last IP in a multi-hop x-forwarded-for header", async () => {
    mockAnonClient();
    // Simulate a spoofed chain: attacker prepends their own IP
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) =>
        name === "x-forwarded-for" ? "1.1.1.1, 2.2.2.2, 3.3.3.3" : null,
    } as never);
    vi.mocked(isRateLimited).mockImplementation(async (key) => {
      expect(key).toBe("3.3.3.3");
      return false;
    });

    await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));
  });
});

describe("POST /api/guess — attributeComparison", () => {
  it("includes attributeComparison on a wrong guess for a service in vocab", async () => {
    mockAnonClient();

    // fakePuzzle.answer = "Azure Kubernetes Service" (in vocab, category: Containers, launchYear: 2018)
    // guess = "Azure Functions" (in vocab, category: Compute, launchYear: 2016)
    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Functions" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.correct).toBe(false);
    expect(data.gameOver).toBe(false);

    const ac = data.attributeComparison;
    expect(ac).toBeDefined();

    // value is always the guessed service's attribute
    expect(ac.category.value).toBe("Compute");
    expect(ac.category.match).toBe("none"); // Compute vs Containers

    // Azure Functions launched 2016, AKS launched 2018 → answer is newer → "higher"
    expect(ac.launchYear.value).toBe(2016);
    expect(ac.launchYear.match).toBe("higher");

    expect(ac.computeModel.value).toBe("Serverless");
    expect(ac.computeModel.match).toBe("none"); // Serverless vs Managed Service

    expect(ac.pricingModel.value).toBe("Per request");
    expect(ac.pricingModel.match).toBe("none"); // Per request vs Per hour
  });

  it("omits attributeComparison on a correct guess", async () => {
    mockAnonClient();

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Kubernetes Service" }));
    const data = await res.json();

    expect(data.correct).toBe(true);
    expect(data.attributeComparison).toBeUndefined();
  });

  it("omits attributeComparison when game is over (5th wrong guess)", async () => {
    mockAnonClient();
    vi.mocked(parseAnonProgress).mockReturnValue({
      date: TODAY,
      guesses: ["a", "b", "c", "d"],
      cluesRevealed: 5,
    });
    mockCookieStore("a-valid-cookie");

    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Blob Storage" }));
    const data = await res.json();

    expect(data.gameOver).toBe(true);
    expect(data.attributeComparison).toBeUndefined();
  });

  it("omits attributeComparison when guessed service is not in vocab", async () => {
    mockAnonClient();

    // A made-up service name not in services.json
    const res = await POST(makeRequest({ date: TODAY, guess: "Azure Totally Fake Service XYZ" }));
    const data = await res.json();

    expect(data.correct).toBe(false);
    expect(data.gameOver).toBe(false);
    // Not in vocab → omitted, not an error
    expect(data.attributeComparison).toBeUndefined();
  });
});
