// Writes a zip archive with the standard library only.
//
// The downloadable copy of the game is a zip, and the build has to run on
// Linux, on Windows and on a developer's machine without a helper program
// and without a dependency, so the archive is written here.
//
// The format is the plain one: a local file header for every file, the file
// data, then a central directory and an end of record. The files are stored
// without compression, because the game is already a bundle of plain text and
// the archive is small. A zip that stores is a zip that any tool can read.
//
// The archive is deterministic: the same folder always zips to the same
// bytes, so the checksum quoted on the download page holds for every build.
// The entries carry a fixed stamp instead of the file times, the entries
// are sorted by name instead of the folder's read order, and an unchanged
// archive is left on disk untouched.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;

const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

/**
 * The DOS date and time a file is given in a zip. The zip format counts from
 * 1980, and the year is stored as the number of years since then. The parts
 * are read in UTC, so a build gives the same stamp in every time zone.
 */
function dosDateTime(date) {
  const year = Math.max(1980, date.getUTCFullYear());
  const time =
    (date.getUTCHours() << 11) |
    (date.getUTCMinutes() << 5) |
    (Math.floor(date.getUTCSeconds() / 2) & 0x1f);
  const day = ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { time: time & 0xffff, date: day & 0xffff };
}

/**
 * The stamp every entry in every archive carries: midnight at the start of
 * 1980, the oldest moment the format can store. A stamp from the clock would
 * make the bytes of the archive different on every build, and the download
 * page quotes the checksum of the archive, so the bytes must not move.
 */
const FIXED_STAMP = dosDateTime(new Date(Date.UTC(1980, 0, 1, 0, 0, 0)));

/**
 * The CRC-32 of a buffer, which the zip format stores so a reader can check
 * that the data arrived intact.
 */
function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * The files of a folder, as the paths they carry inside the archive.
 *
 * The paths use a forward slash, because that is what the zip format wants
 * on every platform.
 */
function collectFiles(directory, prefix) {
  const files = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const nested of collectFiles(full, prefix + entry.name + "/")) {
        files.push(nested);
      }
    } else {
      files.push({
        name: prefix + entry.name,
        source: full,
      });
    }
  }
  return files;
}

/**
 * Writes a zip archive of a folder.
 *
 * The folder name becomes the folder inside the archive, so unzipping gives
 * one folder with the game in it, rather than loose files on the desktop.
 */
export function writeZip(sourceDirectory, outputPath, archiveRootName) {
  const files = collectFiles(sourceDirectory, archiveRootName + "/");
  if (files.length === 0) {
    throw new Error("The folder to zip is empty: " + sourceDirectory);
  }
  // The folder read order is whatever the filesystem hands back, so the
  // entries are sorted by their name in the archive to keep the bytes stable.
  files.sort(function (a, b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf8");
    const raw = fs.readFileSync(file.source);
    const compressed = zlib.deflateRawSync(raw, { level: 9 });
    // The archive stores the file when the compression did not help, because
    // a stored file is always readable.
    const useDeflate = compressed.length < raw.length;
    const data = useDeflate ? compressed : raw;
    const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;
    const checksum = crc32(raw);
    const stamp = FIXED_STAMP;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(LOCAL_HEADER, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(stamp.time, 10);
    localHeader.writeUInt16LE(stamp.date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(CENTRAL_HEADER, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(stamp.time, 12);
    centralHeader.writeUInt16LE(stamp.date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  const archive = Buffer.concat([...localParts, central, end]);

  // The archive is written only when its bytes change. A build can run while
  // somebody else is downloading or checking the file, and replacing an
  // identical archive would hand that reader a half written zip.
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath) : null;
  if (existing === null || existing.equals(archive) === false) {
    fs.writeFileSync(outputPath, archive);
  }
  return { files: files.length, bytes: archive.length };
}
