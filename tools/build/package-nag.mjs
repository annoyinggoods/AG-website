// Builds the downloadable copy of the nAG game.
//
// The archive is what a visitor unpacks and opens. It has to run from a
// file:// URL, because that is what "double click index.html" means to
// someone who wants to play the game without a website in front of it.
//
// The game is the same game the site serves. It is read from the site
// sources, so a fix in the game is a fix in both, and the download can
// never be a different game from the one on the page.
//
// The pieces of the archive are:
//   index.html                    the page, with a title and the game inside
//   nag.js                        the game, as one plain script
//   nag.css                       the stylesheet
//   vendor/confetti.browser.js    the celebration, for the win screen
//   LICENSE.txt                   the licence of the game
//   README.txt                    how to play and where it came from

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { writeZip } from "./zip.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const STAGE_DIR = path.join(ROOT, "standalone", "nag");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");
const GAME_VERSION = "0.1.0";
const ARCHIVE_NAME = "nag-" + GAME_VERSION;
const ZIP_PATH = path.join(DOWNLOAD_DIR, ARCHIVE_NAME, ARCHIVE_NAME + ".zip");

function fail(message) {
  console.error("NAG PACKAGE ERROR: " + message);
  process.exit(1);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

// The checksum file is rewritten only when the digest changes, so a build
// that runs while a visitor (or a test) is reading the download never
// replaces a file that says the same thing anyway.
function writeFileIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
    return;
  }
  writeFile(filePath, content);
}

/**
 * The stylesheet the game needs on its own.
 *
 * The site stylesheet is scoped to the game container, which is right for
 * the site and useless on its own page. The game stylesheet for the
 * standalone copy is the same rules with the container dropped, because the
 * whole page is the game.
 *
 * Two rules are added, because on the site the page around the game is the
 * site's own chrome and on its own page the game has to make the page
 * itself: the page background and the title.
 */
function standaloneCss() {
  const source = readFile(path.join(ROOT, "styles", "nag.css"));
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = withoutComments
    // The tokens live on the game container on the site. On its own page
    // the whole document is the game, so they move to the root.
    .replace(/#nag-app \{/, ":root {")
    .replace(/#nag-app /g, "")
    .replace(/body:has\(#nag-app\)/g, "html");

  const pageRules = `
html,
body {
  margin: 0;
  min-height: 100%;
  background: var(--nag-page-bg);
  color: var(--nag-ink);
  font-family: system-ui, sans-serif;
}

.app {
  min-height: 100vh;
  display: block;
  padding: 1rem;
  background: var(--nag-page-bg);
}

.nag-title {
  margin: 0;
  font-size: clamp(2rem, 6vw, 3rem);
  letter-spacing: 0.2em;
  color: var(--nag-accent);
}
`;

  return rules + pageRules;
}

const INDEX_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>nAG — reverse-order memory game</title>
  <meta name="description" content="nAG is a reverse-order memory game: scout the board, then replay the whole order in one perfect run.">
  <link rel="stylesheet" href="nag.css">
</head>
<body>
  <main id="nag-app" class="app" data-show-title="true">
    <noscript>nAG needs JavaScript to run.</noscript>
  </main>
  <script src="vendor/confetti.browser.js"></script>
  <script src="nag.js"></script>
</body>
</html>
`;

const README = `nAG — reverse-order memory game
================================

How to play
-----------

Scout the board, then replay the whole order in one perfect run.

1. Press PLAY. The board is shuffled and the clock starts.
2. Turn cards over to find a matching pair. The first pair you find is your
   anchor, and the order list under the board starts from it.
3. Now play every card in the order the list gives you. Turn over the wrong
   card and you lose a point and the board hides again.
4. Finish all the pairs in one unbroken run to win.

Six levels are there, from a four by four grid to a memorised twenty five
card order. Your best times and scores are kept in this browser, so they
stay on this machine.

How to run it
-------------

Unpack the archive and double click index.html. The game runs in your
browser, works offline, and never sends anything anywhere.

Some browsers will not open a local page with a double click. If that
happens, open the folder with a local server instead:

    python -m http.server 8000

and then visit http://localhost:8000/ in your browser.

Where it came from
------------------

nAG is by Annoying Goods. It is free and open source.

    https://annoyinggoods.com/products/nAG/

The source of the game is on the site, and the game on the playground is the
same game as this one.
`;

const LICENSE = `nAG — reverse-order memory game
Copyright (c) Annoying Goods

This game is free and open-source software under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


Third party code
----------------

canvas-confetti 1.9.4 — MIT License
Copyright (c) 2019 Ismail H kamath
https://github.com/catdad/canvas-confetti

The celebration on the win screen uses that library. The full licence text
comes with it in vendor/confetti.browser.js.
`;

export function buildNagPackage() {
  const bundlePath = path.join(ROOT, "scripts", "nag", "nag.standalone.js");
  if (!fs.existsSync(bundlePath)) {
    fail("scripts/nag/nag.standalone.js is missing. Run the game bundler first.");
  }
  const confettiPath = path.join(ROOT, "assets", "nag", "canvas-confetti.browser.js");
  if (!fs.existsSync(confettiPath)) {
    fail("assets/nag/canvas-confetti.browser.js is missing.");
  }

  fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(STAGE_DIR, "vendor"), { recursive: true });

  writeFile(path.join(STAGE_DIR, "index.html"), INDEX_HTML);
  writeFile(path.join(STAGE_DIR, "nag.js"), readFile(bundlePath));
  writeFile(path.join(STAGE_DIR, "nag.css"), standaloneCss());
  writeFile(path.join(STAGE_DIR, "vendor", "confetti.browser.js"), readFile(confettiPath));
  writeFile(path.join(STAGE_DIR, "README.txt"), README);
  writeFile(path.join(STAGE_DIR, "LICENSE.txt"), LICENSE);

  fs.mkdirSync(path.join(DOWNLOAD_DIR, ARCHIVE_NAME), { recursive: true });
  const archive = writeZip(STAGE_DIR, ZIP_PATH, ARCHIVE_NAME);

  const digest = crypto.createHash("sha256").update(fs.readFileSync(ZIP_PATH)).digest("hex");
  writeFileIfChanged(
    path.join(DOWNLOAD_DIR, ARCHIVE_NAME, "sha256.txt"),
    digest + "  " + ARCHIVE_NAME + ".zip\n",
  );

  return {
    path: ZIP_PATH,
    bytes: archive.bytes,
    files: archive.files,
    sha256: digest,
    version: GAME_VERSION,
    humanSize: (archive.bytes / 1024).toFixed(1) + " KB",
  };
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = buildNagPackage();
  console.log(
    "downloads/" + path.basename(result.path) + ": " + String(result.bytes) +
    " bytes, " + String(result.files) + " files, SHA256 " + result.sha256,
  );
}
