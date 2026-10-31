// View two: the content editor.
// It lists the pages from the menu tree, shows the entries of the sections
// that carry them, and writes markdown that the build turns into a card and
// a detail page.

import {
  createEntry,
  fetchEntries,
  fetchEntry,
  fetchExcerpt,
  fetchTree,
  fetchTrash,
  restoreEntry,
  saveDraft,
  trashEntry
} from "./api.js";
import { clear, element, query, required, setStatus } from "./dom.js";
import { entrySource, slugForTitle } from "./entry-source.js";
import type { EntryDraft, EntrySummary, TrashEntry, TreeEntry } from "./types.js";

const COLLECTIONS: { id: string; label: string }[] = [
  { id: "blog", label: "Blog" },
  { id: "words", label: "Words" }
];

let pages: TreeEntry[] = [];
let collection = "";
let editing: EntryDraft | null = null;
let excerptTimer = 0;

function collectionOf(pagePath: string): string {
  const segments = pagePath.split("/").filter(function (part) { return part.length > 0; });
  if (segments.length === 0) {
    return "";
  }
  const first = segments[0];
  for (const known of COLLECTIONS) {
    if (known.id === first) {
      return known.id;
    }
  }
  return "";
}

function fillPages(): void {
  const select = required<HTMLSelectElement>("[data-editor-page]");
  const current = select.value;
  clear(select);
  for (const page of pages) {
    const option = element("option", "", page.title + " — " + page.path);
    option.value = page.path;
    select.appendChild(option);
  }
  if (current && pages.some(function (page) { return page.path === current; })) {
    select.value = current;
  }
}

async function loadEntries(): Promise<void> {
  const list = required<HTMLElement>("[data-editor-entries]");
  const hint = required<HTMLElement>("[data-editor-hint]");
  clear(list);
  const select = required<HTMLSelectElement>("[data-editor-page]");
  const pagePath = select.value;
  collection = collectionOf(pagePath);
  if (!collection) {
    hint.textContent = "This page carries no entries. Only the blog and the words sections do.";
    return;
  }
  hint.textContent = "Entries of the " + collection + " section.";
  const entries = await fetchEntries(collection);
  if (entries.length === 0) {
    const empty = element("li", "editor-entry", "No entry yet. Use Add new entry to write the first one.");
    list.appendChild(empty);
    return;
  }
  for (const entry of entries) {
    list.appendChild(entryRow(entry));
  }
}

function entryRow(entry: EntrySummary): HTMLElement {
  const item = element("li", "editor-entry", "");
  item.appendChild(element("span", "editor-entry-title", entry.title));
  item.appendChild(element("span", "editor-entry-meta", entry.date + " · " + entry.collection + "/" + entry.slug));
  const actions = element("div", "editor-entry-actions", "");
  const edit = element("button", "panel-button", "Edit");
  edit.type = "button";
  edit.addEventListener("click", function () {
    void openEntry(entry.collection, entry.slug);
  });
  actions.appendChild(edit);
  item.appendChild(actions);
  return item;
}

function formValues(): EntryDraft {
  const title = required<HTMLInputElement>("[data-editor-title]").value.trim();
  const date = required<HTMLInputElement>("[data-editor-date]").value.trim();
  const tags = required<HTMLInputElement>("[data-editor-tags]").value.trim();
  const excerpt = required<HTMLInputElement>("[data-editor-excerpt]").value.trim();
  const standfirst = required<HTMLInputElement>("[data-editor-standfirst]").value.trim();
  const author = required<HTMLInputElement>("[data-editor-author]").value.trim();
  const body = required<HTMLTextAreaElement>("[data-editor-body]").value;
  return {
    slug: editing ? editing.slug : "",
    collection: collection,
    title: title,
    date: date,
    tags: tags,
    body: body,
    excerpt: excerpt,
    standfirst: standfirst,
    author: author
  };
}

function fillForm(draft: EntryDraft): void {
  required<HTMLInputElement>("[data-editor-title]").value = draft.title;
  required<HTMLInputElement>("[data-editor-date]").value = draft.date;
  required<HTMLInputElement>("[data-editor-tags]").value = draft.tags;
  required<HTMLInputElement>("[data-editor-excerpt]").value = draft.excerpt || "";
  required<HTMLInputElement>("[data-editor-standfirst]").value = draft.standfirst || "";
  required<HTMLInputElement>("[data-editor-author]").value = draft.author || "";
  required<HTMLTextAreaElement>("[data-editor-body]").value = draft.body;
}

async function openEntry(entryCollection: string, slug: string): Promise<void> {
  const draft = await fetchEntry(entryCollection, slug);
  if (!draft) {
    setStatus("The entry " + slug + " could not be read.", "error");
    return;
  }
  collection = entryCollection;
  editing = draft;
  fillForm(draft);
  required<HTMLElement>("[data-editor-form]").hidden = false;
  required<HTMLElement>("[data-editor-note]").textContent = "Editing " + draft.collection + "/" + draft.slug + ".";
  await refreshPreview();
}

function newEntry(): void {
  editing = null;
  required<HTMLInputElement>("[data-editor-title]").value = "";
  required<HTMLInputElement>("[data-editor-date]").value = new Date().toISOString().slice(0, 10);
  required<HTMLInputElement>("[data-editor-tags]").value = "";
  required<HTMLInputElement>("[data-editor-excerpt]").value = "";
  required<HTMLInputElement>("[data-editor-standfirst]").value = "";
  required<HTMLInputElement>("[data-editor-author]").value = "";
  required<HTMLTextAreaElement>("[data-editor-body]").value = "## The first line\n\nWrite here.\n";
  required<HTMLElement>("[data-editor-form]").hidden = false;
  required<HTMLElement>("[data-editor-note]").textContent = "A new entry for the " + collection + " section.";
  void refreshPreview();
}

// The card exactly as the build renders it: the title, the excerpt with the
// three dots only when the text was cut, and the link of the card.
async function refreshPreview(): Promise<void> {
  const body = required<HTMLTextAreaElement>("[data-editor-body]").value;
  const title = required<HTMLInputElement>("[data-editor-title]").value.trim();
  const excerpt = required<HTMLInputElement>("[data-editor-excerpt]").value.trim();
  const card = required<HTMLElement>("[data-editor-card]");
  if (body.trim().length === 0 && title.length === 0) {
    clear(card);
    card.appendChild(element("p", "editor-card-text", "The card shows the first forty five words of the entry."));
    return;
  }
  window.clearTimeout(excerptTimer);
  excerptTimer = window.setTimeout(function () {
    void fetchExcerpt(body, excerpt, collection).then(function (report) {
      clear(card);
      card.appendChild(element("h4", "editor-card-title", title));
      const text = report.excerpt + (report.truncated ? "..." : "");
      card.appendChild(element("p", "editor-card-text", text));
      card.appendChild(element("p", "editor-card-link", report.cardLink));
    }).catch(function (err) {
      clear(card);
      card.appendChild(element("p", "editor-card-text", err instanceof Error ? err.message : String(err)));
    });
  }, 200);
}

// The markdown file the panel would write, so the operator can save it by
// hand when the helper is not running.
function exportMarkdown(): void {
  const target = required<HTMLElement>("[data-editor-export-text]");
  const draft = formValues();
  const slug = draft.slug ? slugForTitle(draft.slug) : slugForTitle(draft.title);
  const section = draft.collection || "blog";
  const lines = ["File: content/" + section + "/" + slug + ".md", "", entrySource(draft)];
  target.textContent = lines.join("\n");
}

async function publish(): Promise<void> {
  const draft = formValues();
  if (!draft.title) {
    setStatus("The entry needs a title.", "error");
    return;
  }
  if (!draft.date) {
    setStatus("The entry needs a date.", "error");
    return;
  }
  try {
    const answer = await createEntry(draft);
    setStatus(answer.message, answer.ok ? "ok" : "error");
    if (answer.ok) {
      editing = null;
      required<HTMLElement>("[data-editor-form]").hidden = true;
      await loadEntries();
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), "error");
  }
}

async function saveForLater(): Promise<void> {
  const draft = formValues();
  if (!draft.title) {
    setStatus("The entry needs a title before it can be saved.", "error");
    return;
  }
  try {
    const answer = await saveDraft(draft);
    setStatus(answer.message, answer.ok ? "ok" : "error");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), "error");
  }
}

async function moveToTrash(): Promise<void> {
  if (!editing) {
    setStatus("Open an entry first, then it can be moved to the trash.", "error");
    return;
  }
  try {
    const answer = await trashEntry(editing.collection, editing.slug);
    setStatus(answer.message, answer.ok ? "ok" : "error");
    if (answer.ok) {
      editing = null;
      required<HTMLElement>("[data-editor-form]").hidden = true;
      await loadEntries();
      await loadTrash();
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), "error");
  }
}

// The trash, with a restore button on every entry in it.
async function loadTrash(): Promise<void> {
  const list = required<HTMLElement>("[data-editor-trash]");
  clear(list);
  let entries: TrashEntry[] = [];
  try {
    entries = await fetchTrash();
  } catch (err) {
    void err;
    list.appendChild(element("li", "editor-entry", "The helper is not running, so the trash cannot be read."));
    return;
  }
  if (entries.length === 0) {
    list.appendChild(element("li", "editor-entry", "The trash is empty."));
    return;
  }
  for (const entry of entries) {
    list.appendChild(trashRow(entry));
  }
}

function trashRow(entry: TrashEntry): HTMLElement {
  const item = element("li", "editor-entry", "");
  item.appendChild(element("span", "editor-entry-title", entry.title || entry.slug));
  item.appendChild(element("span", "editor-entry-meta", entry.date + " · " + entry.collection + "/" + entry.slug));
  const actions = element("div", "editor-entry-actions", "");
  const restore = element("button", "panel-button", "Restore");
  restore.type = "button";
  restore.addEventListener("click", function () {
    void restoreEntry(entry.collection, entry.slug).then(function (answer) {
      setStatus(answer.message, answer.ok ? "ok" : "error");
      return loadTrash().then(function () { return loadEntries(); });
    }).catch(function (err) {
      setStatus(err instanceof Error ? err.message : String(err), "error");
    });
  });
  actions.appendChild(restore);
  item.appendChild(actions);
  return item;
}

export async function startEditor(): Promise<void> {
  const select = required<HTMLSelectElement>("[data-editor-page]");
  select.addEventListener("change", function () {
    void loadEntries();
  });
  required<HTMLButtonElement>("[data-editor-create]").addEventListener("click", function () {
    newEntry();
  });
  required<HTMLButtonElement>("[data-editor-publish]").addEventListener("click", function () {
    void publish();
  });
  required<HTMLButtonElement>("[data-editor-draft]").addEventListener("click", function () {
    void saveForLater();
  });
  required<HTMLButtonElement>("[data-editor-delete]").addEventListener("click", function () {
    void moveToTrash();
  });
  required<HTMLButtonElement>("[data-editor-cancel]").addEventListener("click", function () {
    editing = null;
    required<HTMLElement>("[data-editor-form]").hidden = true;
  });
  required<HTMLButtonElement>("[data-editor-export]").addEventListener("click", function () {
    exportMarkdown();
    setStatus("The markdown is ready to copy into the file by hand.", "ok");
  });
  required<HTMLTextAreaElement>("[data-editor-body]").addEventListener("input", function () {
    void refreshPreview();
  });
  required<HTMLInputElement>("[data-editor-title]").addEventListener("input", function () {
    void refreshPreview();
  });
  required<HTMLInputElement>("[data-editor-excerpt]").addEventListener("input", function () {
    void refreshPreview();
  });
  try {
    pages = await fetchTree();
    fillPages();
    await loadEntries();
    await loadTrash();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), "error");
    const hint = query<HTMLElement>("[data-editor-hint]");
    if (hint) {
      hint.textContent = "The helper is not running, so the list of pages cannot be read.";
    }
  }
}
