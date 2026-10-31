export const STATS_STORAGE_KEY = "nag.stats.v1";
export function createLocalStatsStorage() {
    return {
        read: () => {
            try {
                return window.localStorage.getItem(STATS_STORAGE_KEY);
            }
            catch {
                return null;
            }
        },
        write: (value) => {
            try {
                window.localStorage.setItem(STATS_STORAGE_KEY, value);
            }
            catch {
                // Private mode and blocked storage degrade to no persistence.
            }
        },
    };
}
export function createStatsStore(storage) {
    return {
        statsFor: (levelId) => readStats(storage)[String(levelId)] ?? zeroStats(),
        record: (levelId, result) => recordResult(storage, levelId, result),
        clear: () => {
            storage.write("{}");
        },
    };
}
function zeroStats() {
    return {
        lastScore: 0,
        lastTimeMs: 0,
        bestScore: null,
        bestTimeMs: null,
        gamesPlayed: 0,
    };
}
function recordResult(storage, levelId, result) {
    const all = readStats(storage);
    const previous = all[String(levelId)] ?? zeroStats();
    const isNewBestScore = result.won && (previous.bestScore === null || result.score > previous.bestScore);
    const isNewBestTime = result.won && (previous.bestTimeMs === null || result.timeMs < previous.bestTimeMs);
    const updated = {
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
function readStats(storage) {
    const raw = storage.read();
    if (raw === null) {
        return {};
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return {};
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
    }
    const source = parsed;
    const result = {};
    for (const key of Object.keys(source)) {
        const entry = source[key];
        if (isLevelStats(entry)) {
            result[key] = entry;
        }
    }
    return result;
}
function isLevelStats(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const stats = value;
    return (typeof stats.lastScore === "number" &&
        typeof stats.lastTimeMs === "number" &&
        typeof stats.gamesPlayed === "number" &&
        isNullableNumber(stats.bestScore) &&
        isNullableNumber(stats.bestTimeMs));
}
function isNullableNumber(value) {
    return value === null || typeof value === "number";
}
//# sourceMappingURL=stats-store.js.map