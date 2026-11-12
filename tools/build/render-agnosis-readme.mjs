// Renders the AGnosis README into the help page's read-me fragment.
//
// The read-me page (`/products/agnosis/help/readme/`) carries the full
// text of the AGnosis README — the same document the desktop app shows
// in its F1 help window — and the source of truth is the AGnosis
// repository's own README.md. This script converts it once, by hand,
// into the fragment the site build assembles:
//
//   node tools/build/render-agnosis-readme.mjs [path-to-README.md]
//
// The fragment lands in tools/build/content/products-agnosis-help-readme.html
// and is committed; re-run the script when the README changes. It is NOT
// wired into the site build on purpose: the site build must never depend
// on a sibling repository's checkout being present.
//
// The three conversions the studio's markdown renderer (markdown.mjs)
// does not cover:
//   * markdown **tables** — converted to HTML tables before rendering;
//   * the indented code fences inside the HOW TO USE list items —
//     dedented so they render as fences, not as paragraphs;
//   * repo-relative links (LICENSE.txt, packaging/…) — neutralised into
//     code spans, because the site has no copy of the repository tree.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown } from "./markdown.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const DEFAULT_README = path.join(ROOT, "..", "AGnosis", "README.md");
const OUT = path.join(ROOT, "tools", "build", "content", "products-agnosis-help-readme.html");

const readmePath = process.argv[2] !== undefined ? process.argv[2] : DEFAULT_README;
const source = fs.readFileSync(readmePath, "utf8");

// The logo image points into the AGnosis repository's REVIEW folder; the
// page carries the product's own mark in its chrome, so the line goes.
// The README's own `# AGnosis` title goes with it: the page already
// introduces itself, and a second top heading would break the outline.
const withoutLogo = source
  .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/m, "")
  .replace(/^# AGnosis\s*$/m, "");

// Repo-relative links become code spans: the site does not carry the
// repository tree they point into.
const withoutRepoLinks = withoutLogo.replace(
  /\[([^\]]+)\]\(((?:LICENSE|packaging|REVIEW|crates|src)[^)]*)\)/g,
  "`$1`"
);

// Indented fences (four spaces, inside the HOW TO USE list items) and
// their bodies dedent to column zero, so the renderer sees fences.
function dedentIndentedFences(text) {
  const lines = text.split("\n");
  const out = [];
  let inFence = false;
  for (const line of lines) {
    if (!inFence && /^ {4}```/.test(line)) {
      inFence = true;
      out.push(line.slice(4));
      continue;
    }
    if (inFence) {
      if (/^```/.test(line) && !/^ {4,}```/.test(line)) {
        inFence = false;
        out.push(line);
        continue;
      }
      out.push(line.replace(/^ {1,4}/, ""));
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

// Markdown tables become HTML tables; everything else renders through
// the studio's own renderer. A table is a run of lines that all start
// with a pipe.
function renderWithTables(text) {
  const lines = text.split("\n");
  const parts = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*\|/.test(line)) {
      const table = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        table.push(lines[index]);
        index = index + 1;
      }
      parts.push(renderTable(table));
      continue;
    }
    const chunk = [];
    while (index < lines.length && !/^\s*\|/.test(lines[index])) {
      chunk.push(lines[index]);
      index = index + 1;
    }
    parts.push(renderMarkdown(chunk.join("\n")));
  }
  return parts.join("\n");
}

// One markdown table: the first row is the header, the second the
// alignment row (dropped), the rest the body. Every cell renders inline
// (backticks, bold), which the renderer already escapes.
function renderTable(rows) {
  const cells = rows
    .filter((row) => !/^\s*\|[\s:|-]+\|\s*$/.test(row))
    .map((row) => row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|"));
  if (cells.length === 0) {
    return "";
  }
  const header = cells[0];
  const body = cells.slice(1);
  const html = ["<table>", "<thead>", "<tr>"];
  for (const cell of header) {
    html.push("<th>" + renderInlineTable(cell.trim()) + "</th>");
  }
  html.push("</tr>", "</thead>", "<tbody>");
  for (const row of body) {
    html.push("<tr>");
    for (const cell of row) {
      html.push("<td>" + renderInlineTable(cell.trim()) + "</td>");
    }
    html.push("</tr>");
  }
  html.push("</tbody>", "</table>");
  return html.join("");
}

// Cells render through the same inline rules the body text uses; the
// renderer is line-based, so a one-line source is a paragraph — strip
// the wrapping <p> it adds.
function renderInlineTable(cell) {
  const rendered = renderMarkdown(cell);
  return rendered.replace(/^<p>/, "").replace(/<\/p>$/, "");
}

// The read-me headings drop one level: the page carries its own h1 and
// the section heading, so the README's `##` becomes an `h3`.
function demoteHeadings(text) {
  return text.replace(/^(#{2,5})\s+/gm, "#$1 ");
}

const prepped = demoteHeadings(dedentIndentedFences(withoutRepoLinks));
const body = renderWithTables(prepped);

const fragment = [
  '<section class="content-section" data-admin="content:content.css" id="agnosis-help-readme" aria-labelledby="agnosis-help-readme-heading">',
  '<h2 class="section-heading" id="agnosis-help-readme-heading">The AGnosis read-me</h2>',
  "<p>The full README, exactly as the desktop app ships it — the same document its <code>F1</code> help window shows. It covers every command, every configuration key, the balloon pipeline, the editor's every mode, the exports and the platform caveats. For a shorter start, read the <a href=\"/products/agnosis/help/inbrowser/\">in-browser guide</a> or the <a href=\"/products/agnosis/help/desktop/\">desktop guide</a>.</p>",
  '<article class="content-article agnosis-readme" data-admin="content:content.css" id="agnosis-help-readme-body">',
  body,
  "</article>",
  "</section>",
  '<div class="chip-row">',
  '<a class="chip" href="/products/agnosis/help/">AGnosis help</a>',
  '<a class="chip" href="/products/agnosis/help/inbrowser/">In-browser help</a>',
  '<a class="chip" href="/products/agnosis/help/desktop/">Desktop help</a>',
  '<a class="chip" href="/products/agnosis/">Product page</a>',
  "</div>",
  "",
].join("\n");

fs.writeFileSync(OUT, fragment, "utf8");
const tables = (body.match(/<table>/g) || []).length;
console.log("read-me fragment written: " + path.relative(ROOT, OUT));
console.log("tables converted: " + String(tables) + ", characters: " + String(body.length));
