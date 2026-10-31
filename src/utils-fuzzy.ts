export interface FuzzyHit {
  index: number;
  score: number;
  positions: number[];
}
export function scoreSubsequence(query: string, title: string): FuzzyHit | null {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  if (q.length === 0) {
    return { index: 0, score: 0, positions: [] };
  }
  const positions: number[] = [];
  let cursor = 0;
  for (let i = 0; i < q.length; i = i + 1) {
    const ch = q.charAt(i);
    const found = t.indexOf(ch, cursor);
    if (found < 0) {
      return null;
    }
    positions.push(found);
    cursor = found + 1;
  }
  let score = 100 - (t.length - q.length);
  score = score + positions.length * 2;
  if (t.indexOf(q) === 0) {
    score = score + 40;
  }
  score = score + countWordStartHits(t, positions) * 8;
  score = score + countPrefixRuns(positions) * 5;
  if (t.length < 20) {
    score = score + 6;
  }
  if (positions.length === 0) {
    return null;
  }
  const first = positions[0];
  if (first === undefined) {
    return null;
  }
  return { index: first, score: score, positions: positions };
}
function isWordStart(text: string, index: number): boolean {
  if (index === 0) {
    return true;
  }
  const prev = text.charAt(index - 1);
  return prev === " " || prev === "-" || prev === "/" || prev === "_" || prev === ".";
}
function countWordStartHits(text: string, positions: number[]): number {
  let hits = 0;
  for (let i = 0; i < positions.length; i = i + 1) {
    const pos = positions[i];
    if (pos === undefined) {
      continue;
    }
    if (isWordStart(text, pos)) {
      hits = hits + 1;
    }
  }
  return hits;
}
function countPrefixRuns(positions: number[]): number {
  if (positions.length < 2) {
    return 0;
  }
  let runs = 0;
  for (let i = 1; i < positions.length; i = i + 1) {
    const prev = positions[i - 1];
    const curr = positions[i];
    if (prev === undefined || curr === undefined) {
      continue;
    }
    if (curr === prev + 1) {
      runs = runs + 1;
    }
  }
  return runs;
}
export function rankTitles(query: string, titles: string[]): FuzzyHit[] {
  const trimmed = query.trim().toLowerCase();
  const hits: FuzzyHit[] = [];
  for (let i = 0; i < titles.length; i = i + 1) {
    const title = titles[i];
    if (title === undefined) {
      continue;
    }
    const hit = scoreSubsequence(trimmed, title);
    if (hit) {
      hits.push({ index: i, score: hit.score, positions: hit.positions });
    }
  }
  hits.sort(compareHits);
  return hits;
}
function compareHits(a: FuzzyHit, b: FuzzyHit): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  return a.index - b.index;
}
export function buildHighlight(title: string, positions: number[]): string {
  if (positions.length === 0) {
    return escapeHtml(title);
  }
  const sorted = positions.slice().sort(compareNumbers);
  const ranges = coalesceRuns(sorted);
  let out = "";
  let cursor = 0;
  for (let i = 0; i < ranges.length; i = i + 1) {
    const range = ranges[i];
    if (!range) {
      continue;
    }
    if (range.start > cursor) {
      out = out + escapeHtml(title.slice(cursor, range.start));
    }
    out = out + "<mark>" + escapeHtml(title.slice(range.start, range.end)) + "</mark>";
    cursor = range.end;
  }
  if (cursor < title.length) {
    out = out + escapeHtml(title.slice(cursor));
  }
  return out;
}
function compareNumbers(a: number, b: number): number {
  return a - b;
}
function coalesceRuns(sorted: number[]): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < sorted.length; i = i + 1) {
    const pos = sorted[i];
    if (pos === undefined) {
      continue;
    }
    const last = ranges[ranges.length - 1];
    if (last && pos <= last.end) {
      if (pos + 1 > last.end) {
        last.end = pos + 1;
      }
    } else {
      ranges.push({ start: pos, end: pos + 1 });
    }
  }
  return ranges;
}
function escapeHtml(raw: string): string {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
