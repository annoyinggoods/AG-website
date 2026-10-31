// The image gate of the build.
//
// The machine has no picture encoder and the project ships no dependency, so
// this step never re-encodes a file. It checks what can be checked instead:
// every raster picture is a WebP, and every declared size in the sources is
// the real size of the file on disk.

import fs from "node:fs";
import path from "node:path";

const RASTER_FORMATS = new Set([
  ".webp",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".avif",
  ".tif",
  ".tiff",
  ".ico"
]);

// The one picture that stays a PNG. iOS reads the apple touch icon from the
// home screen and refuses a WebP there, so this file is the single exception
// to the WebP rule.
const PNG_EXCEPTIONS = new Set(["assets/icon-180.png"]);
const PNG_REASON = "iOS reads the apple touch icon as a PNG and refuses a WebP.";

// The folders the build reads content from. The drafts and the trash folders
// are never built, so they are never checked either.
const SOURCE_FOLDERS = [
  { folder: "content", extensions: [".md"], skipFolders: ["drafts", "trash"] },
  { folder: path.join("tools", "build", "content"), extensions: [".html"], skipFolders: [] },
  { folder: path.join("tools", "partials"), extensions: [".html"], skipFolders: [] }
];

const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
const HTML_IMAGE = /<img\b[^>]*>/gi;
const HTML_SOURCE = /\bsrc="([^"]*)"/i;
const HTML_WIDTH = /\bwidth="([^"]*)"/i;
const HTML_HEIGHT = /\bheight="([^"]*)"/i;
const DECLARED_SIZE = /^(\d+)x(\d+)$/;

export function checkImages(root) {
  const problems = [];
  collectFormatProblems(root, problems);
  collectReferenceProblems(root, problems);
  return problems;
}

function relative(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function listFiles(folder, extensions, skipFolders) {
  if (!fs.existsSync(folder)) {
    return [];
  }
  const found = [];
  const names = fs.readdirSync(folder, { withFileTypes: true });
  for (const entry of names) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      if (skipFolders.indexOf(entry.name) !== -1) {
        continue;
      }
      const inside = listFiles(full, extensions, skipFolders);
      for (const child of inside) {
        found.push(child);
      }
      continue;
    }
    if (extensions.indexOf(path.extname(entry.name).toLowerCase()) !== -1) {
      found.push(full);
    }
  }
  return found;
}

function collectFormatProblems(root, problems) {
  const assetsFolder = path.join(root, "assets");
  const pictures = listFiles(assetsFolder, Array.from(RASTER_FORMATS), []);
  for (const file of pictures) {
    const extension = path.extname(file).toLowerCase();
    if (extension === ".webp") {
      continue;
    }
    const name = relative(root, file);
    if (PNG_EXCEPTIONS.has(name)) {
      continue;
    }
    problems.push("The picture " + name + " is a " + extension.slice(1) + " file. Every picture has to be a WebP, and the apple touch icon is the only exception, because " + PNG_REASON);
  }
}

function collectReferenceProblems(root, problems) {
  for (const source of sourceFiles(root)) {
    const text = readText(source);
    if (path.extname(source).toLowerCase() === ".md") {
      collectMarkdownProblems(root, source, text, problems);
      continue;
    }
    collectHtmlProblems(root, source, text, problems);
  }
}

function sourceFiles(root) {
  const files = [];
  for (const folder of SOURCE_FOLDERS) {
    const found = listFiles(path.join(root, folder.folder), folder.extensions, folder.skipFolders);
    for (const file of found) {
      files.push(file);
    }
  }
  return files;
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    void err;
    return "";
  }
}

function collectMarkdownProblems(root, source, text, problems) {
  const pattern = new RegExp(MARKDOWN_IMAGE.source, "g");
  let match = pattern.exec(text);
  while (match !== null) {
    const declared = match[3] || "";
    if (declared) {
      checkDeclaredSize(root, source, match[2], declared, problems);
    }
    match = pattern.exec(text);
  }
}

function collectHtmlProblems(root, source, text, problems) {
  const pattern = new RegExp(HTML_IMAGE.source, "gi");
  let match = pattern.exec(text);
  while (match !== null) {
    checkImageTag(root, source, match[0], problems);
    match = pattern.exec(text);
  }
}

function checkImageTag(root, source, tag, problems) {
  const sourceMatch = HTML_SOURCE.exec(tag);
  if (!sourceMatch) {
    return;
  }
  const widthMatch = HTML_WIDTH.exec(tag);
  const heightMatch = HTML_HEIGHT.exec(tag);
  if (!widthMatch || !heightMatch) {
    return;
  }
  if (!isPixelSize(widthMatch[1]) || !isPixelSize(heightMatch[1])) {
    return;
  }
  const declared = widthMatch[1] + "x" + heightMatch[1];
  checkDeclaredSize(root, source, sourceMatch[1], declared, problems);
}

// A size in percent cannot be compared with the size of the file, so only the
// sizes in pixels are checked.
function isPixelSize(value) {
  return /^\d+$/.test(value);
}

function checkDeclaredSize(root, source, rawPath, declared, problems) {
  const file = resolveImage(root, source, rawPath);
  const name = relative(root, source);
  if (!file) {
    problems.push("The picture " + rawPath + " in " + name + " does not exist on disk.");
    return;
  }
  const real = readSize(file);
  if (!real) {
    return;
  }
  const parsed = DECLARED_SIZE.exec(declared);
  if (!parsed) {
    problems.push("The picture " + rawPath + " in " + name + " declares the size " + declared + ", which is not a width and a height.");
    return;
  }
  const width = Number(parsed[1]);
  const height = Number(parsed[2]);
  if (width === real.width && height === real.height) {
    return;
  }
  problems.push("The picture " + rawPath + " in " + name + " declares " + width + "x" + height + ", but the file is " + real.width + "x" + real.height + ".");
}

function resolveImage(root, source, rawPath) {
  const clean = String(rawPath).split("#")[0].split("?")[0];
  if (clean.length === 0) {
    return "";
  }
  const candidates = [];
  if (clean.startsWith("/")) {
    candidates.push(path.join(root, clean.replace(/^\/+/, "")));
  } else {
    candidates.push(path.resolve(path.dirname(source), clean));
    candidates.push(path.join(root, clean));
  }
  for (const candidate of candidates) {
    if (!insideRoot(root, candidate)) {
      continue;
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return "";
}

function insideRoot(root, file) {
  const relativePath = path.relative(root, file);
  return relativePath.length > 0 && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function readSize(file) {
  const buffer = fs.readFileSync(file);
  const extension = path.extname(file).toLowerCase();
  if (extension === ".webp") {
    return readWebpSize(buffer);
  }
  if (extension === ".png") {
    return readPngSize(buffer);
  }
  return null;
}

function readWebpSize(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const tag = buffer.toString("ascii", offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (tag === "VP8 ") {
      return readVp8Size(buffer, payload);
    }
    if (tag === "VP8L") {
      return readVp8lSize(buffer, payload);
    }
    if (tag === "VP8X") {
      return readVp8xSize(buffer, payload);
    }
    offset = payload + length + (length % 2);
  }
  return null;
}

// The lossy picture: three bytes of frame tag, three bytes of sync code, then
// the width and the height as fourteen bits each.
function readVp8Size(buffer, payload) {
  if (payload + 10 > buffer.length) {
    return null;
  }
  const width = buffer.readUInt16LE(payload + 6) & 0x3fff;
  const height = buffer.readUInt16LE(payload + 8) & 0x3fff;
  return { width: width, height: height };
}

// The lossless picture: one signature byte, then the width and the height as
// fourteen bits each inside one little endian word.
function readVp8lSize(buffer, payload) {
  if (payload + 5 > buffer.length) {
    return null;
  }
  const bits = buffer.readUInt32LE(payload + 1);
  return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
}

// The extended picture: four bytes of flags, then the canvas size as three
// bytes each.
function readVp8xSize(buffer, payload) {
  if (payload + 10 > buffer.length) {
    return null;
  }
  const width = buffer[payload + 4] | (buffer[payload + 5] << 8) | (buffer[payload + 6] << 16);
  const height = buffer[payload + 7] | (buffer[payload + 8] << 8) | (buffer[payload + 9] << 16);
  return { width: width + 1, height: height + 1 };
}

// The PNG: the size sits in the IHDR chunk, which is always the first one.
function readPngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 12, 16) !== "IHDR") {
    return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
