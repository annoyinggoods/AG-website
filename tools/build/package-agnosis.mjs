// Assembles the downloadable copy of AGnosis.
//
// AGnosis is built in its own project, so the site cannot build the binary
// itself. This script reads the release build of that project, stages it the
// way the release pipeline of the project stages it, and writes the portable
// zip into downloads/. The archive is deterministic, so the checksum quoted
// on the download page holds for every build of the same binary.
//
// The project is expected at C:\\Projects\\AGnosis, and the path can be
// pointed somewhere else with the AGNOSIS_PROJECT variable. When the project
// is not there, the script says so and leaves the download alone, because a
// build of the site must not depend on a sibling project being present.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { writeZip } from "./zip.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");
const AGNOSIS_PROJECT = process.env.AGNOSIS_PROJECT || "C:\\Projects\\AGnosis";
const BINARY_NAME = "agnosis.exe";
const ARCHIVE_ROOT = "agnosis";
// The Windows installer is built by the project's own packaging script
// (packaging/windows/build-installer.ps1 -> ISCC). When it is present it
// travels beside the portable zip; when it is not, the download page is
// told so and the zip carries the download alone.
const INSTALLER_REL = path.join("packaging", "windows", "dist", "agnosis-setup.exe");
const INSTALLER_NAME = "agnosis-setup.exe";

const LICENSE_TEXT = `Copyright (c) 2026, Annoying Goods <marek@annoyinggoods.com>, <https://annoyinggoods.com>
Reserved Name: "AGnosis"

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
- **1.6. "Reserved Name"** means the name "AGnosis" and any variations or logos designated by the Licensor.
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
- **4.2. Reserved Name:** This License does not grant permission to use the trade names, service marks, or the Reserved Name ("AGnosis") of the Licensor, except as required for reasonable and customary use in describing the origin of unmodified copies of the Software.
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
`;

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeFileIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && readFile(filePath) === content) {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

// The version comes from the project of the ducks, so the name of the archive
// and the version on the download page cannot drift apart.
function projectVersion() {
  const cargo = path.join(AGNOSIS_PROJECT, "Cargo.toml");
  if (!fs.existsSync(cargo)) {
    return "";
  }
  const match = /^version\s*=\s*"([^"]+)"/m.exec(readFile(cargo));
  return match ? String(match[1]) : "";
}

function binaryPath() {
  const candidates = [
    path.join(AGNOSIS_PROJECT, "target", "release", BINARY_NAME),
    path.join(AGNOSIS_PROJECT, "built", BINARY_NAME)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "";
}

function humanSize(bytes) {
  const megabytes = bytes / (1024 * 1024);
  return megabytes.toFixed(1) + " MB";
}

/**
 * Builds the archive of the release binary and stages the Windows installer
 * beside it, returning what the download page needs to know about both.
 */
export function buildAgnosisPackage() {
  const version = projectVersion();
  const binary = binaryPath();
  if (version === "" || binary === "") {
    console.log("Agnosis package note: the AGnosis project was not found at " + AGNOSIS_PROJECT + ", so the AGnosis download was left alone.");
    return {
      version: version,
      humanSize: "",
      bytes: 0,
      sha256: "",
      file: "",
      setupHumanSize: "",
      setupSha256: ""
    };
  }

  const stageDir = path.join(ROOT, "standalone", "agnosis", ARCHIVE_ROOT);
  fs.mkdirSync(stageDir, { recursive: true });
  fs.copyFileSync(binary, path.join(stageDir, BINARY_NAME));
  fs.writeFileSync(path.join(stageDir, "LICENSE.txt"), LICENSE_TEXT, "utf8");

  const archiveName = "agnosis-" + version + "-windows-x64.zip";
  const archiveFolder = path.join(DOWNLOAD_DIR, "agnosis-" + version);
  const archivePath = path.join(archiveFolder, archiveName);
  fs.mkdirSync(archiveFolder, { recursive: true });
  writeZip(stageDir, archivePath, ARCHIVE_ROOT);

  const bytes = fs.statSync(archivePath).size;
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex");

  const installerSource = path.join(AGNOSIS_PROJECT, INSTALLER_REL);
  let setupSha256 = "";
  let setupHumanSize = "";
  if (fs.existsSync(installerSource)) {
    const setupPath = path.join(archiveFolder, INSTALLER_NAME);
    fs.copyFileSync(installerSource, setupPath);
    const setupBytes = fs.statSync(setupPath).size;
    setupSha256 = crypto.createHash("sha256").update(fs.readFileSync(setupPath)).digest("hex");
    setupHumanSize = humanSize(setupBytes);
    console.log("downloads/" + INSTALLER_NAME + ": " + String(setupBytes) + " bytes (" + setupHumanSize + ").");
  } else {
    console.log("Agnosis package note: no installer at " + installerSource + ", so only the portable zip was staged.");
  }

  writeFileIfChanged(
    path.join(archiveFolder, "sha256.txt"),
    sha256 + "  " + archiveName + "\n" + (setupSha256 ? setupSha256 + "  " + INSTALLER_NAME + "\n" : "")
  );

  console.log("downloads/" + archiveName + ": " + String(bytes) + " bytes (" + humanSize(bytes) + ").");
  return {
    version: version,
    humanSize: humanSize(bytes),
    bytes: bytes,
    sha256: sha256,
    file: archiveName,
    setupHumanSize: setupHumanSize,
    setupSha256: setupSha256
  };
}
