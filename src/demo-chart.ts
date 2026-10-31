import { prefersReducedMotion } from "./utils-dom.js";

// The JSON contract with the Rust side is written down in REVIEW/audit/chart-boundary.md.
export interface DemoRequest {
  text: string;
  termBudget?: number;
}
export interface DemoTerm {
  term: string;
  count: number;
}
export interface DemoAnalysis {
  chars: number;
  words: number;
  sentences: number;
  unique: number;
  avg_word_len: number;
  avg_sentence_len: number;
  top_terms: DemoTerm[];
}
export interface DemoSeries {
  buckets: number[];
  labels: string[];
  peak: number;
}
export interface DemoErrorResponse {
  code: string;
  error: string;
}
export type DemoEngine = "wasm" | "fallback";
export interface DemoResult extends DemoAnalysis {
  series: DemoSeries;
  engine: DemoEngine;
}
interface WasmModule {
  analyze_text: (text: string) => string;
  chart_series: (text: string) => string;
  version: () => string;
}
interface WasmLoader extends WasmModule {
  default: (path?: string) => Promise<unknown>;
}
const WASM_GLUE_PATH = "/wasm/pkg/ag_text_stats.js";
const MAX_INPUT_CHARS = 200000;
const MAX_WORD_LEN = 200;
const DEFAULT_TERM_BUDGET = 10;
const CHART_DEBOUNCE_MS = 350;
const CHUNK_MS = 24;
const SAMPLE_TEXT = "The spider wove its web across the attic window. Silk threads caught the morning light while the spider waited. A curious fly tested the web, then escaped through a torn corner. The spider repaired the torn silk and wove a stronger thread before dusk.";
let wasmPromise: Promise<WasmModule> | null = null;
let wasmNotice = "";
let wasmVersion = "";
export function initDemoChart(): void {
  const root = document.querySelector("[data-demo-chart]");
  if (!(root instanceof HTMLElement)) {
    return;
  }
  ensurePanel(root);
  watchForVisibility(root);
}
function ensurePanel(root: HTMLElement): void {
  if (root.querySelector("[data-demo-panel]")) {
    return;
  }
  const panel = document.createElement("div");
  panel.className = "demo-panel";
  panel.setAttribute("data-demo-panel", "");
  panel.innerHTML = panelMarkup();
  root.appendChild(panel);
  wirePanel(root, panel);
}
function panelMarkup(): string {
  return ""
    + "<p class=\"demo-status\" data-demo-loading role=\"status\">Demo loading. The fast WASM path starts when this panel scrolls into view.</p>"
    + "<div class=\"demo-controls\">"
    + "<label class=\"demo-field\" for=\"demo-input\">Paste text to analyze"
    + "<textarea class=\"demo-input\" id=\"demo-input\" data-demo-input rows=\"6\" maxlength=\"200000\" placeholder=\"Paste the text you want to analyze\"></textarea></label>"
    + "<div class=\"demo-buttons\">"
    + "<button class=\"demo-sample\" type=\"button\" data-demo-sample>Load sample text</button>"
    + "<button class=\"demo-run\" type=\"button\" data-demo-run>Analyze text</button>"
    + "</div></div>"
    + "<p class=\"demo-live\" data-demo-live role=\"status\" aria-live=\"polite\"></p>"
    + "<p class=\"demo-error\" data-demo-error role=\"alert\" hidden></p>"
    + "<div class=\"demo-results\" data-demo-results hidden>"
    + "<table class=\"demo-table\"><caption>Text statistics</caption>"
    + "<tbody data-demo-table></tbody></table>"
    + "<figure class=\"demo-chart-figure\"><figcaption>Top terms chart</figcaption>"
    + "<svg class=\"demo-chart\" data-demo-chart-svg role=\"img\" aria-label=\"Bar chart of top terms\"></svg>"
    + "<p class=\"demo-chart-text\" data-demo-chart-text></p></figure></div>";
}
function wirePanel(root: HTMLElement, panel: HTMLElement): void {
  const input = panel.querySelector("[data-demo-input]");
  const sample = panel.querySelector("[data-demo-sample]");
  const run = panel.querySelector("[data-demo-run]");
  if (!(input instanceof HTMLTextAreaElement)) {
    return;
  }
  if (sample instanceof HTMLButtonElement) {
    sample.addEventListener("click", function (): void {
      input.value = SAMPLE_TEXT;
      chartAnnounce(panel, "Sample text loaded. Analyzing now.");
      scheduleAnalysis(root, panel, 0);
    });
  }
  if (run instanceof HTMLButtonElement) {
    run.addEventListener("click", function (): void {
      scheduleAnalysis(root, panel, 0);
    });
  }
  let timer = 0;
  input.addEventListener("input", function (): void {
    window.clearTimeout(timer);
    timer = window.setTimeout(function (): void {
      scheduleAnalysis(root, panel, 0);
    }, CHART_DEBOUNCE_MS);
  });
  input.addEventListener("focus", function (): void {
    startWasmLoad(root, panel);
  });
}
function watchForVisibility(root: HTMLElement): void {
  const panel = root.querySelector("[data-demo-panel]");
  if (!(panel instanceof HTMLElement)) {
    return;
  }
  if (typeof IntersectionObserver !== "function") {
    startWasmLoad(root, panel);
    return;
  }
  const observer = new IntersectionObserver(function (entries: IntersectionObserverEntry[]): void {
    for (let i = 0; i < entries.length; i = i + 1) {
      const entry = entries[i];
      if (entry && entry.isIntersecting) {
        observer.disconnect();
        startWasmLoad(root, panel);
        return;
      }
    }
  }, { rootMargin: "200px" });
  observer.observe(panel);
}
function startWasmLoad(root: HTMLElement, panel: HTMLElement): void {
  void root;
  loadWasm().then(function (): void {
    setLoading(panel, "Fast WASM path ready" + versionSuffix() + ". Paste text or load the sample.");
  }).catch(function (): void {
    setLoading(panel, "Fast WASM path unavailable. Using the built-in analyzer instead." + wasmNoticeSuffix());
  });
}
function wasmNoticeSuffix(): string {
  return wasmNotice.length > 0 ? " " + wasmNotice : "";
}
function versionSuffix(): string {
  return wasmVersion.length > 0 ? " (engine " + wasmVersion + ")" : "";
}
function setLoading(panel: HTMLElement, message: string): void {
  const loading = panel.querySelector("[data-demo-loading]");
  if (loading instanceof HTMLElement) {
    loading.textContent = message;
  }
}
function scheduleAnalysis(root: HTMLElement, panel: HTMLElement, attempt: number): void {
  void root;
  if (attempt > 0) {
    return;
  }
  const input = panel.querySelector("[data-demo-input]");
  if (!(input instanceof HTMLTextAreaElement)) {
    return;
  }
  const text = input.value;
  const request: DemoRequest = { text: text };
  chartAnnounce(panel, "Analysis started.");
  hideError(panel);
  if (text.length > MAX_INPUT_CHARS) {
    showError(panel, "Text exceeds the 200,000 character demo limit. Please paste a shorter passage.");
    chartAnnounce(panel, "Analysis failed: oversize input.");
    return;
  }
  runChunked(panel, request);
}
function runChunked(panel: HTMLElement, request: DemoRequest): void {
  const started = Date.now();
  window.setTimeout(function (): void {
    void started;
    analyzeWithBestEngine(request).then(function (result: DemoResult): void {
      renderChartResults(panel, result, result.series);
      setLoading(panel, result.engine === "wasm" ? "Fast WASM path ready" + versionSuffix() + "." : "Built-in analyzer active. The fast WASM path is unavailable.");
      chartAnnounce(panel, "Analysis complete: " + String(result.words) + " words, " + String(result.sentences) + " sentences.");
    }).catch(function (err: unknown): void {
      const message = chartMessageFor(err);
      showError(panel, message);
      chartAnnounce(panel, "Analysis failed: " + message);
    });
  }, prefersReducedMotion() ? 0 : CHUNK_MS);
}
function analyzeWithBestEngine(request: DemoRequest): Promise<DemoResult> {
  return loadWasm().then(
    function (wasm: WasmModule): DemoResult {
      const analysis = parseAnalysis(wasm.analyze_text(request.text));
      const series = parseSeries(wasm.chart_series(request.text));
      wasmVersion = wasm.version();
      return applyTermBudget({ chars: analysis.chars, words: analysis.words, sentences: analysis.sentences, unique: analysis.unique, avg_word_len: analysis.avg_word_len, avg_sentence_len: analysis.avg_sentence_len, top_terms: analysis.top_terms, series: series, engine: "wasm" }, request);
    },
    function (): DemoResult {
      return applyTermBudget(analyzeFallback(request.text), request);
    }
  );
}
function applyTermBudget(result: DemoResult, request: DemoRequest): DemoResult {
  const budget = termBudgetOf(request);
  const buckets = result.series.buckets.slice(0, budget);
  const labels = result.series.labels.slice(0, budget);
  const peak = buckets.length > 0 ? Math.max.apply(null, buckets) : 0;
  return { chars: result.chars, words: result.words, sentences: result.sentences, unique: result.unique, avg_word_len: result.avg_word_len, avg_sentence_len: result.avg_sentence_len, top_terms: result.top_terms.slice(0, budget), series: { buckets: buckets, labels: labels, peak: peak }, engine: result.engine };
}
function termBudgetOf(request: DemoRequest): number {
  if (request.termBudget === undefined) {
    return DEFAULT_TERM_BUDGET;
  }
  return Math.max(1, Math.min(request.termBudget, DEFAULT_TERM_BUDGET));
}
function importGlue(): Promise<WasmLoader> {
  return import(WASM_GLUE_PATH) as unknown as Promise<WasmLoader>;
}
function loadWasm(): Promise<WasmModule> {
  if (wasmPromise) {
    return wasmPromise;
  }
  if (typeof WebAssembly !== "object") {
    wasmNotice = "This browser has no WebAssembly support.";
    wasmPromise = Promise.reject(new Error("no-wasm"));
    return wasmPromise;
  }
  wasmPromise = importGlue().then(function (loader: WasmLoader): Promise<WasmModule> {
    return loader.default().then(function (): WasmModule {
      return { analyze_text: loader.analyze_text, chart_series: loader.chart_series, version: loader.version };
    });
  }).catch(function (err: unknown): Promise<WasmModule> {
    wasmNotice = wasmMessage(err);
    throw err;
  });
  return wasmPromise;
}
function wasmMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message.slice(0, 120);
  }
  return "WASM failed to load.";
}
function parseAnalysis(json: string): DemoAnalysis {
  const parsed = JSON.parse(json) as Partial<DemoAnalysis> & Partial<DemoErrorResponse>;
  const failure = errorBodyOf(parsed);
  if (failure) {
    throw new Error(failure.error || "Analysis failed.");
  }
  return { chars: parsed.chars as number, words: parsed.words as number, sentences: parsed.sentences as number, unique: parsed.unique as number, avg_word_len: parsed.avg_word_len as number, avg_sentence_len: parsed.avg_sentence_len as number, top_terms: parsed.top_terms || [] };
}
function parseSeries(json: string): DemoSeries {
  const parsed = JSON.parse(json) as Partial<DemoSeries> & Partial<DemoErrorResponse>;
  const failure = errorBodyOf(parsed);
  if (failure) {
    throw new Error(failure.error || "Chart failed.");
  }
  return { buckets: parsed.buckets || [], labels: parsed.labels || [], peak: parsed.peak || 0 };
}
function errorBodyOf(parsed: object): DemoErrorResponse | null {
  const body = parsed as Partial<DemoErrorResponse>;
  const code = typeof body.code === "string" ? body.code : "";
  const message = typeof body.error === "string" ? body.error : "";
  if (code === "" && message === "") {
    return null;
  }
  return { code: code, error: message };
}
function chartMessageFor(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Analysis failed. Please try shorter text.";
}
function showError(panel: HTMLElement, message: string): void {
  const error = panel.querySelector("[data-demo-error]");
  if (error instanceof HTMLElement) {
    error.hidden = false;
    error.textContent = message;
  }
}
function hideError(panel: HTMLElement): void {
  const error = panel.querySelector("[data-demo-error]");
  if (error instanceof HTMLElement) {
    error.hidden = true;
    error.textContent = "";
  }
}
function chartAnnounce(panel: HTMLElement, message: string): void {
  const live = panel.querySelector("[data-demo-live]");
  if (live instanceof HTMLElement) {
    live.textContent = message;
  }
}
function renderChartResults(panel: HTMLElement, analysis: DemoAnalysis, series: DemoSeries): void {
  const host = panel.querySelector("[data-demo-results]");
  const body = panel.querySelector("[data-demo-table]");
  if (!(host instanceof HTMLElement) || !(body instanceof HTMLElement)) {
    return;
  }
  body.innerHTML = "";
  appendRow(body, "Characters", String(analysis.chars));
  appendRow(body, "Words", String(analysis.words));
  appendRow(body, "Sentences", String(analysis.sentences));
  appendRow(body, "Unique words", String(analysis.unique));
  appendRow(body, "Average word length", String(analysis.avg_word_len));
  appendRow(body, "Average sentence length", String(analysis.avg_sentence_len));
  appendTopTerms(body, analysis.top_terms);
  host.hidden = false;
  drawChart(panel, series);
  describeChart(panel, analysis, series);
}
function appendRow(body: HTMLElement, label: string, value: string): void {
  const row = document.createElement("tr");
  const head = document.createElement("th");
  head.scope = "row";
  head.textContent = label;
  const cell = document.createElement("td");
  cell.textContent = value;
  row.appendChild(head);
  row.appendChild(cell);
  body.appendChild(row);
}
function appendTopTerms(body: HTMLElement, terms: DemoTerm[]): void {
  const row = document.createElement("tr");
  const head = document.createElement("th");
  head.scope = "row";
  head.textContent = "Top terms";
  const cell = document.createElement("td");
  if (terms.length === 0) {
    cell.textContent = "None yet.";
  } else {
    cell.textContent = terms.map(function (entry: DemoTerm): string {
      return entry.term + " (" + String(entry.count) + ")";
    }).join(", ");
  }
  row.appendChild(head);
  row.appendChild(cell);
  body.appendChild(row);
}
function drawChart(panel: HTMLElement, series: DemoSeries): void {
  const svg = panel.querySelector("[data-demo-chart-svg]");
  if (!(svg instanceof SVGSVGElement)) {
    return;
  }
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
  const width = 520;
  const height = 220;
  const pad = 28;
  svg.setAttribute("viewBox", "0 0 " + String(width) + " " + String(height));
  svg.setAttribute("width", "100%");
  const buckets = series.buckets.slice(0, 12);
  const labels = series.labels.slice(0, 12);
  if (buckets.length === 0) {
    return;
  }
  const peak = Math.max(1, series.peak);
  const slot = (width - pad * 2) / buckets.length;
  const barWidth = Math.max(8, slot - 10);
  for (let i = 0; i < buckets.length; i = i + 1) {
    const value = buckets[i] || 0;
    const label = labels[i] || "term";
    const tall = (height - pad * 2) * (value / peak);
    const x = pad + slot * i + (slot - barWidth) / 2;
    const y = height - pad - tall;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(Math.round(x)));
    rect.setAttribute("y", String(Math.round(y)));
    rect.setAttribute("width", String(Math.round(barWidth)));
    rect.setAttribute("height", String(Math.round(tall)));
    rect.setAttribute("fill", "currentColor");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = label + ": " + String(value);
    rect.appendChild(title);
    svg.appendChild(rect);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(Math.round(x + barWidth / 2)));
    text.setAttribute("y", String(height - 8));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "11");
    text.textContent = label.slice(0, 10);
    svg.appendChild(text);
  }
}
function describeChart(panel: HTMLElement, analysis: DemoAnalysis, series: DemoSeries): void {
  const text = panel.querySelector("[data-demo-chart-text]");
  if (!(text instanceof HTMLElement)) {
    return;
  }
  if (series.labels.length === 0) {
    text.textContent = "No chart data yet.";
    return;
  }
  const top = series.labels[0] || "term";
  const count = series.buckets[0] || 0;
  text.textContent = "Chart summary: " + String(analysis.words) + " words with top term " + top + " at " + String(count) + " uses.";
}
export function analyzeFallback(text: string): DemoResult {
  const terms = tokenizeFallback(text);
  if (terms.length === 0) {
    throw new Error("No words found. Paste text or load the sample before analyzing.");
  }
  const counts = countFallback(terms);
  const words = terms.length;
  const sentences = countSentencesFallback(text, terms.length);
  const chars = Array.from(text).length;
  const unique = counts.length;
  const total = totalFallback(terms);
  const analysis: DemoAnalysis = {
    chars: chars,
    words: words,
    sentences: sentences,
    unique: unique,
    avg_word_len: roundFallback(total / words),
    avg_sentence_len: roundFallback(words / Math.max(1, sentences)),
    top_terms: counts.slice(0, DEFAULT_TERM_BUDGET),
  };
  const series: DemoSeries = {
    buckets: counts.slice(0, DEFAULT_TERM_BUDGET).map(function (entry: DemoTerm): number { return entry.count; }),
    labels: counts.slice(0, DEFAULT_TERM_BUDGET).map(function (entry: DemoTerm): string { return entry.term; }),
    peak: counts.length > 0 && counts[0] ? counts[0].count : 0,
  };
  return { chars: analysis.chars, words: analysis.words, sentences: analysis.sentences, unique: analysis.unique, avg_word_len: analysis.avg_word_len, avg_sentence_len: analysis.avg_sentence_len, top_terms: analysis.top_terms, series: series, engine: "fallback" };
}
function tokenizeFallback(text: string): string[] {
  const out: string[] = [];
  let current = "";
  for (const ch of text) {
    if (isWordFallback(ch)) {
      if (current.length < MAX_WORD_LEN) {
        current += ch.toLowerCase();
      }
      continue;
    }
    if (current.length > 0) {
      pushFallback(out, current);
      current = "";
    }
  }
  if (current.length > 0) {
    pushFallback(out, current);
  }
  return out;
}
function isWordFallback(ch: string): boolean {
  if (ch === "'" || ch === "-") {
    return true;
  }
  return /[\p{L}\p{N}]/u.test(ch);
}
function pushFallback(out: string[], current: string): void {
  const trimmed = current.replace(/^['-]+|['-]+$/g, "");
  if (/[\p{L}]/u.test(trimmed)) {
    out.push(trimmed);
  }
}
function countFallback(terms: string[]): DemoTerm[] {
  const pairs: DemoTerm[] = [];
  for (const term of terms) {
    const found = bumpFallback(pairs, term);
    if (!found) {
      pairs.push({ term: term, count: 1 });
    }
  }
  pairs.sort(function (a: DemoTerm, b: DemoTerm): number {
    if (a.count !== b.count) {
      return b.count - a.count;
    }
    return a.term < b.term ? -1 : 1;
  });
  return pairs;
}
function bumpFallback(pairs: DemoTerm[], term: string): boolean {
  for (const pair of pairs) {
    if (pair.term === term) {
      pair.count += 1;
      return true;
    }
  }
  return false;
}
function countSentencesFallback(text: string, wordCount: number): number {
  let count = 0;
  let inRun = false;
  let hasWord = false;
  for (const ch of text) {
    if (/[\p{L}]/u.test(ch)) {
      hasWord = true;
    }
    if (ch === "." || ch === "!" || ch === "?") {
      if (!inRun && hasWord) {
        count += 1;
      }
      inRun = true;
      continue;
    }
    inRun = false;
  }
  if (hasWord && count === 0) {
    return 1;
  }
  if (wordCount === 0) {
    return 0;
  }
  return count;
}
function totalFallback(terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    total += Array.from(term).length;
  }
  return total;
}
function roundFallback(value: number): number {
  return Math.round(value * 10) / 10;
}
