// The pages of the project come from the menu tree, and the built pages are
// the folders the tree names. The panel reads the tree so it never guesses
// where a page lives.

import fs from "node:fs";
import path from "node:path";
import { COLLECTIONS } from "../build/entries.mjs";
import { ROOT, TREE_FILE, ENTRIES_DIR } from "./paths.mjs";
import { readText } from "./safe-files.mjs";

// The section a page belongs to, taken from the first part of its path.
export function collectionOf(pagePath) {
  const segments = String(pagePath).split("/").filter(function (part) { return part.length > 0; });
  const first = segments[0] || "";
  for (const collection of COLLECTIONS) {
    if (collection.id === first) {
      return collection.id;
    }
  }
  return "";
}

// Every page of the tree with the section it belongs to.
export function readTree() {
  const tree = JSON.parse(readText(TREE_FILE));
  const entries = [];
  function walk(nodes) {
    for (const node of nodes) {
      entries.push({
        path: node.path,
        title: node.title,
        collection: collectionOf(node.path),
        parent: node.parent
      });
      if (Array.isArray(node.children)) {
        walk(node.children);
      }
    }
  }
  walk(tree.pages);
  return entries;
}

// The file of a built page, or nothing when the build has not written it.
export function pageFile(pagePath) {
  const relative = pagePath === "/" ? "index.html" : pagePath.replace(/^\/+/, "").replace(/\/+$/, "") + "/index.html";
  const file = path.join(ROOT, relative);
  return fs.existsSync(file) ? file : "";
}

// The detail page of every entry, in the folder the collection builds into.
function entryPages() {
  const pages = [];
  for (const collection of COLLECTIONS) {
    const folder = path.join(ENTRIES_DIR, collection.id);
    if (!fs.existsSync(folder)) {
      continue;
    }
    const names = fs.readdirSync(folder).filter(function (name) {
      return name.toLowerCase().endsWith(".md");
    });
    for (const name of names) {
      const slug = name.replace(/\.md$/i, "");
      const built = path.join(ROOT, collection.indexPath.replace(/^\/+/, ""), slug, "index.html");
      const source = path.join(ROOT, "content", collection.id, slug, "index.html");
      const file = fs.existsSync(built) ? built : (fs.existsSync(source) ? source : "");
      if (file) {
        pages.push(file);
      }
    }
  }
  return pages;
}

// Every page the build wrote, so the registry and the preview read the same
// files the visitor sees.
export function builtPages() {
  const pages = treePages();
  for (const file of entryPages()) {
    pages.push(file);
  }
  return pages;
}

// The pages of the tree and the error page, which is what the build stamp
// compares against the sources.
export function treePages() {
  const pages = [];
  for (const entry of readTree()) {
    const file = pageFile(entry.path);
    if (file) {
      pages.push(file);
    }
  }
  const notFound = path.join(ROOT, "404.html");
  if (fs.existsSync(notFound)) {
    pages.push(notFound);
  }
  return pages;
}
