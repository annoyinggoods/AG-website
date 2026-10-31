export interface LevelStats {
  readonly lastScore: number;
  readonly lastTimeMs: number;
  readonly bestScore: number | null;
  readonly bestTimeMs: number | null;
  readonly gamesPlayed: number;
}

export interface GameResult {
  readonly score: number;
  readonly timeMs: number;
  readonly won: boolean;
}

export interface RecordResult {
  readonly isNewBestScore: boolean;
  readonly isNewBestTime: boolean;
}

export interface StatsStorage {
  read(): string | null;
  write(value: string): void;
}

export interface StatsStore {
  statsFor(levelId: number): LevelStats;
  record(levelId: number, result: GameResult): RecordResult;
  clear(): void;
}

export const STATS_STORAGE_KEY = "nag.stats.v1";

export function createLocalStatsStorage(): StatsStorage {
  return {
    read: () => {
      try {
        return window.localStorage.getItem(STATS_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        window.localStorage.setItem(STATS_STORAGE_KEY, value);
      } catch {
        // Private mode and blocked storage degrade to no persistence.
      }
    },
  };
}

export function createStatsStore(storage: StatsStorage): StatsStore {
  return {
    statsFor: (levelId) => readStats(storage)[String(levelId)] ?? zeroStats(),
    record: (levelId, result) => recordResult(storage, levelId, result),
    clear: () => {
      storage.write("{}");
    },
  };
}

function zeroStats(): LevelStats {
  return {
    lastScore: 0,
    lastTimeMs: 0,
    bestScore: null,
    bestTimeMs: null,
    gamesPlayed: 0,
  };
}

function recordResult(
  storage: StatsStorage,
  levelId: number,
  result: GameResult,
): RecordResult {
  const all = readStats(storage);
  const previous = all[String(levelId)] ?? zeroStats();

  const isNewBestScore = result.won && (previous.bestScore === null || result.score > previous.bestScore);
  const isNewBestTime = result.won && (previous.bestTimeMs === null || result.timeMs < previous.bestTimeMs);

  const updated: LevelStats = {
    lastScore: result.score,
    lastTimeMs: result.timeMs,
    bestScore: isNewBestScore ? result.score : previous.bestScore,
    bestTimeMs: isNewBestTime ? result.timeMs : previous.bestTimeMs,
    gamesPlayed: previous.gamesPlayed + 1,
  };

  all[String(levelId)] = updated;
  storage.write(JSON.stringify(all));
  return { isNewBestScore, isNewBestTime };
}

function readStats(storage: StatsStorage): Record<string, LevelStats> {
  const raw = storage.read();
  if (raw === null) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  const source = parsed as Record<string, unknown>;
  const result: Record<string, LevelStats> = {};
  for (const key of Object.keys(source)) {
    const entry = source[key];
    if (isLevelStats(entry)) {
      result[key] = entry;
    }
  }
  return result;
}

function isLevelStats(value: unknown): value is LevelStats {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const stats = value as Partial<LevelStats>;
  return (
    typeof stats.lastScore === "number" &&
    typeof stats.lastTimeMs === "number" &&
    typeof stats.gamesPlayed === "number" &&
    isNullableNumber(stats.bestScore) &&
    isNullableNumber(stats.bestTimeMs)
  );
}

function isNullableNumber(value: unknown): boolean {
  return value === null || typeof value === "number";
}
