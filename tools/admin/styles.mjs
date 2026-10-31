// The stylesheet side of the panel: the element registry, the rule that owns
// a value and the file that value is written into.

import fs from "node:fs";
import path from "node:path";
import { findRuleForWrite, setDeclaration, appendRule, removeDeclaration, readDeclarations } from "./css-edit.mjs";
import { validateValue } from "./values.mjs";
import { ROOT, STYLES_DIR } from "./paths.mjs";
import { readText, writeText, resolveInside, relativeToRoot } from "./safe-files.mjs";
import { builtPages } from "./tree.mjs";

// The category of the element registry points at the stylesheet folder.
export const CATEGORY_FILES = {
  tokens: ["styles/tokens.css"],
  layout: ["styles/layout.css"],
  glass: ["styles/glass.css"],
  menu: ["styles/menu.css", "styles/menu-mobile.css"],
  boxes: ["styles/boxes.css"],
  content: ["styles/content.css", "styles/err404.css"],
  hero: ["styles/hero.css"],
  effects: ["styles/effects-glow.css", "styles/effects-lens.css"],
  events: ["styles/events.css"],
  cookies: ["styles/cookies.css"],
  nag: ["styles/nag.css"]
};

function fail(message) {
  throw new Error(message);
}

export function knownCategories() {
  return Object.keys(CATEGORY_FILES);
}

function categoryIsKnown(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_FILES, category);
}

// The plain message the panel gives when the category is not one it knows.
export function unknownCategoryMessage(category) {
  return "The category " + category + " is not one the panel knows. The known categories are: "
    + knownCategories().join(", ") + ".";
}

function styleCandidates(category, hint) {
  const known = CATEGORY_FILES[category] || [];
  const named = known.filter(function (file) {
    return path.basename(file) === hint;
  });
  if (named.length > 0) {
    return named;
  }
  return known;
}

// Every stylesheet in the project, so a rule that lives in another file is
// still found instead of being written twice.
function everyStyleFile() {
  const found = [];
  function walk(folder) {
    if (!fs.existsSync(folder)) {
      return;
    }
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".css") && entry.name !== "bundle.min.css") {
        found.push(relativeToRoot(full));
      }
    }
  }
  walk(STYLES_DIR);
  return found;
}

// The files a change may land in, the own files of the category first. The
// whole styles folder is only a fallback for a category the panel knows.
export function orderedStyleFiles(category, hint) {
  const ordered = [];
  for (const file of styleCandidates(category, hint)) {
    if (ordered.indexOf(file) === -1) {
      ordered.push(file);
    }
  }
  if (!categoryIsKnown(category)) {
    return ordered;
  }
  for (const file of everyStyleFile()) {
    if (ordered.indexOf(file) === -1) {
      ordered.push(file);
    }
  }
  return ordered;
}

function readableFile(relative) {
  const absolute = resolveInside(ROOT, relative);
  if (!absolute || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    return null;
  }
  return absolute;
}

// The rule that always applies and owns the selector, with the file it is in.
function findOwner(files, selectors) {
  for (const file of files) {
    const absolute = readableFile(file);
    if (!absolute) {
      continue;
    }
    const source = readText(absolute);
    const found = findRuleForWrite(source, selectors);
    if (found && !found.conditional) {
      return { file: absolute, source: source, rule: found.rule };
    }
  }
  return null;
}

// The copy of the rule that only applies inside a media query or the like.
function findConditional(files, selectors) {
  for (const file of files) {
    const absolute = readableFile(file);
    if (!absolute) {
      continue;
    }
    const source = readText(absolute);
    const found = findRuleForWrite(source, selectors);
    if (found && found.conditional) {
      return { file: relativeToRoot(absolute), rule: found.rule };
    }
  }
  return null;
}

// The name of the value in the request for every property the panel writes.
// The panel names the values after its own fields, so the property name and
// the value name are not always the same.
const VALUE_NAMES = {
  "height": "height",
  "width": "width",
  "position": "position",
  "z-index": "zIndex",
  "color": "color",
  "background-color": "backgroundColor",
  "background-image": "backgroundImage"
};

function valueOf(values, property) {
  const name = VALUE_NAMES[property] || property;
  const raw = values[name];
  return raw === undefined || raw === null ? "" : String(raw).trim();
}

// Every changed value is checked before anything is written, so a refused
// value never leaves half a change behind.
function checkValues(changed, values) {
  const refusals = [];
  for (const property of changed) {
    const answer = validateValue(property, valueOf(values, property));
    if (!answer.ok) {
      refusals.push(answer.message);
    }
  }
  return refusals;
}

export function saveStyle(request) {
  const target = request.target || {};
  const values = request.values || {};
  const changed = Array.isArray(request.changedProperties) ? request.changedProperties : [];
  const category = String(target.category || "");
  const files = orderedStyleFiles(category, String(target.file || ""));
  if (files.length === 0) {
    fail(unknownCategoryMessage(category));
  }
  const refusals = checkValues(changed, values);
  if (refusals.length > 0) {
    fail(refusals.join(" "));
  }
  const selectors = Array.isArray(target.selectors) ? target.selectors : [];
  const owner = findOwner(files, selectors);
  if (!owner) {
    const nested = findConditional(files, selectors);
    if (nested) {
      fail("The selector " + (selectors[0] || "") + " only exists inside a conditional block in "
        + nested.file + ", so the panel will not write into it.");
    }
  }
  const firstFile = files.map(readableFile).filter(function (file) { return file !== null; })[0];
  if (!firstFile) {
    fail("None of the stylesheets of the category " + category + " is on disk.");
  }
  const targetFile = owner ? owner.file : firstFile;
  let updated = owner ? owner.source : readText(firstFile);
  const written = [];
  for (const property of changed) {
    const value = valueOf(values, property);
    const found = findRuleForWrite(updated, selectors);
    const rule = found && !found.conditional ? found.rule : null;
    if (value === "") {
      if (rule) {
        updated = removeDeclaration(updated, rule, property);
        written.push(property);
      }
      continue;
    }
    if (rule) {
      updated = setDeclaration(updated, rule, property, value);
    } else {
      updated = appendRule(updated, selectors[0] || "", property, value);
    }
    written.push(property);
  }
  const changedFiles = [];
  if (written.length > 0) {
    writeText(targetFile, updated);
    changedFiles.push(relativeToRoot(targetFile));
  }
  return { file: targetFile, changedFiles: changedFiles, written: written };
}

export function readStyle(target) {
  const category = String(target.category || "");
  const files = orderedStyleFiles(category, String(target.file || ""));
  if (files.length === 0) {
    fail(unknownCategoryMessage(category));
  }
  const selectors = Array.isArray(target.selectors) ? target.selectors : [];
  for (const candidate of files) {
    const absolute = readableFile(candidate);
    if (!absolute) {
      continue;
    }
    const source = readText(absolute);
    const found = findRuleForWrite(source, selectors);
    if (found && !found.conditional) {
      const declarations = readDeclarations(source, found.rule);
      const values = {};
      declarations.forEach(function (value, name) {
        values[name] = value;
      });
      return { ok: true, file: relativeToRoot(absolute), declarations: values };
    }
  }
  return { ok: true, file: "", declarations: {} };
}

// The element registry of the built site: the categories the pages use and
// the stylesheets they point at.
export function readRegistry() {
  const categories = new Map();
  for (const page of builtPages()) {
    let html = "";
    try {
      html = readText(page);
    } catch (err) {
      void err;
      continue;
    }
    const pattern = /data-admin="([^"]*)"/g;
    let match = pattern.exec(html);
    while (match !== null) {
      const value = match[1];
      const separator = value.indexOf(":");
      if (separator > 0) {
        const category = value.slice(0, separator);
        const file = value.slice(separator + 1);
        if (!categories.has(category)) {
          categories.set(category, new Set());
        }
        categories.get(category).add("styles/" + file);
      }
      match = pattern.exec(html);
    }
  }
  const names = Array.from(categories.keys()).sort();
  const unknown = names.filter(function (category) { return !categoryIsKnown(category); });
  const files = [];
  for (const category of names) {
    for (const file of categories.get(category)) {
      if (files.indexOf(file) === -1) {
        files.push(file);
      }
    }
  }
  return { categories: names, unknown: unknown, files: files.sort() };
}
