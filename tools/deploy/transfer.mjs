// The password path of the deploy helper.
//
// IONOS password logins cannot be driven through the OpenSSH ssh and scp
// clients, because those clients have no way to receive a password without a
// console. This script talks SFTP in process with the ssh2 library instead, so
// the password only has to travel in the environment of this process.
//
// Modes: check (open, report the folder, transfer nothing), upload (mirror the
// contents of dist/ into the folder), fix (repair the remote permissions).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ssh2 from "ssh2";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const DIST = path.join(ROOT, "dist");

// The snapshot folder holds the local copies of past releases and must never
// reach the server.
const SNAPSHOT_NAME = "snapshots";

const DIR_MODE = 0o755;
const FILE_MODE = 0o644;

function parseArgs(argv) {
  const out = {};
  let index = 0;
  while (index < argv.length) {
    const token = argv[index];
    if (token.indexOf("--") === 0) {
      const key = token.slice(2);
      const next = argv[index + 1];
      const value = next !== undefined && next.indexOf("--") !== 0 ? next : "";
      out[key] = value;
      index = index + (value === "" ? 1 : 2);
    } else {
      index++;
    }
  }
  return out;
}

function say(message) {
  console.log("==> " + message);
}

function fail(message) {
  console.log("FAILED: " + message);
  process.exit(1);
}

function settingsFrom(args) {
  const password = process.env.AG_DEPLOY_PASSWORD || "";
  const settings = {
    mode: String(args.mode || "check"),
    host: String(args.host || "").trim(),
    user: String(args.user || "").trim(),
    password: String(password),
    port: Number(args.port || 22) || 22,
    folder: String(args.folder || "/home/www/annoyinggoods").trim() || "/home/www/annoyinggoods"
  };
  if (settings.host === "" || settings.user === "") {
    fail("The host address and the user name are required.");
  }
  if (settings.password === "") {
    fail("The password is required. Set AG_DEPLOY_PASSWORD before the run.");
  }
  return settings;
}

// The friendly message the panel shows when the login or the host is wrong.
function connectMessage(settings, error) {
  const message = String((error && error.message) || error);
  if (/authentication|All defined authentication|Cannot continue/.test(message)) {
    return "Wrong user name or password for " + settings.user + "@" + settings.host + ".";
  }
  if (/timed out|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(message)) {
    return "Could not reach " + settings.host + ":" + settings.port + ". Check the host address, the port and the network.";
  }
  return message;
}

function connect(settings) {
  const conn = new ssh2.Client();
  const config = {
    host: settings.host,
    port: settings.port,
    username: settings.user,
    password: settings.password,
    readyTimeout: 20000,
    keepaliveInterval: 10000
  };
  return new Promise(function (resolve, reject) {
    conn.on("ready", function () {
      conn.sftp(function (err, sftp) {
        if (err) {
          conn.end();
          reject(new Error("The SFTP session failed: " + err.message));
          return;
        }
        resolve({ conn: conn, sftp: sftp });
      });
    });
    conn.on("error", function (err) {
      reject(new Error(connectMessage(settings, err)));
    });
    conn.connect(config);
  });
}

function join(base, name) {
  if (base === "/") {
    return "/" + name;
  }
  return base + "/" + name;
}

function realpath(sftp, target) {
  return new Promise(function (resolve) {
    sftp.realpath(target, function (err, resolved) {
      resolve(err ? "" : resolved);
    });
  });
}

// The IONOS domain serves the /annoyinggoods folder, and an SFTP session may be
// chrooted so the absolute /home/www path is not visible. The absolute folder
// is tried first, then the same folder without its /home/www prefix.
async function resolveBase(sftp, folder) {
  const direct = await realpath(sftp, folder);
  if (direct !== "") {
    return direct;
  }
  const relative = folder.replace(/^\/home\/www/, "");
  if (relative !== "" && relative !== folder) {
    const fallback = await realpath(sftp, relative);
    if (fallback !== "") {
      return fallback;
    }
  }
  fail("The remote folder " + folder + " does not exist, or this account cannot see it.");
}

function listLocalFiles(dir, rel, isTop) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isTop && entry.name === SNAPSHOT_NAME) {
      continue;
    }
    const relName = rel === "" ? entry.name : rel + "/" + entry.name;
    if (entry.isDirectory()) {
      found.push(...listLocalFiles(path.join(dir, entry.name), relName, false));
    } else if (entry.isFile()) {
      found.push(relName);
    }
  }
  return found;
}

function ensureDir(sftp, base, relDir, made) {
  if (relDir === "" || made.has(relDir)) {
    return Promise.resolve();
  }
  const cut = relDir.lastIndexOf("/");
  const parent = cut === -1 ? "" : relDir.slice(0, cut);
  return ensureDir(sftp, base, parent, made).then(function () {
    return new Promise(function (resolve) {
      // sftp.mkdir has no "create if missing", so a failure here is ignored and
      // a real problem surfaces on the upload of the file inside the folder.
      sftp.mkdir(join(base, relDir), function () {
        made.add(relDir);
        resolve();
      });
    });
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise(function (resolve, reject) {
    sftp.fastPut(localPath, remotePath, function (err) {
      if (err) {
        reject(new Error("The upload of " + path.basename(localPath) + " failed: " + err.message));
        return;
      }
      resolve();
    });
  });
}

// IONOS folders created through the file manager can end up owner-only (700),
// and the web server then answers the CSS, the images and the scripts with 403.
// Every upload finishes by making folders 755 and files 644.
function setMode(sftp, target, mode) {
  return new Promise(function (resolve) {
    sftp.setstat(target, { mode: mode }, function (err) {
      resolve(!err);
    });
  });
}

function readdir(sftp, target) {
  return new Promise(function (resolve, reject) {
    sftp.readdir(target, function (err, list) {
      if (err) {
        reject(err);
        return;
      }
      resolve(list);
    });
  });
}

async function normalizeRemotePerms(sftp, base) {
  let dirs = 0;
  let files = 0;
  let failed = 0;
  async function walk(dir, depth) {
    if (depth > 20) {
      return;
    }
    let entries;
    try {
      entries = await readdir(sftp, dir);
    } catch (err) {
      failed++;
      return;
    }
    for (const entry of entries) {
      const target = join(dir, entry.filename);
      if (entry.attrs.isDirectory()) {
        if (await setMode(sftp, target, DIR_MODE)) {
          dirs++;
        } else {
          failed++;
        }
        await walk(target, depth + 1);
      } else if (entry.attrs.isFile()) {
        if (await setMode(sftp, target, FILE_MODE)) {
          files++;
        } else {
          failed++;
        }
      }
    }
  }
  await walk(base, 0);
  return { dirs: dirs, files: files, failed: failed };
}

async function runCheck(settings) {
  say("Opening a session to " + settings.user + "@" + settings.host + " on port " + String(settings.port) + ".");
  const client = await connect(settings);
  try {
    const base = await resolveBase(client.sftp, settings.folder);
    say("The connection works.");
    say("Target folder: " + base);
  } finally {
    client.conn.end();
  }
}

async function runUpload(settings) {
  if (!fs.existsSync(DIST)) {
    fail("The deployable folder " + DIST + " does not exist.");
  }
  const files = listLocalFiles(DIST, "", true);
  say("Uploading " + String(files.length) + " files to " + settings.folder + ".");
  const client = await connect(settings);
  try {
    const base = await resolveBase(client.sftp, settings.folder);
    say("Remote folder: " + base);
    const made = new Set();
    let done = 0;
    for (const rel of files) {
      const cut = rel.lastIndexOf("/");
      const relDir = cut === -1 ? "" : rel.slice(0, cut);
      await ensureDir(client.sftp, base, relDir, made);
      await uploadFile(client.sftp, path.join(DIST, rel), join(base, rel));
      done++;
      if (done % 25 === 0 || done === files.length) {
        say(String(done) + "/" + String(files.length));
      }
    }
    say("The release is uploaded.");
    const perms = await normalizeRemotePerms(client.sftp, base);
    say("Permissions set: " + String(perms.dirs) + " folders 755, " + String(perms.files) + " files 644" + (perms.failed ? ", " + String(perms.failed) + " failed" : "") + ".");
  } finally {
    client.conn.end();
  }
}

async function runFix(settings) {
  say("Repairing the permissions under " + settings.folder + ".");
  const client = await connect(settings);
  try {
    const base = await resolveBase(client.sftp, settings.folder);
    const perms = await normalizeRemotePerms(client.sftp, base);
    say("Permissions set: " + String(perms.dirs) + " folders 755, " + String(perms.files) + " files 644" + (perms.failed ? ", " + String(perms.failed) + " failed" : "") + ".");
  } finally {
    client.conn.end();
  }
}

async function main() {
  const settings = settingsFrom(parseArgs(process.argv.slice(2)));
  if (settings.mode === "check") {
    await runCheck(settings);
    return;
  }
  if (settings.mode === "upload") {
    await runUpload(settings);
    return;
  }
  if (settings.mode === "fix") {
    await runFix(settings);
    return;
  }
  fail("Unknown mode \"" + settings.mode + "\". Use check, upload or fix.");
}

main().catch(function (err) {
  fail(String((err && err.message) || err));
});
