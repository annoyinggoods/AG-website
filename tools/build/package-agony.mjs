// Assembles the downloadable copy of AGony.
//
// AGony is built and packaged in its own repository, so the site cannot build
// the archive itself. This script reads the release archive that repository's
// dist/ folder holds (scripts/dist.sh wrote it) and stages it into downloads/.
// The version comes from that repository's crates/agony/Cargo.toml — the
// workspace root is a virtual manifest without a version — so the archive's
// name, the staged folder and the version the page quotes cannot drift apart,
// and the checksum is computed from the bytes that are actually staged.
//
// The project is expected at C:\Projects\AGony, and the path can be pointed
// somewhere else with the AGONY_PROJECT variable. When the project is not
// there, the script quotes the copy that is already staged in downloads/,
// because a build of the site must not depend on a sibling project being
// present and the staged copy is what the site serves. When neither the
// project nor a staged copy exists, the script says so and leaves the
// download alone. When the project is there but its dist/ holds no archive
// for the version its Cargo.toml names, the build fails, because the
// alternative is a page that sells a release that was never built.
// The staged-folder pattern accepts pre-release suffixes, because AGony's
// release candidates name folders like agony-1.0.0-rc.1.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");
const AGONY_PROJECT = process.env.AGONY_PROJECT || "C:\\Projects\\AGony";
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

// The version comes from the AGony shell crate, so the name of the archive
// and the version on the download page cannot drift apart.
function projectVersion() {
  const cargo = path.join(AGONY_PROJECT, "crates", "agony", "Cargo.toml");
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
    .filter((entry) => entry.isDirectory() && /^agony-\d+\.\d+\.\d+(?:[-.][\w.]+)?$/.test(entry.name))
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
    version: folders[0].slice("agony-".length),
    folder: folder,
    file: archive,
    path: path.join(folder, archive)
  };
}

/**
 * Stages the release archive the AGony repository built, and returns what
 * the download page needs to know about it.
 */
export function buildAgonyPackage() {
  const version = projectVersion();
  if (version === "") {
    const staged = stagedRelease();
    if (staged) {
      const facts = factsOf(staged.path);
      console.log("downloads/" + staged.file + ": " + String(facts.bytes) + " bytes (" + facts.humanSize + ") — staged copy, the AGony project was not found at " + AGONY_PROJECT + ".");
      return { version: staged.version, humanSize: facts.humanSize, bytes: facts.bytes, sha256: facts.sha256, file: staged.file };
    }
    console.log("AGony package note: the AGony project was not found at " + AGONY_PROJECT + " and downloads/ holds no staged AGony archive, so the AGony download was left alone.");
    return { version: "", humanSize: "", bytes: 0, sha256: "", file: "" };
  }

  const fileName = "agony-" + version + "-" + TRIPLE + ".tar.gz";
  const source = path.join(AGONY_PROJECT, "dist", fileName);
  if (!fs.existsSync(source)) {
    throw new Error(
      "the AGony release archive is missing: " + source +
      " — build the release in the AGony repository first (bash scripts/dist.sh), or point AGONY_PROJECT at the repository that holds it"
    );
  }

  const archiveFolder = path.join(DOWNLOAD_DIR, "agony-" + version);
  fs.mkdirSync(archiveFolder, { recursive: true });
  const archivePath = path.join(archiveFolder, fileName);
  fs.copyFileSync(source, archivePath);

  const facts = factsOf(archivePath);
  writeFileIfChanged(path.join(archiveFolder, "sha256-windows.txt"), facts.sha256 + " *" + fileName + "\n");

  console.log("downloads/" + fileName + ": " + String(facts.bytes) + " bytes (" + facts.humanSize + ").");
  return { version: version, humanSize: facts.humanSize, bytes: facts.bytes, sha256: facts.sha256, file: fileName };
}
