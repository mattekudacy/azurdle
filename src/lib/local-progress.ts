const STORAGE_KEY = "azurdle.v1";

export type LocalProgress = {
  puzzleDate: string;
  guesses: string[];
  // Revealed clue text so far — safe to persist locally since the client
  // already received these from the server. Never store the answer here
  // until the game is actually over.
  clues: string[];
  // Once the game ends, `clues` may hold the full 5-clue ladder for context
  // (the server only sends it after gameOver). This marks how many of those
  // were actually revealed during play vs. shown afterward for context, so
  // the UI can dim/italicize the "bonus" ones.
  revealedDuringPlay?: number;
  solved: boolean;
  gameOver: boolean;
  answer?: string;
  completedAt: string | null;
};

type StorageShape = Record<string, LocalProgress>;

function readAll(): StorageShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StorageShape) : {};
  } catch {
    return {};
  }
}

function writeAll(data: StorageShape) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getLocalProgress(puzzleDate: string): LocalProgress | null {
  return readAll()[puzzleDate] ?? null;
}

export function saveLocalProgress(progress: LocalProgress) {
  const all = readAll();
  all[progress.puzzleDate] = progress;
  writeAll(all);
}
