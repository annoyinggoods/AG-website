// Assembles the downloadable copy of AGrrr!.
//
// AGrrr! is built and packaged in its own repository (the Tauri build), so the
// site cannot build the installer itself. This script reads the NSIS setup
// that repository's bundle folder holds, stages it into downloads/, and
// returns what the download page needs to know about it. The version comes
// from that repository's src-tauri/tauri.conf.json, so the source's name, the
// staged folder and the version the page quotes cannot drift apart, and the
// checksum is computed from the bytes that are actually staged. The staged
// folder's sha256.txt is written here too, so the file beside the download
// always quotes the bytes beside it.
//
// The project is expected at C:\Projects\AG-on-Y, and the path can be pointed
// somewhere else with the AGRRR_PROJECT variable. When the project is not
// there, the script quotes the copy that is already staged in downloads/,
// because a build of the site must not depend on a sibling project being
// present and the staged copy is what the site serves. When neither the
// project nor a staged copy exists, the script says so and leaves the
// download alone. When the project is there but its bundle folder holds no
// setup for the version its config names, the build fails, because the
// alternative is a page that sells a release that was never built.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");
const AGRRR_PROJECT = process.env.AGRRR_PROJECT || "C:\\Projects\\AG-on-Y";

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

// The version comes from the AGrrr! workspace, so the name of the setup the
// build produced and the version on the download page cannot drift apart.
function projectVersion() {
  const config = path.join(AGRRR_PROJECT, "src-tauri", "tauri.conf.json");
  if (!fs.existsSync(config)) {
    return "";
  }
  const match = /"version"\s*:\s*"([^"]+)"/.exec(readFile(config));
  return match ? String(match[1]) : "";
}

function humanSize(bytes) {
  const megabytes = bytes / (1024 * 1024);
  return megabytes.toFixed(1) + " MB";
}

// The download page quotes the byte count with thousand separators, in the
// shape the page has carried since 0.1.0.
function groupedBytes(bytes) {
  return String(bytes).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function factsOf(setupPath) {
  const bytes = fs.statSync(setupPath).size;
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(setupPath)).digest("hex");
  const mebibytes = (bytes / (1024 * 1024)).toFixed(2);
  return {
    bytes: bytes,
    humanSize: humanSize(bytes),
    groupedBytes: groupedBytes(bytes),
    mebibytes: mebibytes,
    sha256: sha256
  };
}

// The release the repository last shipped, still sitting in downloads/. The
// version lives inside the staged file's name, because the staged folder is
// named after the version but other products' folders live beside it.
function stagedRelease() {
  const found = [];
  const folders = fs.readdirSync(DOWNLOAD_DIR, { withFileTypes: true });
  for (const entry of folders) {
    if (!entry.isDirectory()) {
      continue;
    }
    const folder = path.join(DOWNLOAD_DIR, entry.name);
    const name = fs.readdirSync(folder).find((file) => /^AGRr!-Setup-\d+\.\d+\.\d+\.exe$/.test(file));
    if (name) {
      found.push({
        version: name.slice("AGRr!-Setup-".length, -".exe".length),
        folder: folder,
        file: name,
        path: path.join(folder, name)
      });
    }
  }
  if (found.length !== 1) {
    return null;
  }
  return found[0];
}

/**
 * Stages the NSIS setup the AGrrr! repository built, and returns what the
 * download page needs to know about it.
 */
export function buildAgrrrPackage() {
  const version = projectVersion();
  if (version === "") {
    const staged = stagedRelease();
    if (staged) {
      const facts = factsOf(staged.path);
      console.log("downloads/" + staged.folder.split(path.sep).pop() + "/" + staged.file + ": " + String(facts.bytes) + " bytes (" + facts.humanSize + ") — staged copy, the AGrrr! project was not found at " + AGRRR_PROJECT + ".");
      return {
        version: staged.version,
        humanSize: facts.humanSize,
        bytes: facts.bytes,
        groupedBytes: facts.groupedBytes,
        sha256: facts.sha256,
        file: staged.file
      };
    }
    console.log("AGrrr! package note: the AGrrr! project was not found at " + AGRRR_PROJECT + " and downloads/ holds no staged AGrrr! setup, so the AGrrr! download was left alone.");
    return { version: "", humanSize: "", bytes: 0, groupedBytes: "", sha256: "", file: "" };
  }

  const sourceName = "AGRr!_" + version + "_x64-setup.exe";
  const source = path.join(AGRRR_PROJECT, "src-tauri", "target", "release", "bundle", "nsis", sourceName);
  if (!fs.existsSync(source)) {
    throw new Error(
      "the AGrrr! setup is missing: " + source +
      " — build the release in the AGrrr! repository first (npm run app:build), or point AGRRR_PROJECT at the repository that holds it"
    );
  }

  const fileName = "AGRr!-Setup-" + version + ".exe";
  const setupFolder = path.join(DOWNLOAD_DIR, version);
  fs.mkdirSync(setupFolder, { recursive: true });
  const setupPath = path.join(setupFolder, fileName);
  fs.copyFileSync(source, setupPath);

  const facts = factsOf(setupPath);
  const note =
    fileName + "\n" +
    "SHA256: " + facts.sha256 + "\n" +
    "Size: " + facts.groupedBytes + " bytes (" + facts.mebibytes + " MiB)\n" +
    "Windows x64, staged from the AGrrr! repository by the site build.\n";
  writeFileIfChanged(path.join(setupFolder, "sha256.txt"), note);

  console.log("downloads/" + version + "/" + fileName + ": " + String(facts.bytes) + " bytes (" + facts.humanSize + ").");
  return {
    version: version,
    humanSize: facts.humanSize,
    bytes: facts.bytes,
    groupedBytes: facts.groupedBytes,
    sha256: facts.sha256,
    file: fileName
  };
}
