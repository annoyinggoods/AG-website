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

Copyright (c) 2026, Annoying Goods <marek@annoyinggoods.com>, <https://annoyinggoods.com>
Reserved Name: "nAG"

---

# OPEN SOURCE LICENSE WITH ETHICAL RESTRICTIONS

**Version 2.0**

This software is open source.
Its source code is distributed with it and is licensed here, together with the compiled
application, free of charge, subject to the ethical restrictions below.

---

### **TERMS AND CONDITIONS FOR USE, MODIFICATION, AND DISTRIBUTION OF THE SOFTWARE**

#### **1. DEFINITIONS**

- **1.1. "License"** means the terms and conditions set forth herein for the use of the Software.
- **1.2. "Licensor"** means the copyright owner or entity authorized by the copyright owner granting this License.
- **1.3. "Licensee"** means an individual or entity exercising the permissions granted by this License.
- **1.4. "Software"** means the software in any form — the Source Code, the compiled application, its installers, and the data files and documentation that accompany them — as the Licensor distributes them, and modified versions of it as distributed by Licensee.
- **1.5. "Source Code"** means the human-readable form of the Software, in any form, including the source files, the build scripts, the configuration that compiles them, and the templates and corpus they assemble.
- **1.6. "Reserved Name"** means the name "nAG" and any variations or logos designated by the Licensor.
- **1.7. "Supply Chain"** means the sequence of processes involved in the production, operation, or distribution of goods or services by Licensee.
- **1.8. "Supply Chain Impacted Party"** means any person directly impacted by Licensee’s Supply Chain.
- **1.9. "Duty of Care"** is defined as the legal requirement to act with the watchfulness, attention, caution, and prudence that a reasonable person in similar circumstances would exercise toward a Supply Chain Impacted Party.

---

#### **2. GRANT OF RIGHTS**

- **2.1. Permitted Uses:** Subject to strict compliance with all terms of this License, Licensor grants Licensee a worldwide, non-exclusive, royalty-free license to:
  - Use, reproduce, prepare, run, and execute the Software, in source or compiled form, for any purpose, personal, educational, research, or commercial.
  - Make backup copies of the Software and keep them for as long as they are used.
  - Modify the Software, and compile and prepare derivative works of it.
  - Distribute the Software or modified versions of it, in source or compiled form, in whole or in part, with or without charge, subject to the conditions of Section 2.2.
  - Sublicense and/or sell copies of the Software or modified versions of it, provided the recipient receives no lesser rights than this License grants and no fewer obligations than this License imposes.
- **2.2. Distribution Conditions:** Licensee **SHALL**, for every distribution of the Software or a modified version, in whole or in part:
  - Include a complete copy of this License.
  - Preserve and reproduce all copyright, trademark, patent, and attribution notices of the Licensor (Section 4.1).
  - State in reasonable form, within the distributed materials, the changes made to the Software, if any.
- **2.3. Patent Grant Limitation:** This License grants **no express or implied patent licenses** to make, sell, offer to sale, import, or otherwise transfer commercial embodiments of the Software.

---

#### **3. ETHICAL STANDARDS**

The permissions granted in Section 2 are expressly contingent upon Licensee's continuous compliance with the following ethical standards.
The Software shall not be used by any person or entity for any systems, activities, or other uses that violate any Human Rights Laws.
“Human Rights Laws” means any applicable laws, regulations, or rules (collectively, “Laws”) that protect human, civil, labor, privacy, political, environmental, security, economic, due process, or similar rights; provided, however, that such Laws are consistent and not in conflict with Human Rights Principles (a dispute over the consistency of or a conflict between Laws and Human Rights Principles shall be determined by arbitration as stated above).
Where the Human Rights Laws of more than one jurisdiction are applicable or in conflict with respect to the use of the Software, the Human Rights Laws that are most protective of the individuals or groups harmed shall apply.
In particular Licensee **SHALL NOT**, directly or indirectly:

- **3.1.** Infringe upon any person’s right to life or security of person, engage in extrajudicial killings, or commit violence (*UN Universal Declaration of Human Rights, Art. 3*).
- **3.2.** Hold any person in slavery, servitude, or forced labor (*UN UDHR, Art. 4*).
- **3.3.** Torture or subject any person to cruel, inhuman or degrading treatment or punishment (*UN UDHR, Art. 5*).
- **3.4.** Discriminate on the basis of sex, gender, sexual orientation, race, ethnicity, nationality, religion, caste, age, or disability (*UN UDHR, Art. 7*).
- **3.5.** Arbitrarily interfere with any person’s privacy, family, home or correspondence (*UN UDHR, Art. 12*).
- **3.6.** Participate in mass surveillance programs, conduct military combat operations, or supply products/services directly to law enforcement agencies engaging in human rights abuses.
- **3.7.** Engage in mineral or fossil fuel exploration, extraction, or sales listed on the Carbon Underground 200 index.
- **3.8.** Commit ecocide or acts causing severe, widespread, and long-term damage to the natural environment.
- **3.9.** Interfere with workers’ rights to associate and organize collectively (*ILO Convention No. 87*).

---

#### **4. NOTICE, TRADEMARK & ACKNOWLEDGMENT**

- **4.1. Preservation of Notices:** Licensee must maintain all original copyright, trademark, patent, and attribution notices in all copies of the Software, in whole or in part, and in all modified versions of it.
  These notices must be included either as standalone text files, human-readable file headers, or in appropriate machine-readable metadata fields easily viewable by users.
- **4.2. Reserved Name:** This License does not grant permission to use the trade names, service marks, or the Reserved Name ("nAG") of the Licensor, except as required for reasonable and customary use in describing the origin of unmodified copies of the Software.
  Modified versions of the Software must not use the Reserved Name in their name, title, or branding without the Licensor's prior written consent.
- **4.3. No Representation of Authorship:** The Licensee may not state or imply that the Licensor endorses, supports, or contributed to any use or modification the Licensee makes of the Software.

---

#### **5. DISCLAIMER OF WARRANTY & LIMITATION OF LIABILITY**

- **5.1. Disclaimer of Warranty:** THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
- **5.2. Limitation of Liability:** IN NO EVENT SHALL LICENSOR BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

#### **6. TERMINATION**

- **6.1. Automatic Termination:** Any breach of Sections 2 (License Conditions), 3 (Ethical Standards), or 4 (Notice & Trademark) automatically and immediately terminates all rights granted under this License without notice.
- **6.2. Effect of Termination:** Upon termination, Licensee must immediately cease all execution, testing, and use of the Software and destroy all copies (original or modified) in Licensee’s possession or control.
- **6.3. Patent Litigation:** If Licensee initiates patent litigation against Licensor (including cross-claims or counterclaims), all rights under this License terminate immediately.

---

#### **7. MISCELLANEOUS**

- **7.1. Entire Agreement:** This License represents the complete agreement between Licensor and Licensee regarding use, modification, and distribution of the Software.
- **7.2. Alternative Licensing:** For alternative licensing arrangements or commercial support, contact the Licensor directly.

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
