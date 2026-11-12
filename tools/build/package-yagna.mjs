// Assembles the downloadable copy of yAGna.
//
// yAGna is built and packaged in its own repository, so the site cannot build
// the archive itself. This script reads the release archive that repository's
// dist/ folder holds, stages it into downloads/, and returns what the download
// page needs to know about it. The version comes from that repository's
// Cargo.toml, so the archive's name, the staged folder and the version the
// page quotes cannot drift apart, and the checksum is computed from the bytes
// that are actually staged.
//
// The project is expected at C:\Projects\yAGna, and the path can be pointed
// somewhere else with the YAGNA_PROJECT variable. When the project is not
// there, the script quotes the copy that is already staged in downloads/,
// because a build of the site must not depend on a sibling project being
// present and the staged copy is what the site serves. When neither the
// project nor a staged copy exists, the script says so and leaves the
// download alone. When the project is there but its dist/ holds no archive
// for the version its Cargo.toml names, the build fails, because the
// alternative is a page that sells a release that was never built.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");
const YAGNA_PROJECT = process.env.YAGNA_PROJECT || "C:\\Projects\\yAGna";
const TRIPLE = "x86_64-pc-windows-msvc";

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

// The version comes from the yAGna workspace, so the name of the archive
// and the version on the download page cannot drift apart.
function projectVersion() {
  const cargo = path.join(YAGNA_PROJECT, "Cargo.toml");
  if (!fs.existsSync(cargo)) {
    return "";
  }
  const match = /^version\s*=\s*"([^"]+)"/m.exec(readFile(cargo));
  return match ? String(match[1]) : "";
}

function humanSize(bytes) {
  const megabytes = bytes / (1024 * 1024);
  return megabytes.toFixed(1) + " MB";
}

function factsOf(archivePath) {
  const bytes = fs.statSync(archivePath).size;
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex");
  return { bytes: bytes, humanSize: humanSize(bytes), sha256: sha256 };
}

// The release the repository last shipped, still sitting in downloads/.
function stagedRelease() {
  const folders = fs
    .readdirSync(DOWNLOAD_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^yagna-\d+\.\d+\.\d+$/.test(entry.name))
    .map((entry) => entry.name);
  if (folders.length !== 1) {
    return null;
  }
  const folder = path.join(DOWNLOAD_DIR, folders[0]);
  const archive = fs.readdirSync(folder).find((name) => name.endsWith(".tar.gz"));
  if (!archive) {
    return null;
  }
  return {
    version: folders[0].slice("yagna-".length),
    folder: folder,
    file: archive,
    path: path.join(folder, archive)
  };
}

/**
 * Stages the release archive the yAGna repository built, and returns what
 * the download page needs to know about it.
 */
export function buildYagnaPackage() {
  const version = projectVersion();
  if (version === "") {
    const staged = stagedRelease();
    if (staged) {
      const facts = factsOf(staged.path);
      console.log("downloads/" + staged.file + ": " + String(facts.bytes) + " bytes (" + facts.humanSize + ") — staged copy, the yAGna project was not found at " + YAGNA_PROJECT + ".");
      return { version: staged.version, humanSize: facts.humanSize, bytes: facts.bytes, sha256: facts.sha256, file: staged.file };
    }
    console.log("yAGna package note: the yAGna project was not found at " + YAGNA_PROJECT + " and downloads/ holds no staged yAGna archive, so the yAGna download was left alone.");
    return { version: "", humanSize: "", bytes: 0, sha256: "", file: "" };
  }

  const fileName = "yagna-" + version + "-" + TRIPLE + ".tar.gz";
  const source = path.join(YAGNA_PROJECT, "dist", fileName);
  if (!fs.existsSync(source)) {
    throw new Error(
      "the yAGna release archive is missing: " + source +
      " — build the release in the yAGna repository first (cargo build --release and package its dist/), or point YAGNA_PROJECT at the repository that holds it"
    );
  }

  const archiveFolder = path.join(DOWNLOAD_DIR, "yagna-" + version);
  fs.mkdirSync(archiveFolder, { recursive: true });
  const archivePath = path.join(archiveFolder, fileName);
  fs.copyFileSync(source, archivePath);

  const facts = factsOf(archivePath);
  writeFileIfChanged(path.join(archiveFolder, "sha256-windows.txt"), facts.sha256 + " *" + fileName + "\n");

  console.log("downloads/" + fileName + ": " + String(facts.bytes) + " bytes (" + facts.humanSize + ").");
  return { version: version, humanSize: facts.humanSize, bytes: facts.bytes, sha256: facts.sha256, file: fileName };
}
