// View two: the content editor.
// It lists the sections that carry entries, shows the entries of the chosen
// section, and writes markdown that the build turns into a card and a detail
// page. The section list is the known list, so the editor can still write
// and export its markdown when the helper is not running.

import {
  createEntry,
  fetchEntries,
  fetchEntry,
  fetchExcerpt,
  fetchTrash,
  restoreEntry,
  saveDraft,
  trashEntry
} from "./api.js";
import { waitForBuild } from "./build-state.js";
import { clear, element, query, required, setStatus } from "./dom.js";
import { entrySource, slugForTitle } from "./entry-source.js";
import type { ChangeReport, EntryDraft, EntrySummary, TrashEntry } from "./types.js";

// The sections that carry entries. It matches the list the build uses, so the
// entry always lands in a section the build renders.
const COLLECTIONS: { id: string; label: string }[] = [
  { id: "blog", label: "Blog" },
  { id: "words", label: "Words" }
];

let editing: EntryDraft | null = null;
let excerptTimer = 0;

function pathOf(collectionId: string): string {
  return "/" + collectionId + "/";
}

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

function labelOf(collectionId: string): string {
  for (const known of COLLECTIONS) {
    if (known.id === collectionId) {
      return known.label;
    }
  }
  return collectionId;
}

// The section the chosen page belongs to.
function currentCollection(): string {
  const select = required<HTMLSelectElement>("[data-editor-page]");
  return collectionOf(select.value);
}

// The section an entry belongs to. An entry that is open keeps its own
// section, because an entry never moves between sections.
function targetCollection(): string {
  if (editing) {
    return editing.collection;
  }
  return currentCollection();
}

function fillSections(): void {
  const select = required<HTMLSelectElement>("[data-editor-page]");
  const current = select.value;
  clear(select);
  for (const known of COLLECTIONS) {
    const option = element("option", "", known.label);
    option.value = pathOf(known.id);
    select.appendChild(option);
  }
  if (current && currentCollection() !== "") {
    select.value = current;
  }
}

// Puts the list on a section, so the entries of that section are the ones on
// show.
function selectSection(collectionId: string): void {
  required<HTMLSelectElement>("[data-editor-page]").value = pathOf(collectionId);
}

async function loadEntries(): Promise<void> {
  const list = required<HTMLElement>("[data-editor-entries]");
  const hint = required<HTMLElement>("[data-editor-hint]");
  clear(list);
  const collection = currentCollection();
  if (!collection) {
    hint.textContent = "Choose a section. Only the sections that carry entries are in the list.";
    return;
  }
  hint.textContent = "The entries of the " + labelOf(collection) + " section. A new entry lands in the same section.";
  let entries: EntrySummary[] = [];
  try {
    entries = await fetchEntries(collection);
  } catch (err) {
    void err;
    hint.textContent = "The helper is not running, so the entries of the " + labelOf(collection) + " section cannot be read. The export still works.";
    return;
  }
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
  edit.setAttribute("aria-label", "Edit " + entry.title);
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
    collection: targetCollection(),
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
  editing = draft;
  selectSection(entryCollection);
  fillForm(draft);
  required<HTMLElement>("[data-editor-form]").hidden = false;
  required<HTMLElement>("[data-editor-note]").textContent = "Editing " + draft.collection + "/" + draft.slug + ". The entry keeps its section.";
  await refreshPreview();
}

function newEntry(): void {
  const collection = currentCollection();
  if (!collection) {
    setStatus("Choose a section first. Only the blog and the words sections carry entries.", "error");
    return;
  }
  editing = null;
  required<HTMLInputElement>("[data-editor-title]").value = "";
  required<HTMLInputElement>("[data-editor-date]").value = new Date().toISOString().slice(0, 10);
  required<HTMLInputElement>("[data-editor-tags]").value = "";
  required<HTMLInputElement>("[data-editor-excerpt]").value = "";
  required<HTMLInputElement>("[data-editor-standfirst]").value = "";
  required<HTMLInputElement>("[data-editor-author]").value = "";
  required<HTMLTextAreaElement>("[data-editor-body]").value = "## The first line\n\nWrite here.\n";
  required<HTMLElement>("[data-editor-form]").hidden = false;
  required<HTMLElement>("[data-editor-note]").textContent = "A new entry for the " + labelOf(collection) + " section.";
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
    void fetchExcerpt(body, excerpt, targetCollection()).then(function (report) {
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

// The helper rebuilds the site after every change. The panel waits for that
// rebuild and then says what it did, so a failed build never looks like a
// finished one.
async function reportChange(answer: ChangeReport, done: string): Promise<void> {
  if (!answer.ok) {
    setStatus(answer.message, "error");
    return;
  }
  if (answer.buildStartedAt === 0) {
    setStatus(answer.message, "ok");
    return;
  }
  setStatus(answer.message + " The site is rebuilding.", "plain");
  const build = await waitForBuild(answer.buildStartedAt);
  if (!build) {
    setStatus(answer.message + " The rebuild did not report back in time.", "error");
    return;
  }
  if (build.ok) {
    setStatus(done, "ok");
    return;
  }
  setStatus("The change was written, but the build failed: " + build.message, "error");
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
  if (!draft.collection) {
    setStatus("Choose a section first. Only the blog and the words sections carry entries.", "error");
    return;
  }
  try {
    const answer = await createEntry(draft);
    const name = draft.collection + "/" + slugForTitle(draft.slug || draft.title);
    if (answer.ok) {
      editing = null;
      required<HTMLElement>("[data-editor-form]").hidden = true;
      await loadEntries();
    }
    await reportChange(answer, "The entry " + name + " is written and the site is rebuilt. The deploy panel sends it to the webspace.");
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
    if (!answer.ok) {
      setStatus(answer.message, "error");
      return;
    }
    setStatus(answer.message + " The build never reads the drafts folder.", "ok");
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
    const name = editing.collection + "/" + editing.slug;
    if (answer.ok) {
      editing = null;
      required<HTMLElement>("[data-editor-form]").hidden = true;
      await loadEntries();
      await loadTrash();
    }
    await reportChange(answer, "The entry " + name + " is in the trash and the site is rebuilt without it.");
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
  restore.setAttribute("aria-label", "Restore " + (entry.title || entry.slug));
  restore.addEventListener("click", function () {
    void restoreEntry(entry.collection, entry.slug).then(async function (answer: ChangeReport) {
      if (answer.ok) {
        await loadTrash();
        await loadEntries();
      }
      await reportChange(answer, "The entry " + entry.collection + "/" + entry.slug + " is back in its section and the site is rebuilt.");
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
    fillSections();
    await loadEntries();
    await loadTrash();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), "error");
    const hint = query<HTMLElement>("[data-editor-hint]");
    if (hint) {
      hint.textContent = "The helper is not running, so the list of entries cannot be read. The export still works.";
    }
  }
}
