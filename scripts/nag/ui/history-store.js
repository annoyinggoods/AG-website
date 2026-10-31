const STORAGE_KEY = "nag.history.v1";
const MAX_ENTRIES = 50;
export function createLocalHistoryStorage() {
    return {
        read: () => {
            try {
                return window.localStorage.getItem(STORAGE_KEY);
            }
            catch {
                return null;
            }
        },
        write: (value) => {
            try {
                window.localStorage.setItem(STORAGE_KEY, value);
            }
            catch {
                // Private mode and blocked storage degrade to no persistence.
            }
        },
    };
}
export function createHistoryStore(storage) {
    return {
        list: () => readEntries(storage),
        record: (entry) => {
            const entries = [entry, ...readEntries(storage)].slice(0, MAX_ENTRIES);
            storage.write(JSON.stringify(entries));
        },
        clear: () => {
            storage.write("[]");
        },
    };
}
function readEntries(storage) {
    const raw = storage.read();
    if (raw === null) {
        return [];
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return [];
    }
    if (!Array.isArray(parsed)) {
        return [];
    }
    return parsed.filter(isHistoryEntry);
}
function isHistoryEntry(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const entry = value;
    return (typeof entry.levelId === "number" &&
        typeof entry.timeMs === "number" &&
        typeof entry.score === "number" &&
        typeof entry.playedAtMs === "number" &&
        typeof entry.progress === "number" &&
        typeof entry.unitCount === "number" &&
        typeof entry.won === "boolean");
}
//# sourceMappingURL=history-store.js.map