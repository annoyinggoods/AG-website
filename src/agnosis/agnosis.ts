// The AGnosis playground: the ASCII duck parade, in a browser tab.
//
// The wasm bundle is loaded **on demand** (roadmap `ROADMAP_WASM.md` §4,
// milestone M1): the page shows a poster with a click-to-start control —
// the same gate the site intro uses — and only the click loads the
// module, because the bundle is megabytes and the page has a performance
// budget. While the module loads, the gate shows the AGnosis loading
// mark instead of a spinner.
//
// The wasm's own `start` hook boots the parade into the page's canvas
// once the module instantiates, so this script never drives the
// simulation: it wires the gate, mirrors the wasm's status line, hands
// imports over and wraps the three exports in downloads (milestone M2).
// Everything else — the clicks, the back ends, the rendering — is the
// wasm's own.
//
// Milestone M3 adds the draw-your-own editor (roadmap §6): a second
// canvas the wasm paints its own editor chrome into, the page's
// keyboard and pointer events forwarded through, and every save handed
// back as a download — persistence on the web is download-only for v1.

const GLUE_PATH = "/wasm/agnosis/agnosis_web.js";
const LOADING_SRC = "/assets/agnosis/agnosis-loading.webp";
const EXPORT_NAME = "AGnosis parade";
// The GIF's downscale factor: 2 halves the cell pitch, the same default
// the native CLI exports with.
const GIF_SCALE = 2;

// The names the downloads carry. The package keeps the `.agnosis`
// extension, which is what the native app's import and the web import
// both decide on (a ZIP signature decides here, the extension decides
// there).
const HTML_DOWNLOAD = "agnosis-parade.html";
const GIF_DOWNLOAD = "agnosis-parade.gif";
const PACKAGE_DOWNLOAD = "agnosis-art.agnosis";

// One download the editor produced: a saved document the page wraps in
// a blob. The bytes are the same JSON the native app keeps in its drawn
// folder, so the download drops straight into a desktop install.
interface AgnosisDownload {
  readonly name: string;
  readonly mime: string;
  readonly data: Uint8Array;
}

interface AgnosisModule {
  default(): Promise<void>;
  backend_name(): string;
  set_backend(name: string): void;
  set_paused(paused: boolean): void;
  status_line(): string;
  apply_manifest(json: string): string;
  load_package(bytes: Uint8Array): string;
  export_html(name: string): Uint8Array;
  export_gif(scale: number): Uint8Array;
  export_package(name: string): Uint8Array;
  // --- the editor (milestone M3) ---
  editor_open(): void;
  editor_close(): void;
  editor_is_open(): boolean;
  editor_pointer_down(x: number, y: number): void;
  editor_pointer_move(x: number, y: number): void;
  editor_pointer_up(): void;
  editor_wheel(dx: number, dy: number): void;
  editor_key(key: string, ctrl: boolean, shift: boolean, alt: boolean, meta: boolean): void;
  editor_resize(): void;
  editor_status(): string;
  // The empty answer is `undefined` (wasm-bindgen lowers `Option<T>` to
  // `undefined` when nothing waits), never `null`.
  editor_take_download(): AgnosisDownload | undefined;
}

// The one module load of the page: a second click never re-imports.
let modulePromise: Promise<AgnosisModule> | null = null;
// The status line's sticky note: an import or export summary that stays
// for a few seconds before the live status line returns.
let sticky = "";
let stickyTimer = 0;
// The forced back end, from the URL (`?backend=webgl2`). The wasm boots
// asynchronously, so the request waits for a back end to be reported.
let forcedBackend = "";
let paused = false;

export function initAgnosis(): void {
  const root = document.querySelector("[data-agnosis-app]");
  if (!(root instanceof HTMLElement)) {
    return;
  }
  wireStart(root);
  wirePause(root);
  wireImport(root);
  wireExports(root);
  wireEditor(root);
}

function loadModule(): Promise<AgnosisModule> {
  if (modulePromise !== null) {
    return modulePromise;
  }
  modulePromise = import(GLUE_PATH) as unknown as Promise<AgnosisModule>;
  return modulePromise;
}

// --- the gate ------------------------------------------------------------

function wireStart(root: HTMLElement): void {
  const gate = gateOf(root);
  const start = root.querySelector("[data-agnosis-start]");
  if (!(gate instanceof HTMLElement) || !(start instanceof HTMLButtonElement)) {
    return;
  }
  // The prompt is the gate's only control; focusing it puts Enter and
  // Space one keystroke away for keyboard visitors, the way the intro
  // gate does.
  start.focus();
  start.addEventListener("click", function (): void {
    void startParade(root, gate);
  });
}

async function startParade(root: HTMLElement, gate: HTMLElement): Promise<void> {
  setLoading(gate, true);
  const mod = await tryLoad(gate);
  if (mod === null) {
    return;
  }
  dismissGate(gate);
  root.classList.add("is-running");
  forcedBackend = new URLSearchParams(window.location.search).get("backend") || "";
  startPolling(root, mod);
}

// Whether the parade has been started: every control that would load
// the wasm checks it, because a click on an export button must not
// sneak the module load in through the side door — lazy loading is the
// gate's whole job.
function started(root: HTMLElement): boolean {
  const gate = gateOf(root);
  return gate instanceof HTMLElement && gate.classList.contains("is-dismissed");
}

// The gate's loading state: the AGnosis mark spins where a loading
// circle would sit, and the prompt button is gone — there is nothing
// left to click until the module answers.
function setLoading(gate: HTMLElement, loading: boolean): void {
  gate.classList.toggle("is-loading", loading);
  const status = gate.querySelector("[data-agnosis-gate-status]");
  if (status instanceof HTMLElement) {
    status.textContent = loading ? "Loading the parade…" : "";
  }
}

function dismissGate(gate: HTMLElement): void {
  gate.classList.add("is-dismissed");
}

// The gate's failure state: the reason shows where the loading mark
// was, and the prompt returns, because the visitor can try again.
function failGate(gate: HTMLElement, why: string): void {
  setLoading(gate, false);
  const status = gate.querySelector("[data-agnosis-gate-status]");
  if (status instanceof HTMLElement) {
    status.textContent = "the parade could not start: " + why;
    status.setAttribute("role", "alert");
  }
}

async function tryLoad(gate: HTMLElement): Promise<AgnosisModule | null> {
  try {
    const mod = await loadModule();
    // The module's own start hook boots the parade; the boot itself
    // keeps running after this resolves, and the status line says
    // "starting" until the first back end is up.
    await mod.default();
    return mod;
  } catch (err: unknown) {
    const why = messageOf(err);
    failGate(gate, why);
    note(why);
    return null;
  }
}

// --- the live status line ------------------------------------------------

function startPolling(root: HTMLElement, mod: AgnosisModule): void {
  const status = root.querySelector("[data-agnosis-status]");
  if (!(status instanceof HTMLElement)) {
    return;
  }
  window.setInterval(function (): void {
    refresh(root, status, mod);
  }, 500);
  refresh(root, status, mod);
}

function refresh(root: HTMLElement, status: HTMLElement, mod: AgnosisModule): void {
  // A forced back end from the URL lands once the wasm reports one:
  // the request must not fire while the app is still booting, or it
  // would arrive before anything can remember it.
  if (forcedBackend !== "" && mod.backend_name() !== "none") {
    const asked = forcedBackend;
    forcedBackend = "";
    try {
      mod.set_backend(asked);
    } catch (err: unknown) {
      note("backend: " + messageOf(err));
    }
  }
  if (sticky !== "") {
    status.textContent = sticky;
    status.title = "running on the " + mod.backend_name() + " back end";
    return;
  }
  try {
    status.textContent = mod.status_line();
    status.title = "running on the " + mod.backend_name() + " back end";
  } catch (err: unknown) {
    note("status: " + messageOf(err));
  }
  // The editor's mirror runs on the same pulse: its own status line is
  // the wasm's too, and the save it completed on a tick leaves its
  // download here even if no event was forwarded since.
  mirrorEditor(root, mod);
}

function say(text: string): void {
  sticky = text;
  window.clearTimeout(stickyTimer);
  stickyTimer = window.setTimeout(function (): void {
    sticky = "";
  }, 5000);
}

// --- pause ----------------------------------------------------------------

function wirePause(root: HTMLElement): void {
  const button = root.querySelector("[data-agnosis-pause]");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  button.addEventListener("click", function (): void {
    if (!started(root) || editing(root)) {
      return;
    }
    void togglePause(button);
  });
}

async function togglePause(button: HTMLButtonElement): Promise<void> {
  const mod = await loadModule();
  paused = !paused;
  mod.set_paused(paused);
  button.textContent = paused ? "resume" : "pause";
}

// --- the drawn art, in ----------------------------------------------------

function wireImport(root: HTMLElement): void {
  const file = root.querySelector("[data-agnosis-file]");
  if (!(file instanceof HTMLInputElement)) {
    return;
  }
  file.addEventListener("change", function (): void {
    if (!started(root) || editing(root)) {
      return;
    }
    const chosen = file.files && file.files[0];
    if (chosen !== null && chosen !== undefined) {
      void importArt(root, chosen);
    }
  });
}

async function importArt(root: HTMLElement, chosen: File): Promise<void> {
  const mod = await loadModule();
  try {
    const bytes = new Uint8Array(await chosen.arrayBuffer());
    const isZip = bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b;
    const summary = isZip
      ? mod.load_package(bytes)
      : mod.apply_manifest(new TextDecoder().decode(bytes));
    say("imported: " + summary);
  } catch (err: unknown) {
    note("import failed: " + messageOf(err));
    say("the import failed.");
  }
  refreshStatusNow(root, mod);
}

// --- the exports, out -----------------------------------------------------

function wireExports(root: HTMLElement): void {
  wireExport(root, "[data-agnosis-export-html]", "the page", function (mod: AgnosisModule): Uint8Array {
    return mod.export_html(EXPORT_NAME);
  }, HTML_DOWNLOAD, "text/html");
  wireExport(root, "[data-agnosis-export-gif]", "the GIF", function (mod: AgnosisModule): Uint8Array {
    return mod.export_gif(GIF_SCALE);
  }, GIF_DOWNLOAD, "image/gif");
  wireExport(root, "[data-agnosis-export-package]", "the art package", function (mod: AgnosisModule): Uint8Array {
    return mod.export_package(EXPORT_NAME);
  }, PACKAGE_DOWNLOAD, "application/octet-stream");
}

function wireExport(
  root: HTMLElement,
  selector: string,
  label: string,
  run: (mod: AgnosisModule) => Uint8Array,
  fileName: string,
  mime: string
): void {
  const button = root.querySelector(selector);
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  button.addEventListener("click", function (): void {
    if (!started(root) || editing(root)) {
      return;
    }
    void runExport(root, button, label, run, fileName, mime);
  });
}

async function runExport(
  root: HTMLElement,
  button: HTMLButtonElement,
  label: string,
  run: (mod: AgnosisModule) => Uint8Array,
  fileName: string,
  mime: string
): Promise<void> {
  setBusy(root, true, "recording " + label + "…");
  // The recording runs synchronously inside the wasm and holds the page
  // while it works; the yield lets the busy state paint first, so the
  // wait is announced and not a freeze.
  await nextTick();
  const mod = await loadModule();
  try {
    const bytes = run(mod);
    download(bytes, fileName, mime);
    say(label + " downloaded (" + String(bytes.length) + " bytes).");
  } catch (err: unknown) {
    note("export failed: " + messageOf(err));
    say(label + " failed.");
  }
  setBusy(root, false, "");
  refreshStatusNow(root, mod);
}

// One recording at a time: the controls that drive the same wasm go
// quiet while it records.
function setBusy(root: HTMLElement, busy: boolean, text: string): void {
  const buttons = root.querySelectorAll("button");
  for (let i = 0; i < buttons.length; i = i + 1) {
    const button = buttons[i];
    if (button instanceof HTMLButtonElement) {
      button.disabled = busy;
    }
  }
  const input = root.querySelector("[data-agnosis-file]");
  if (input instanceof HTMLInputElement) {
    input.disabled = busy;
  }
  const status = root.querySelector("[data-agnosis-status]");
  if (busy && status instanceof HTMLElement) {
    status.textContent = text;
  }
}

function nextTick(): Promise<void> {
  return new Promise(function (resolve): void {
    window.setTimeout(resolve, 30);
  });
}

function download(bytes: Uint8Array, fileName: string, mime: string): void {
  // The bytes arrive as a view over the wasm heap; the Blob constructor
  // copies them, and the cast only settles the view's buffer type.
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// --- the draw-your-own editor (milestone M3) -------------------------------
//
// The editor is the wasm's own: the state machine, the layout, the hit
// test and the paint are the same pure core the native window runs, and
// the wasm renders its chrome into `#editor-canvas`. This script is the
// platform: it toggles the panel, converts the browser's pointer, wheel
// and key events into the canvas pixels and key names the wasm wants,
// and hands every saved document back as a download (persistence on the
// web is download-only for v1 — the roadmap decision).

// The keys the editor consumes: the page suppresses the browser's own
// answer for them while the editor is open (the arrows would scroll the
// page, Backspace would go back in history, F1 would open browser help,
// Space would press whatever button holds the focus). Everything else
// is forwarded untouched.
const EDITOR_KEYS = new Set([
  "Escape",
  "Enter",
  "Backspace",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  " ",
  "F1",
  "F2",
  "F3",
  "F4",
]);

// The undo shortcuts, on top of the plain keys: Ctrl+Z / Ctrl+Y (and
// the Cmd spellings) must never type into the name field and must never
// undo the page.
const EDITOR_UNDO_KEYS = new Set(["z", "Z", "y", "Y"]);

function wireEditor(root: HTMLElement): void {
  const button = root.querySelector("[data-agnosis-editor]");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  button.addEventListener("click", function (): void {
    if (!started(root)) {
      return;
    }
    void toggleEditor(root, button);
  });
  wireEditorCanvas(root);
  wireEditorKeys(root);
}

// Whether the editor is on the page: the parade's own controls go quiet
// while it is (the pause button would un-pause a parade nobody watches,
// an import would race the panel's store).
function editing(root: HTMLElement): boolean {
  return root.classList.contains("is-editing");
}

async function toggleEditor(root: HTMLElement, button: HTMLButtonElement): Promise<void> {
  const mod = await loadModule();
  if (mod.editor_is_open()) {
    mod.editor_close();
    syncEditorDom(root, button, mod);
    return;
  }
  // The panel is made visible **first**: the wasm reads the canvas' box
  // to size its buffer, and a hidden element has no box.
  root.classList.add("is-editing");
  editorPanel(root).hidden = false;
  try {
    mod.editor_open();
  } catch (err: unknown) {
    root.classList.remove("is-editing");
    editorPanel(root).hidden = true;
    note("editor: " + messageOf(err));
    say("the editor could not open.");
    return;
  }
  syncEditorDom(root, button, mod);
}

// The page's DOM follows the wasm's answer: an ESC that ran out of
// ladder rungs closes the editor from inside the wasm, so every
// forwarded event re-syncs instead of assuming.
function syncEditorDom(root: HTMLElement, button: HTMLButtonElement, mod: AgnosisModule): void {
  const open = mod.editor_is_open();
  root.classList.toggle("is-editing", open);
  editorPanel(root).hidden = !open;
  button.textContent = open ? "back to the parade" : "open the editor";
  button.setAttribute("aria-expanded", String(open));
  // The parade's own controls go quiet while the editor holds the page:
  // the pause button would un-pause a parade nobody watches, an import
  // would race the editor's store, an export would record a hidden
  // parade. `disabled` carries the fact to assistive tech too; the
  // stylesheet only dims it.
  const paradeControls = root.querySelectorAll(".agnosis-bar button, .agnosis-bar input");
  for (let i = 0; i < paradeControls.length; i = i + 1) {
    const control = paradeControls[i];
    if (control instanceof HTMLButtonElement && !control.hasAttribute("data-agnosis-editor")) {
      control.disabled = open;
    }
    if (control instanceof HTMLInputElement) {
      control.disabled = open;
    }
  }
  const canvas = root.querySelector("#editor-canvas");
  if (open && canvas instanceof HTMLElement) {
    // The focus moves into the editor: the canvas takes the focus (it
    // is a tabindex -1 landmark), so the keyboard lands in the wasm and
    // the screen-reader visitor hears where they are.
    canvas.focus();
  } else if (!open) {
    button.focus();
  }
}

function editorPanel(root: HTMLElement): HTMLElement {
  const panel = root.querySelector("[data-agnosis-editor-panel]");
  return panel instanceof HTMLElement ? panel : document.createElement("div");
}

function wireEditorCanvas(root: HTMLElement): void {
  const canvas = root.querySelector("#editor-canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  canvas.addEventListener("pointerdown", function (event: PointerEvent): void {
    if (!editing(root)) {
      return;
    }
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    forwardEditor(root, function (mod: AgnosisModule): void {
      const at = atCanvasPixel(canvas, event);
      mod.editor_pointer_down(at[0], at[1]);
    });
  });
  canvas.addEventListener("pointermove", function (event: PointerEvent): void {
    if (!editing(root)) {
      return;
    }
    forwardEditor(root, function (mod: AgnosisModule): void {
      const at = atCanvasPixel(canvas, event);
      mod.editor_pointer_move(at[0], at[1]);
    });
  });
  canvas.addEventListener("pointerup", function (): void {
    if (!editing(root)) {
      return;
    }
    forwardEditor(root, function (mod: AgnosisModule): void {
      mod.editor_pointer_up();
    });
  });
  // The wheel scrolls the editor's own panels, never the page.
  canvas.addEventListener("wheel", function (event: WheelEvent): void {
    if (!editing(root)) {
      return;
    }
    event.preventDefault();
    forwardEditor(root, function (mod: AgnosisModule): void {
      mod.editor_wheel(wheelColumns(event), wheelLines(event));
    });
  }, { passive: false });
  // The page's own resize re-lays the editor's buffer.
  window.addEventListener("resize", function (): void {
    if (!editing(root)) {
      return;
    }
    forwardEditor(root, function (mod: AgnosisModule): void {
      mod.editor_resize();
    });
  });
}

// One window listener for the whole keyboard: the editor owns the keys
// while it is open, wherever the focus drifted.
function wireEditorKeys(root: HTMLElement): void {
  window.addEventListener("keydown", function (event: KeyboardEvent): void {
    if (!editing(root)) {
      return;
    }
    const isUndo = (event.ctrlKey || event.metaKey) && EDITOR_UNDO_KEYS.has(event.key);
    if (EDITOR_KEYS.has(event.key) || isUndo) {
      event.preventDefault();
    }
    forwardEditor(root, function (mod: AgnosisModule): void {
      mod.editor_key(event.key, event.ctrlKey, event.shiftKey, event.altKey, event.metaKey);
    });
  });
}

// Forward one editor call, then keep the DOM and the downloads honest:
// the mirror follows the wasm's answer (an ESC may have closed the
// editor) and a save leaves its download here.
function forwardEditor(root: HTMLElement, run: (mod: AgnosisModule) => void): void {
  void (async function (): Promise<void> {
    const mod = await loadModule();
    if (!mod.editor_is_open()) {
      return;
    }
    run(mod);
    drainEditorDownloads(mod);
    const button = root.querySelector("[data-agnosis-editor]");
    if (button instanceof HTMLButtonElement) {
      syncEditorDom(root, button, mod);
    }
  })();
}

// The saves queue in the wasm; the page drains and downloads them.
// The empty answer is `undefined`, not `null`: wasm-bindgen lowers an
// `Option<T>` to `undefined` when nothing is waiting, and a `=== null`
// check alone read the undefined through into a crash — one per poll.
function drainEditorDownloads(mod: AgnosisModule): void {
  for (;;) {
    const pending = mod.editor_take_download();
    if (!pending) {
      return;
    }
    download(pending.data, pending.name, pending.mime);
    say("saved " + pending.name + " downloaded (" + String(pending.data.length) + " bytes).");
  }
}

// The editor's own status line, mirrored into the page for the screen
// readers (the canvas chrome is pixels; the aria-live region is text) —
// and the save drain, because a save completes on a **tick**, not on an
// event: the armed save lands one frame after the Enter key was
// forwarded, so the poll is what turns it into a download. Without this
// drain a keyboard-only save waited for the next click.
function mirrorEditor(root: HTMLElement, mod: AgnosisModule): void {
  drainEditorDownloads(mod);
  const region = root.querySelector("[data-agnosis-editor-status]");
  if (!(region instanceof HTMLElement)) {
    return;
  }
  try {
    region.textContent = mod.editor_is_open() ? mod.editor_status() : "";
  } catch (err: unknown) {
    note("editor status: " + messageOf(err));
  }
}

// A browser pointer event, in the canvas' own pixels — the same space
// the wasm's layout runs on. The page scales the canvas with CSS, so
// the mapping goes through the element's box.
function atCanvasPixel(canvas: HTMLCanvasElement, event: PointerEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / Math.max(rect.width, 1);
  const y = (event.clientY - rect.top) * canvas.height / Math.max(rect.height, 1);
  return [x, y];
}

// The wheel delta in columns: a line-mode event is already in notches, a
// pixel-mode event divides by the cell pitch (the native wheel's own
// rule: a pixel delta over a 16-px cell is a fraction of a column).
function wheelColumns(event: WheelEvent): number {
  const delta = event.deltaMode === 1 ? event.deltaX : event.deltaX / 16;
  return delta;
}

// The wheel delta in lines, positive scrolling down — the browser and
// the editor agree on the sign, the pixel pitch only for pixel-mode
// events (a 24-px cell row).
function wheelLines(event: WheelEvent): number {
  const delta = event.deltaMode === 1 ? event.deltaY : event.deltaY / 24;
  return delta;
}

// --- the shared small things ----------------------------------------------

function gateOf(root: HTMLElement): Element | null {
  return root.querySelector("[data-agnosis-gate]");
}

// The diagnostic box the wasm itself reports failures into (its
// `report()` looks for the id); a page that broke says so in the DOM.
function note(line: string): void {
  const box = document.getElementById("diag");
  if (box === null) {
    return;
  }
  box.textContent = (box.textContent || "") + line + "\n";
}

function refreshStatusNow(root: HTMLElement, mod: AgnosisModule): void {
  const status = root.querySelector("[data-agnosis-status]");
  if (status instanceof HTMLElement) {
    refresh(root, status, mod);
  }
}

function messageOf(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

// The page loads this module with its own script tag (a module at the
// end of the body, so the DOM is parsed already), the way the other
// playground bundles mount themselves.
initAgnosis();
