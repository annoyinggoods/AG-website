// The panel talks to the dev-only helper over a small JSON interface.
// Without the helper the panel still works: it exports what it would have
// written and the operator runs the command by hand.
const HELPER_ROOT = "/api";
export class HelperMissingError extends Error {
    constructor() {
        super("The helper is not running. Start it with npm run admin.");
        this.name = "HelperMissingError";
    }
}
async function readJson(response) {
    if (!response.ok) {
        let message = "The helper answered with " + String(response.status) + ".";
        try {
            const body = await response.json();
            if (body && typeof body.error === "string") {
                message = body.error;
            }
        }
        catch (err) {
            void err;
        }
        throw new Error(message);
    }
    return response.json();
}
export async function helperIsRunning() {
    try {
        const response = await fetch(HELPER_ROOT + "/health", { method: "GET" });
        return response.ok;
    }
    catch (err) {
        void err;
        return false;
    }
}
export async function fetchHealth() {
    const response = await fetch(HELPER_ROOT + "/health", { method: "GET" });
    const body = await readJson(response);
    return {
        ok: Boolean(body.ok),
        root: String(body.root || ""),
        stale: Boolean(body.stale),
        staleReason: String(body.staleReason || ""),
        build: readBuild(body.build),
        idleSeconds: Number(body.idleSeconds || 0),
        idleTimeoutMinutes: Number(body.idleTimeoutMinutes || 0)
    };
}
// The helper stops itself when the operator asks it to, so the work is done
// and the port is free again.
export async function shutdownHelper() {
    const response = await fetch(HELPER_ROOT + "/shutdown", { method: "POST" });
    await readJson(response);
}
// The outcome of the last build the helper started.
function readBuild(raw) {
    const body = raw && typeof raw === "object" ? raw : {};
    return {
        ran: Boolean(body.ran),
        ok: Boolean(body.ok),
        code: Number(body.code || 0),
        message: String(body.message || ""),
        startedAt: Number(body.startedAt || 0)
    };
}
export async function fetchRegistry() {
    const response = await fetch(HELPER_ROOT + "/registry", { method: "GET" });
    const body = await readJson(response);
    return {
        categories: Array.isArray(body.categories) ? body.categories : [],
        unknown: Array.isArray(body.unknown) ? body.unknown : [],
        files: Array.isArray(body.files) ? body.files : []
    };
}
export async function fetchSnapshot() {
    const response = await fetch(HELPER_ROOT + "/snapshot", { method: "GET" });
    const body = await readJson(response);
    return {
        name: String(body.name || ""),
        path: String(body.path || ""),
        folder: String(body.folder || "dist/snapshots/")
    };
}
export async function fetchTrash() {
    const response = await fetch(HELPER_ROOT + "/trash", { method: "GET" });
    const body = await readJson(response);
    return Array.isArray(body.entries) ? body.entries : [];
}
export async function restoreEntry(collection, slug) {
    const response = await fetch(HELPER_ROOT + "/entry/restore?collection=" + encodeURIComponent(collection) + "&slug=" + encodeURIComponent(slug), { method: "POST" });
    return (await readJson(response));
}
export async function fetchTree() {
    const response = await fetch(HELPER_ROOT + "/tree", { method: "GET" });
    const body = await readJson(response);
    return Array.isArray(body.entries) ? body.entries : [];
}
export async function fetchPageFragments() {
    const response = await fetch(HELPER_ROOT + "/page-fragments", { method: "GET" });
    const body = await readJson(response);
    return Array.isArray(body.fragments) ? body.fragments : [];
}
export async function fetchPageFragment(slug) {
    const response = await fetch(HELPER_ROOT + "/page-fragment?slug=" + encodeURIComponent(slug), { method: "GET" });
    const body = await readJson(response);
    if (!body || !body.fragment) {
        return null;
    }
    return body.fragment;
}
export async function savePageFragment(draft) {
    const response = await fetch(HELPER_ROOT + "/page-fragment/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
    });
    return (await readJson(response));
}
export async function fetchEntries(collection) {
    const response = await fetch(HELPER_ROOT + "/entries?collection=" + encodeURIComponent(collection), { method: "GET" });
    const body = await readJson(response);
    return Array.isArray(body.entries) ? body.entries : [];
}
export async function fetchEntry(collection, slug) {
    const response = await fetch(HELPER_ROOT + "/entry?collection=" + encodeURIComponent(collection) + "&slug=" + encodeURIComponent(slug), { method: "GET" });
    const body = await readJson(response);
    if (!body || !body.entry) {
        return null;
    }
    return body.entry;
}
export async function fetchExcerpt(body, excerpt, collection) {
    const response = await fetch(HELPER_ROOT + "/excerpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body, excerpt: excerpt, collection: collection })
    });
    const answer = await readJson(response);
    return {
        excerpt: String(answer.excerpt || ""),
        truncated: Boolean(answer.truncated),
        cardLink: String(answer.cardLink || "Read the entry")
    };
}
export async function saveStyle(request) {
    const response = await fetch(HELPER_ROOT + "/style/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
    });
    return (await readJson(response));
}
export async function readStyle(target) {
    const response = await fetch(HELPER_ROOT + "/style/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target })
    });
    const body = await readJson(response);
    return { file: String(body.file || ""), declarations: body.declarations || {} };
}
export async function saveDraft(draft) {
    const response = await fetch(HELPER_ROOT + "/entry/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
    });
    return (await readJson(response));
}
export async function createEntry(draft) {
    const response = await fetch(HELPER_ROOT + "/entry/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
    });
    return (await readJson(response));
}
export async function trashEntry(collection, slug) {
    const response = await fetch(HELPER_ROOT + "/entry/trash?collection=" + encodeURIComponent(collection) + "&slug=" + encodeURIComponent(slug), { method: "POST" });
    return (await readJson(response));
}
// The deploy runs stream their output line by line, so the operator sees the
// server answer while it happens instead of after the fact. The answer of
// the run is the exit code of the helper script, because a failed publish
// must never look like a finished one.
export async function runDeploy(mode, settings, onLine) {
    const response = await fetch(HELPER_ROOT + "/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: mode, settings: settings })
    });
    if (!response.ok || !response.body) {
        throw new Error("The helper did not start the deploy.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let code = 0;
    for (;;) {
        const chunk = await reader.read();
        if (chunk.done) {
            break;
        }
        buffer = buffer + decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
            const raw = line.trim();
            if (!raw) {
                continue;
            }
            let parsed;
            try {
                parsed = JSON.parse(raw);
            }
            catch (err) {
                void err;
                onLine(raw);
                continue;
            }
            if (parsed.done === true) {
                code = Number(parsed.code || 0);
                continue;
            }
            onLine(parsed.line);
        }
    }
    if (buffer.trim()) {
        onLine(buffer.trim());
    }
    return code;
}
//# sourceMappingURL=api.js.map