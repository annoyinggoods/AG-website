// Builds the downloadable copy of the drAGhts game.
//
// The archive is what a visitor unpacks and opens. It has to run from a
// file:// URL, because that is what "unzip it and double click" means to
// someone who wants to play the game without a website in front of it.
//
// The game is the same game the site serves. It is read from the site
// sources, so a fix in the game is a fix in both, and the download can
// never be a different game from the one on the page.
//
// The pieces of the archive are:
//   index.html                    the page, with a title and the game inside
//   draghts.js                    the game, as one plain script
//   draghts.css                   the stylesheet
//   assets/audio/*.mp3            the seven sounds
//   assets/draghts-logo.webp      the game logo on the computer's pieces
//   LICENSE.txt                   the licence of the game
//   README.txt                    how to play and where it came from
//
// There is no vendor step: drAGhts ships zero runtime dependencies, so
// there is nothing else to carry.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { writeZip } from "./zip.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const STAGE_DIR = path.join(ROOT, "standalone", "draghts");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");
const GAME_VERSION = "0.1.0";
const ARCHIVE_NAME = "draghts-" + GAME_VERSION;
const ZIP_PATH = path.join(DOWNLOAD_DIR, ARCHIVE_NAME, ARCHIVE_NAME + ".zip");

function fail(message) {
  console.error("DRAGHTS PACKAGE ERROR: " + message);
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
  const source = readFile(path.join(ROOT, "styles", "draghts.css"));
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = withoutComments
    // The tokens live on the game container on the site. On its own page
    // the whole document is the game, so they move to the root.
    .replace(/#draghts-app \{/, ":root {")
    .replace(/#draghts-app /g, "")
    .replace(/body:has\(#draghts-app\)/, "html");

  const pageRules = `
html,
body {
  margin: 0;
  min-height: 100%;
  background: #0c0c10;
  color: #f5f5f0;
  font-family: system-ui, sans-serif;
}

.app {
  min-height: 100vh;
  display: block;
  padding: 1rem;
  background: #0c0c10;
}

.draghts-title {
  margin: 0;
  font-size: clamp(2rem, 6vw, 3rem);
  letter-spacing: 0.04em;
  color: #f5f5f0;
}
`;

  return rules + pageRules;
}

const INDEX_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>drAGhts — chaotic checkers</title>
  <meta name="description" content="drAGhts is chaotic checkers with eight toggleable house rules: play a friend hot-seat or face the computer, in the browser or from a small offline archive.">
  <link rel="stylesheet" href="draghts.css">
</head>
<body>
  <main id="draghts-app" class="app" data-draghts data-show-title="true">
    <div class="draghts-main">
      <header>
        <h1 class="draghts-title">drAGhts</h1>
        <p>Chaotic checkers. House rules, brutal and bright.</p>
      </header>
      <div id="start-screen-container"></div>
      <div id="hud-container"></div>
      <div id="game-area">
        <div id="turn-banner" aria-live="assertive" aria-atomic="true" class="turn-banner"></div>
        <div id="picker-banner" aria-live="polite" class="picker-banner hidden"></div>
        <div id="coin-flip-result" aria-live="polite" class="coin-flip-result"></div>
        <div id="end-turn-wrapper" class="end-turn-wrapper hidden">
          <button id="end-turn-btn" type="button">End Turn</button>
        </div>
        <div id="board" aria-label="Checkers board"></div>
      </div>
      <div id="end-screen-container"></div>
      <div id="dashboard-container"></div>
    </div>
    <noscript>drAGhts needs JavaScript to run.</noscript>
  </main>
  <script src="draghts.js"></script>
</body>
</html>
`;

const README = `drAGhts — chaotic checkers with house rules
==============================================

How to play
-----------

Chaotic checkers. Eight rule variations you toggle before a game, then you
play hot-seat against another human or against the computer.

1. Pick a mode (hot-seat or computer), a preset (Classic, Chaos, Custom)
   and, for computer games, a difficulty and an aggression level.
2. Toggle the eight house rules, or keep the preset. Rules 6 and 7 need
   rule 5, and rules 3 and 4 exclude each other; the panel sorts that out
   with a toast.
3. White plays first and the colours are randomised every game. Tap or click
   a piece to select it, then tap or click a green square to move. Tap the
   piece again to deselect it.
4. Captures score: 1 point per pawn, 2 per king, with empowered bonuses and
   10 for wiping the board. Watch the streak chips: three kill turns in a
   row arm a frenzy turn, and every HUD element turns red while it lasts.

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

drAGhts is by Annoying Goods.

    https://annoyinggoods.com/products/drAGhts/

The source of the game is on the site, and the game on the playground is the
same game as this one.
`;

const LICENSE = `Copyright (c) 2026, Annoying Goods <marek@annoyinggoods.com>, <https://annoyinggoods.com>
Reserved Name: "drAGhts"

---

# OPEN SOURCE LICENSE WITH ETHICAL RESTRICTIONS

**Version 1.0**

---

### **TERMS AND CONDITIONS FOR USE, COPYING, MODIFICATION, AND DISTRIBUTION**

#### **1. DEFINITIONS**

- **1.1. "License"** means the terms and conditions set forth herein for the use, copying, modification, and distribution of the Software.
- **1.2. "Licensor"** means the copyright owner or entity authorized by the copyright owner granting this License.
- **1.3. "Licensee"** means any individual or entity exercising the rights granted by this License.
- **1.4. "Software"** means the copyrighted work, including source code, binaries, or documentation, authored by Licensor and made available under this License.
- **1.5. "Reserved Name"** means the name "drAGhts" and any variations, logos, or trade dress designated by the Licensor.
- **1.6. "Derivative Work"** means any work, in source or object form, that is based on or derived from the Software, including modifications, adaptations, extensions, or integrations into other software.
- **1.7. "Supply Chain"** means the sequence of processes involved in the production, operation, or distribution of goods or services by Licensee.
- **1.8. "Supply Chain Impacted Party"** means any person directly impacted by Licensee's Supply Chain.
- **1.9. "Duty of Care"** is defined as the legal requirement to act with the watchfulness, attention, caution, and prudence that a reasonable person in similar circumstances would exercise toward a Supply Chain Impacted Party.

---

#### **2. GRANT OF RIGHTS**

- **2.1. Permitted Uses:** Subject to the conditions in Sections 3 and 4, Licensor grants Licensee a worldwide, royalty-free, non-exclusive license to:
  - Use, run, and execute the Software for any purpose, including commercial purposes.
  - Copy, inspect, study, and modify the Software, and create Derivative Works.
  - Distribute, publish, sublicense, and/or sell copies of the Software or Derivative Works, standalone or integrated into other products or services, free of charge or for a fee.
- **2.2. No Field Restrictions:** This License imposes no restriction on the field of use, on commercial exploitation, or on the making of modifications. The only limits on the grant are the conditions in Sections 3 and 4.

---

#### **3. CONDITIONS**

- **3.1. Preservation of Notices:** Licensee must retain all original copyright, trademark, and attribution notices, and must include a copy of this License, in all copies or substantial portions of the Software and of Derivative Works that are distributed.
- **3.2. Notice of Changes:** Any Derivative Work distributed by Licensee must carry prominent statements detailing that the original Software was modified, along with the date of modification.
- **3.3. Reserved Name:** This License grants no right to use the Reserved Name or the Licensor's trade names, service marks, or logos to designate or promote Derivative Works, except as required for reasonable and customary use in describing the origin of the Software. Derivative Works must be renamed so that no confusion with the original Software or the Licensor is possible.
- **3.4. Ethical Compliance:** The rights granted in Section 2 are expressly contingent upon Licensee's continuous compliance with the Ethical Standards in Section 4.

---

#### **4. ETHICAL STANDARDS**

The permissions granted in Section 2 are expressly contingent upon Licensee's continuous compliance with the following ethical standards. The Software shall not be used by any person or entity for any systems, activities, or other uses that violate any Human Rights Laws. "Human Rights Laws" means any applicable laws, regulations, or rules (collectively, "Laws") that protect human, civil, labor, privacy, political, environmental, security, economic, due process, or similar rights; provided, however, that such Laws are consistent and not in conflict with Human Rights Principles (a dispute over the consistency or a conflict between Laws and Human Rights Principles shall be determined by arbitration as stated below). Where the Human Rights Laws of more than one jurisdiction are applicable or in conflict with respect to the use of the Software, the Human Rights Laws that are most protective of the individuals or groups harmed shall apply. In particular Licensee **SHALL NOT**, directly or indirectly:

- **4.1.** Infringe upon any person's right to life or security of person, engage in extrajudicial killings, or commit violence (*UN Universal Declaration of Human Rights, Art. 3*).
- **4.2.** Hold any person in slavery, servitude, or forced labor (*UN UDHR, Art. 4*).
- **4.3.** Torture or subject any person to cruel, inhuman or degrading treatment or punishment (*UN UDHR, Art. 5*).
- **4.4.** Discriminate on the basis of sex, gender, sexual orientation, race, ethnicity, nationality, religion, caste, age, or disability (*UN UDHR, Art. 7*).
- **4.5.** Arbitrarily interfere with any person's privacy, family, home, or correspondence (*UN UDHR, Art. 12*).
- **4.6.** Participate in mass surveillance programs, conduct military combat operations, or supply products/services directly to law enforcement agencies engaging in human rights abuses.
- **4.7.** Engage in mineral or fossil fuel exploration, extraction, or sales listed on the Carbon Underground 200 index.
- **4.8.** Commit ecocide or acts causing severe, widespread, or long-term damage to the natural environment.
- **4.9.** Interfere with workers' rights to associate and organize collectively (*ILO Convention No. 87*).

---

#### **5. DISCLAIMER OF WARRANTY & LIMITATION OF LIABILITY**

- **5.1. Disclaimer of Warranty:** THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
- **5.2. Limitation of Liability:** IN NO EVENT SHALL LICENSOR BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

#### **6. TERMINATION**

- **6.1. Automatic Termination:** Any breach of Section 3 (Conditions) or Section 4 (Ethical Standards) automatically and immediately terminates all rights granted under this License without notice.
- **6.2. Effect of Termination:** Upon termination, Licensee must immediately cease all distribution of the Software and Derivative Works. Rights of persons who received copies under this License before termination remain unaffected so long as they remain in compliance.

---

#### **7. MISCELLANEOUS**

- **7.1. Entire Agreement:** This License represents the complete agreement between Licensor and Licensee regarding the use, copying, modification, and distribution of the Software.
- **7.2. Contact:** For anything not covered by this License, contact the Licensor directly.
`;

export function buildDraghtsPackage() {
  const bundlePath = path.join(ROOT, "scripts", "draghts", "draghts.standalone.js");
  if (!fs.existsSync(bundlePath)) {
    fail("scripts/draghts/draghts.standalone.js is missing. Run the game bundler first.");
  }
  const audioDir = path.join(ROOT, "assets", "draghts", "audio");
  const audioNames = [
    "terror-scream.mp3",
    "illegal-move.mp3",
    "promoted-to-king.mp3",
    "bonus-turn.mp3",
    "frenzy-turn.mp3",
    "win-against-AI.mp3",
    "lose-against-AI.mp3",
  ];
  for (const name of audioNames) {
    if (!fs.existsSync(path.join(audioDir, name))) {
      fail("assets/draghts/audio/" + name + " is missing.");
    }
  }
  const logoPath = path.join(ROOT, "assets", "draghts", "draghts-logo.webp");
  if (!fs.existsSync(logoPath)) {
    fail("assets/draghts/draghts-logo.webp is missing.");
  }

  fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(STAGE_DIR, "assets", "audio"), { recursive: true });

  writeFile(path.join(STAGE_DIR, "index.html"), INDEX_HTML);
  writeFile(path.join(STAGE_DIR, "draghts.js"), readFile(bundlePath));
  writeFile(path.join(STAGE_DIR, "draghts.css"), standaloneCss());
  for (const name of audioNames) {
    const raw = fs.readFileSync(path.join(audioDir, name));
    fs.mkdirSync(path.join(STAGE_DIR, "assets", "audio"), { recursive: true });
    fs.writeFileSync(path.join(STAGE_DIR, "assets", "audio", name), raw);
  }
  fs.copyFileSync(logoPath, path.join(STAGE_DIR, "assets", "draghts-logo.webp"));
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
  const result = buildDraghtsPackage();
  console.log(
    "downloads/" + path.basename(result.path) + ": " + String(result.bytes) +
    " bytes, " + String(result.files) + " files, SHA256 " + result.sha256,
  );
}
