// The panel talks to the dev-only helper over a small JSON interface.
// Without the helper the panel still works: it exports what it would have
// written and the operator runs the command by hand.

import type {
  DeployLine,
  DeploySettings,
  EntryDraft,
  EntrySummary,
  ExcerptReport,
  HealthReport,
  RegistryReport,
  SnapshotReport,
  StyleSaveRequest,
  StyleSaveResult,
  StyleTarget,
  TrashEntry,
  TreeEntry
} from "./types.js";

const HELPER_ROOT = "/api";

export class HelperMissingError extends Error {
  constructor() {
    super("The helper is not running. Start it with node tools/admin/server.mjs.");
    this.name = "HelperMissingError";
  }
}

async function readJson(response: Response): Promise<any> {
  if (!response.ok) {
    let message = "The helper answered with " + String(response.status) + ".";
    try {
      const body = await response.json();
      if (body && typeof body.error === "string") {
        message = body.error;
      }
    } catch (err) {
      void err;
    }
    throw new Error(message);
  }
  return response.json();
}

export async function helperIsRunning(): Promise<boolean> {
  try {
    const response = await fetch(HELPER_ROOT + "/health", { method: "GET" });
    return response.ok;
  } catch (err) {
    void err;
    return false;
  }
}

export async function fetchHealth(): Promise<HealthReport> {
  const response = await fetch(HELPER_ROOT + "/health", { method: "GET" });
  const body = await readJson(response);
  return {
    ok: Boolean(body.ok),
    root: String(body.root || ""),
    stale: Boolean(body.stale),
    staleReason: String(body.staleReason || "")
  };
}

export async function fetchRegistry(): Promise<RegistryReport> {
  const response = await fetch(HELPER_ROOT + "/registry", { method: "GET" });
  const body = await readJson(response);
  return {
    categories: Array.isArray(body.categories) ? (body.categories as string[]) : [],
    unknown: Array.isArray(body.unknown) ? (body.unknown as string[]) : [],
    files: Array.isArray(body.files) ? (body.files as string[]) : []
  };
}

export async function fetchSnapshot(): Promise<SnapshotReport> {
  const response = await fetch(HELPER_ROOT + "/snapshot", { method: "GET" });
  const body = await readJson(response);
  return {
    name: String(body.name || ""),
    path: String(body.path || ""),
    folder: String(body.folder || "dist/snapshots/")
  };
}

export async function fetchTrash(): Promise<TrashEntry[]> {
  const response = await fetch(HELPER_ROOT + "/trash", { method: "GET" });
  const body = await readJson(response);
  return Array.isArray(body.entries) ? (body.entries as TrashEntry[]) : [];
}

export async function restoreEntry(collection: string, slug: string): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(
    HELPER_ROOT + "/entry/restore?collection=" + encodeURIComponent(collection) + "&slug=" + encodeURIComponent(slug),
    { method: "POST" }
  );
  return (await readJson(response)) as { ok: boolean; message: string };
}

export async function fetchTree(): Promise<TreeEntry[]> {
  const response = await fetch(HELPER_ROOT + "/tree", { method: "GET" });
  const body = await readJson(response);
  return Array.isArray(body.entries) ? (body.entries as TreeEntry[]) : [];
}

export async function fetchEntries(collection: string): Promise<EntrySummary[]> {
  const response = await fetch(HELPER_ROOT + "/entries?collection=" + encodeURIComponent(collection), { method: "GET" });
  const body = await readJson(response);
  return Array.isArray(body.entries) ? (body.entries as EntrySummary[]) : [];
}

export async function fetchEntry(collection: string, slug: string): Promise<EntryDraft | null> {
  const response = await fetch(
    HELPER_ROOT + "/entry?collection=" + encodeURIComponent(collection) + "&slug=" + encodeURIComponent(slug),
    { method: "GET" }
  );
  const body = await readJson(response);
  if (!body || !body.entry) {
    return null;
  }
  return body.entry as EntryDraft;
}

export async function fetchExcerpt(body: string, excerpt: string, collection: string): Promise<ExcerptReport> {
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

export async function saveStyle(request: StyleSaveRequest): Promise<StyleSaveResult> {
  const response = await fetch(HELPER_ROOT + "/style/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  return (await readJson(response)) as StyleSaveResult;
}

export async function readStyle(target: StyleTarget): Promise<{ file: string; declarations: Record<string, string> }> {
  const response = await fetch(HELPER_ROOT + "/style/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: target })
  });
  const body = await readJson(response);
  return { file: String(body.file || ""), declarations: body.declarations || {} };
}

export async function saveDraft(draft: EntryDraft): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(HELPER_ROOT + "/entry/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft)
  });
  return (await readJson(response)) as { ok: boolean; message: string };
}

export async function createEntry(draft: EntryDraft): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(HELPER_ROOT + "/entry/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft)
  });
  return (await readJson(response)) as { ok: boolean; message: string };
}

export async function trashEntry(collection: string, slug: string): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(
    HELPER_ROOT + "/entry/trash?collection=" + encodeURIComponent(collection) + "&slug=" + encodeURIComponent(slug),
    { method: "POST" }
  );
  return (await readJson(response)) as { ok: boolean; message: string };
}

// The deploy runs stream their output line by line, so the operator sees the
// server answer while it happens instead of after the fact.
export async function runDeploy(
  mode: "check" | "publish" | "fix",
  settings: DeploySettings,
  onLine: (line: string) => void
): Promise<void> {
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
      let parsed: DeployLine;
      try {
        parsed = JSON.parse(raw) as DeployLine;
      } catch (err) {
        void err;
        onLine(raw);
        continue;
      }
      onLine(parsed.line);
    }
  }
  if (buffer.trim()) {
    onLine(buffer.trim());
  }
}
