// Builds the nAG game into one module file.
//
// The game is not part of the site bundle. The site bundle is one namespace,
// so the game would have to be renamed into it symbol by symbol. Instead the
// game keeps its own module graph and gets its own bundle, which is one
// request instead of twenty six.
//
// Each module is wrapped in a function that returns its exported names, and
// the modules are wired together with those names. The wrapping is what
// keeps the modules apart: a symbol in one module can never collide with a
// symbol in another, so the game does not need a prefix on every name.
//
// The result is written as an ES module, because the content security
// policy only allows scripts from the same origin and the game is loaded
// with a script tag of the module kind.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const GAME_DIR = path.join(ROOT, "scripts", "nag");
const ENTRY = "main.js";
const OUTPUT = path.join(GAME_DIR, "nag.bundle.js");

function fail(message) {
  console.error("NAG BUNDLE ERROR: " + message);
  process.exit(1);
}

/**
 * Every module of the game, keyed by the path the other modules use to reach
 * it.
 */
function collectModules(directory, prefix) {
  const modules = new Map();
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name;
    if (entry.isDirectory()) {
      const nested = collectModules(path.join(directory, name), prefix + name + "/");
      for (const [key, value] of nested) {
        modules.set(key, value);
      }
    } else if (name.endsWith(".js")) {
      modules.set(prefix + name, fs.readFileSync(path.join(directory, name), "utf8"));
    }
  }
  return modules;
}

/**
 * The import specifiers of a module, both the static ones and the dynamic
 * ones, because the dynamic confetti import has to survive the bundle.
 */
function importsOf(source) {
  const found = [];
  const staticRe = /^\s*import\s+(?:[^"';]*?from\s+)?["']([^"']+)["']\s*;?\s*$/gm;
  let match = staticRe.exec(source);
  while (match !== null) {
    found.push(match[1]);
    match = staticRe.exec(source);
  }
  const dynamicRe = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
  match = dynamicRe.exec(source);
  while (match !== null) {
    found.push(match[1]);
    match = dynamicRe.exec(source);
  }
  return found;
}

/**
 * The names a module imports and the names it exports.
 */
function parseModule(source) {
  const imported = [];
  const importRe = /^\s*import\s+(?:type\s+)?\{([^}]*)\}\s*from\s+["']([^"']+)["']\s*;?\s*$/gm;
  let match = importRe.exec(source);
  while (match !== null) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (trimmed === "") {
        continue;
      }
      const alias = trimmed.split(/\s+as\s+/);
      imported.push({ local: alias[0].trim(), from: match[2] });
    }
    match = importRe.exec(source);
  }

  const exported = [];
  const declRe = /^\s*export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  match = declRe.exec(source);
  while (match !== null) {
    exported.push(match[1]);
    match = declRe.exec(source);
  }
  const braceRe = /^\s*export\s*\{([^}]*)\}\s*;?\s*$/gm;
  match = braceRe.exec(source);
  while (match !== null) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (trimmed === "") {
        continue;
      }
      const alias = trimmed.split(/\s+as\s+/);
      exported.push(alias[alias.length - 1].trim());
    }
    match = braceRe.exec(source);
  }

  return { imported, exported };
}

/**
 * Turns a module into the body of a function that returns its exports.
 *
 * The import statements go, because the names they bring in are passed in as
 * arguments. The export keywords go, because the exports are collected into
 * the returned object.
 */
function rewriteModule(source) {
  let out = source;
  out = out.replace(/^\s*import\s+[^;]*?from\s+["'][^"']+["']\s*;?\s*$/gm, "");
  out = out.replace(/^\s*import\s+["'][^"']+["']\s*;?\s*$/gm, "");
  out = out.replace(/^\s*export\s+(async\s+)?(function|const|let|var|class)\s/gm, "$1$2 ");
  out = out.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "");
  out = out.replace(/\/\/# sourceMappingURL=.*$/gm, "");
  return out;
}

/**
 * Resolves an import specifier against the folder of the importing module.
 */
function resolveSpecifier(specifier, fromKey) {
  if (!specifier.startsWith(".")) {
    return null;
  }
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromKey), specifier));
}

export function buildNagBundle() {
  if (!fs.existsSync(GAME_DIR)) {
    fail("scripts/nag/ is missing. Run the TypeScript build first.");
  }
  const modules = collectModules(GAME_DIR, "");
  if (!modules.has(ENTRY)) {
    fail("scripts/nag/main.js is missing. Run the TypeScript build first.");
  }

  const parsed = new Map();
  for (const [key, source] of modules) {
    parsed.set(key, parseModule(source));
  }

  // The modules are written in dependency order, so a module is always
  // defined before the module that uses it.
  const order = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(key) {
    if (visited.has(key)) {
      return;
    }
    if (visiting.has(key)) {
      fail("The game module graph has a cycle at " + key + ".");
    }
    if (!modules.has(key)) {
      fail("The game module " + key + " is missing from scripts/nag/.");
    }
    visiting.add(key);
    for (const specifier of importsOf(modules.get(key) ?? "")) {
      const target = resolveSpecifier(specifier, key);
      if (target === null) {
        continue;
      }
      if (modules.has(target)) {
        visit(target);
      } else if (modules.has(target + ".js")) {
        visit(target + ".js");
      } else {
        fail("The game module " + key + " imports " + specifier + ", which is not in scripts/nag/.");
      }
    }
    visiting.delete(key);
    visited.add(key);
    order.push(key);
  }

  visit(ENTRY);

  const parts = [];
  const moduleVar = new Map();

  for (const key of order) {
    const name = "m_" + key.replace(/[^A-Za-z0-9]/g, "_").replace(/\.js$/, "");
    moduleVar.set(key, name);
    const info = parsed.get(key);
    const exports = info.exported;

    // The names the module imports become the arguments of its function.
    const args = [];
    for (const entry of info.imported) {
      const target = resolveSpecifier(entry.from, key);
      const targetKey = target !== null && modules.has(target) ? target : target !== null && modules.has(target + ".js") ? target + ".js" : null;
      if (targetKey === null) {
        fail("The game module " + key + " imports " + entry.local + " from " + entry.from + ", which is not in scripts/nag/.");
      }
      args.push(entry.local + " = " + moduleVar.get(targetKey) + "." + entry.local);
    }

    const body = rewriteModule(modules.get(key) ?? "");
    const returned = exports.map((symbol) => symbol + ": " + symbol).join(", ");
    parts.push(
      "// " + key + "\n" +
      "const " + name + " = (function (" + args.join(", ") + ") {\n" +
      body + "\nreturn { " + returned + " };\n})();",
    );
  }

  const bundle = parts.join("\n\n") + "\n";
  fs.writeFileSync(OUTPUT, bundle, "utf8");
  return bundle.length;
}

// The file is also run on its own, so the build only runs when it is not
// imported by the site build.
const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const size = buildNagBundle();
  console.log("scripts/nag/nag.bundle.js: " + String(size) + " bytes.");
}
