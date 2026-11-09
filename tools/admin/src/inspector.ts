// View one: the visual inspector.
// It previews the built site in an iframe, and every element that carries a
// data-admin attribute can be inspected and changed.

import { fetchTree, fetchRegistry, readStyle, saveStyle } from "./api.js";
import { clear, element, query, queryAll, required, setStatus } from "./dom.js";
import { validateValue } from "./values.js";
import type { StyleSaveRequest, StyleValues } from "./types.js";

const FIELDS: { key: keyof StyleValues; label: string; property: string }[] = [
  { key: "height", label: "Height", property: "height" },
  { key: "width", label: "Width", property: "width" },
  { key: "position", label: "Position", property: "position" },
  { key: "zIndex", label: "Z index", property: "z-index" },
  { key: "color", label: "Text colour", property: "color" },
  { key: "backgroundColor", label: "Background colour", property: "background-color" },
  { key: "backgroundImage", label: "Background image", property: "background-image" }
];

const LIVE_NOTE = "The change is live in the preview. Save it to write it into the file.";

interface Selected {
  element: HTMLElement;
  file: string;
  category: string;
  selectors: string[];
  elementId: string;
}

interface Change {
  property: string;
  key: keyof StyleValues;
  value: string;
}

let selected: Selected | null = null;
let previewDocument: Document | null = null;
let initialValues: StyleValues | null = null;
let initialText = "";

function registryOf(node: HTMLElement): { file: string; category: string } | null {
  const host = hostOf(node);
  if (!host) {
    return null;
  }
  const value = host.getAttribute("data-admin") || "";
  const separator = value.indexOf(":");
  if (separator === -1) {
    return null;
  }
  return { category: value.slice(0, separator), file: value.slice(separator + 1) };
}

// The element that carries the mark. It owns the file and the rule, so the
// panel changes the marked element and not whatever was clicked inside it.
function hostOf(node: HTMLElement): HTMLElement | null {
  const found = node.closest("[data-admin]");
  return found ? (found as HTMLElement) : null;
}

function addCandidates(from: HTMLElement, into: string[]): void {
  if (from.id) {
    into.push("#" + from.id);
  }
  const classes = Array.from(from.classList);
  if (classes.length === 0) {
    return;
  }
  const joined = classes.map(function (name) { return "." + name; }).join("");
  into.push(joined);
  into.push(from.tagName.toLowerCase() + joined);
  if (classes.length > 1) {
    into.push("." + String(classes[classes.length - 1]));
  }
}

// The candidate selectors, most precise first. The helper tries them in the
// same order and writes into the first rule that matches. A bare tag is
// never a candidate, because a tag rule belongs to the whole site.
function selectorsFor(node: HTMLElement): string[] {
  const host = hostOf(node);
  const candidates: string[] = [];
  addCandidates(host || node, candidates);
  if (host && candidates.length === 0) {
    addCandidates(node, candidates);
  }
  return candidates;
}

function currentValues(node: HTMLElement): StyleValues {
  const view = previewDocument ? previewDocument.defaultView : null;
  const style = view ? view.getComputedStyle(node) : null;
  return {
    height: style ? style.height : "",
    width: style ? style.width : "",
    position: style ? style.position : "",
    zIndex: style ? style.zIndex : "",
    color: style ? style.color : "",
    backgroundColor: style ? style.backgroundColor : "",
    backgroundImage: style ? style.backgroundImage : ""
  };
}

function fieldRow(label: string, value: string, property: string): HTMLElement {
  const wrapper = element("label", "panel-field", "");
  const caption = element("span", "", label);
  const input = element("input", "", "");
  input.type = "text";
  input.value = value;
  input.dataset.property = property;
  wrapper.appendChild(caption);
  wrapper.appendChild(input);
  return wrapper;
}

function showPopup(node: HTMLElement): void {
  const popup = required<HTMLElement>("[data-inspector-popup]");
  const registry = registryOf(node);
  const target = required<HTMLElement>("[data-inspector-target]");
  const category = required<HTMLElement>("[data-inspector-category]");
  const file = required<HTMLElement>("[data-inspector-file]");
  const fields = required<HTMLElement>("[data-inspector-fields]");
  const note = required<HTMLElement>("[data-inspector-note]");

  if (!registry) {
    setStatus("That element carries no data-admin attribute, so the panel does not know which file owns it.", "error");
    target.textContent = describe(node);
    category.textContent = "none";
    file.textContent = "none";
    note.textContent = "Only an element inside a marked box can be changed, because the mark names the file that owns it.";
    clear(fields);
    popup.hidden = false;
    selected = null;
    return;
  }

  selected = {
    element: node,
    file: registry.file,
    category: registry.category,
    selectors: selectorsFor(node),
    elementId: node.id || ""
  };

  target.textContent = describe(node);
  category.textContent = registry.category;
  file.textContent = registry.file;
  note.textContent = "The panel writes the value into the rule that owns the selector, so the file stays readable.";

  clear(fields);
  const values = currentValues(node);
  initialValues = values;
  initialText = (node.textContent || "").replace(/[\r\n]+/g, "").trim().slice(0, 200);
  for (const field of FIELDS) {
    fields.appendChild(fieldRow(field.label, values[field.key], field.property));
  }
  fields.appendChild(fieldRow("Text", initialText, "text"));
  popup.hidden = false;
  applyLive();
}

function describe(node: HTMLElement): string {
  const tag = node.tagName.toLowerCase();
  const id = node.id ? "#" + node.id : "";
  const classes = node.classList.length > 0 ? "." + Array.from(node.classList).join(".") : "";
  return tag + id + classes;
}

// Every change is applied to the preview straight away, as an inline style,
// so the operator sees the result before anything is written. A value the
// rules refuse is not applied at all.
function applyLive(): string {
  if (!selected) {
    return "";
  }
  const fields = queryAll<HTMLInputElement>("[data-inspector-fields] input");
  const refusals: string[] = [];
  for (const input of fields) {
    const property = input.dataset.property || "";
    const value = input.value.trim();
    if (property === "text") {
      if (value !== initialText) {
        selected.element.textContent = value;
      }
      continue;
    }
    if (!property) {
      continue;
    }
    const answer = validateValue(property, value);
    if (!answer.ok) {
      refusals.push(answer.message);
      continue;
    }
    if (value === "") {
      selected.element.style.removeProperty(property);
      continue;
    }
    selected.element.style.setProperty(property, value);
  }
  return refusals.join(" ");
}

function onFieldInput(): void {
  const refusals = applyLive();
  const note = required<HTMLElement>("[data-inspector-note]");
  note.textContent = refusals === "" ? LIVE_NOTE : refusals;
}

async function resetPreview(): Promise<void> {
  if (!selected) {
    return;
  }
  selected.element.removeAttribute("style");
  const fields = queryAll<HTMLInputElement>("[data-inspector-fields] input");
  const values = currentValues(selected.element);
  for (const input of fields) {
    const property = input.dataset.property || "";
    if (property === "text") {
      input.value = (selected.element.textContent || "").replace(/[\r\n]+/g, "").trim().slice(0, 200);
      continue;
    }
    const field = FIELDS.find(function (known) { return known.property === property; });
    if (field) {
      input.value = values[field.key];
    }
  }
  // The file on disk is the truth, so the reset reads the rule again.
  try {
    const answer = await readStyle({ file: selected.file, category: selected.category, selectors: selected.selectors });
    if (!answer.file) {
      return;
    }
    for (const input of fields) {
      const property = input.dataset.property || "";
      const declared = answer.declarations[property];
      if (declared !== undefined) {
        input.value = declared;
      }
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), "error");
  }
}

function onPreviewClick(event: MouseEvent): void {
  const doc = previewDocument;
  if (!doc) {
    return;
  }
  const node = event.target as HTMLElement | null;
  if (!node || node === doc.body) {
    return;
  }
  if (registryOf(node)) {
    event.preventDefault();
    event.stopPropagation();
  }
  showPopup(node);
}

function onFrameLoad(): void {
  const frame = required<HTMLIFrameElement>("[data-inspector-preview]");
  const doc = frame.contentDocument;
  previewDocument = doc;
  if (!doc) {
    return;
  }
  doc.addEventListener("click", onPreviewClick, true);
}
// The values the operator changed, with the text of the element apart.
function changedValues(): { values: StyleValues; changes: Change[]; text: string; changedText: boolean } {
  const fields = queryAll<HTMLInputElement>("[data-inspector-fields] input");
  const values: StyleValues = {
    height: "",
    width: "",
    position: "",
    zIndex: "",
    color: "",
    backgroundColor: "",
    backgroundImage: ""
  };
  const changes: Change[] = [];
  let text = "";
  let changedText = false;
  for (const input of fields) {
    const property = input.dataset.property || "";
    const value = input.value.trim();
    if (property === "text") {
      if (value !== initialText) {
        text = value;
        changedText = true;
      }
      continue;
    }
    const field = FIELDS.find(function (known) { return known.property === property; });
    if (!field) {
      continue;
    }
    const before = initialValues ? initialValues[field.key] : "";
    if (value === before) {
      continue;
    }
    values[field.key] = value;
    changes.push({ property: property, key: field.key, value: value });
  }
  return { values: values, changes: changes, text: text, changedText: changedText };
}

// The refusal of the first changed value the rules do not allow.
function refusalOf(changes: Change[]): string {
  for (const change of changes) {
    const answer = validateValue(change.property, change.value);
    if (!answer.ok) {
      return answer.message;
    }
  }
  return "";
}

async function save(): Promise<void> {
  if (!selected) {
    setStatus("Pick an element in the preview first.", "error");
    return;
  }
  const changed = changedValues();
  const refusal = refusalOf(changed.changes);
  if (refusal !== "") {
    required<HTMLElement>("[data-inspector-note]").textContent = refusal;
    setStatus(refusal, "error");
    return;
  }
  const request: StyleSaveRequest = {
    target: { file: selected.file, category: selected.category, selectors: selected.selectors },
    values: changed.values,
    changedProperties: changed.changes.map(function (change) { return change.property; }),
    text: changed.text,
    changedText: changed.changedText,
    elementId: selected.elementId,
    page: currentPage()
  };
  try {
    const answer = await saveStyle(request);
    setStatus(answer.message, answer.ok ? "ok" : "error");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), "error");
  }
}

// The change as a snippet the operator can paste into the file by hand, so
// the panel is useful even when the helper is not running.
function exportChange(): void {
  const target = required<HTMLElement>("[data-inspector-export-text]");
  if (!selected) {
    target.textContent = "Pick an element in the preview first.";
    return;
  }
  const changed = changedValues();
  if (changed.changes.length === 0 && !changed.changedText) {
    target.textContent = "Nothing was changed yet.";
    return;
  }
  const selector = selected.selectors[0] || selected.category;
  const lines = [
    "File: styles/" + selected.file,
    "Selector: " + selector,
    "",
    selector + " {"
  ];
  for (const change of changed.changes) {
    lines.push("  " + change.property + ": " + change.value + ";");
  }
  lines.push("}");
  if (changed.changedText) {
    lines.push("");
    lines.push("The text goes into the content fragment of the page, in the element with the id " + selected.elementId + ".");
  }
  target.textContent = lines.join("\n");
}

function currentPage(): string {
  const select = query<HTMLSelectElement>("[data-inspector-page]");
  return select ? select.value : "/";
}

// The page selector of the inspector lists every page of the site, not just
// the home page, so an element on any page can be inspected.
async function fillPageSelect(): Promise<void> {
  const select = required<HTMLSelectElement>("[data-inspector-page]");
  clear(select);
  let pages: { path: string; title: string }[] = [];
  try {
    pages = await fetchTree();
  } catch (err) {
    void err;
  }
  const seen = new Set<string>();
  const ordered: Array<{ path: string; title: string }> = [];
  const home = pages.find(function (page) { return page.path === "/"; });
  if (home) {
    ordered.push(home);
    seen.add("/");
  }
  for (const page of pages) {
    if (seen.has(page.path)) {
      continue;
    }
    seen.add(page.path);
    ordered.push(page);
  }
  for (const page of ordered) {
    const option = element("option", "", page.title + " (" + page.path + ")");
    option.value = page.path;
    select.appendChild(option);
  }
  if (select.options.length === 0) {
    const option = element("option", "", "Home");
    option.value = "/";
    select.appendChild(option);
  }
}

// The skip-intro button is only useful on the home page, where the hero
// weave plays on first load.
function showSkipIntro(pagePath: string): void {
  const btn = required<HTMLElement>("[data-inspector-skip-intro]");
  btn.hidden = pagePath !== "/";
}

// Mark the intro as done inside the preview and reload it, so the home page
// shows its post-animation state instead of the weave.
function skipIntro(): void {
  const frame = required<HTMLIFrameElement>("[data-inspector-preview]");
  const win = frame.contentWindow;
  if (!win) {
    return;
  }
  try {
    win.localStorage.setItem("ag-hero-intro", JSON.stringify({ version: 1, done: true }));
  } catch (err) {
    void err;
  }
  frame.src = currentPage();
}

// The element registry of the built site, so a category the panel does not
// know is named instead of guessed.
async function loadRegistry(): Promise<void> {
  const list = required<HTMLElement>("[data-inspector-registry]");
  clear(list);
  let report;
  try {
    report = await fetchRegistry();
  } catch (err) {
    void err;
    list.appendChild(element("li", "registry-item", "The helper is not running, so the element registry cannot be read."));
    return;
  }
  for (const category of report.categories) {
    const item = element("li", "registry-item", "");
    item.appendChild(element("span", "registry-name", category));
    if (report.unknown.indexOf(category) !== -1) {
      item.appendChild(element("span", "registry-note", "The page uses the category " + category + ", which the panel does not know."));
    }
    list.appendChild(item);
  }
  if (report.categories.length === 0) {
    list.appendChild(element("li", "registry-item", "No marked element was found in the built pages."));
  }
}

export function startInspector(): void {
  const frame = required<HTMLIFrameElement>("[data-inspector-preview]");
  const select = required<HTMLSelectElement>("[data-inspector-page]");
  const skipBtn = required<HTMLElement>("[data-inspector-skip-intro]");
  const reloadBtn = required<HTMLButtonElement>("[data-inspector-reload]");

  function preview(pagePath: string): void {
    selected = null;
    const popup = required<HTMLElement>("[data-inspector-popup]");
    popup.hidden = true;
    showSkipIntro(pagePath);
    frame.src = pagePath;
  }

  select.addEventListener("change", function () {
    preview(select.value);
  });
  reloadBtn.addEventListener("click", function () {
    preview(currentPage());
  });
  skipBtn.addEventListener("click", skipIntro);
  frame.addEventListener("load", onFrameLoad);
  onFrameLoad();
  void fillPageSelect();
  const fields = required<HTMLElement>("[data-inspector-fields]");
  fields.addEventListener("input", onFieldInput);
  fields.addEventListener("change", onFieldInput);
  required<HTMLButtonElement>("[data-inspector-save]").addEventListener("click", function () {
    void save();
  });
  required<HTMLButtonElement>("[data-inspector-reset]").addEventListener("click", function () {
    void resetPreview().then(function () {
      setStatus("The preview is back to the state on disk.", "ok");
    });
  });
  required<HTMLButtonElement>("[data-inspector-export]").addEventListener("click", function () {
    exportChange();
    setStatus("The change is ready to copy into the file by hand.", "ok");
  });
  void loadRegistry();
}
