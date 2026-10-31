// The content side of the panel: the markdown entries, the drafts that the
// build never reads and the trash that holds a deleted entry.

import fs from "node:fs";
import path from "node:path";
import { COLLECTIONS, excerptOf, parseFrontmatter } from "../build/entries.mjs";
import { markdownToText } from "../build/markdown.mjs";
import { ENTRIES_DIR, DRAFTS_DIR, TRASH_DIR } from "./paths.mjs";
import { readText, writeText, resolveInside, relativeToRoot } from "./safe-files.mjs";

function fail(message) {
  throw new Error(message);
}

// The file name of an entry, cleaned so a title can never climb out of the
// content folder.
export function slugForTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function optionalLine(label, value) {
  const clean = String(value || "").trim();
  return clean === "" ? [] : [label + ": " + clean];
}

// The markdown file the panel writes, with the frontmatter the build reads.
export function entrySource(draft) {
  const lines = [
    "---",
    "title: " + String(draft.title || "").trim(),
    "date: " + String(draft.date || "").trim(),
    "tags: " + String(draft.tags || "").trim()
  ];
  lines.push(...optionalLine("excerpt", draft.excerpt));
  lines.push(...optionalLine("standfirst", draft.standfirst));
  lines.push(...optionalLine("author", draft.author));
  lines.push("---", "", String(draft.body || "").trim(), "");
  return lines.join("\n");
}

function fieldsOf(parsed) {
  return {
    title: parsed.fields.title || "",
    date: parsed.fields.date || "",
    excerpt: parsed.fields.excerpt ? String(parsed.fields.excerpt) : "",
    standfirst: parsed.fields.standfirst ? String(parsed.fields.standfirst) : "",
    author: parsed.fields.author ? String(parsed.fields.author) : "",
    tags: parsed.fields.tags ? String(parsed.fields.tags) : ""
  };
}

// The entries of a section, with the fields the panel shows.
export function readCollection(collection) {
  const folder = path.join(ENTRIES_DIR, collection);
  if (!fs.existsSync(folder)) {
    return [];
  }
  const found = [];
  const names = fs.readdirSync(folder).filter(function (name) {
    return name.toLowerCase().endsWith(".md");
  }).sort();
  for (const name of names) {
    const parsed = parseFrontmatter(readText(path.join(folder, name)));
    const fields = fieldsOf(parsed);
    found.push({
      slug: name.replace(/\.md$/i, ""),
      collection: collection,
      title: fields.title,
      date: fields.date,
      excerpt: fields.excerpt,
      standfirst: fields.standfirst,
      author: fields.author,
      tags: fields.tags ? fields.tags.split(",").map(function (tag) { return tag.trim(); }).filter(Boolean) : []
    });
  }
  return found;
}

// One entry with everything the editor form needs.
export function readOneEntry(collection, slug) {
  const folder = path.join(ENTRIES_DIR, collection);
  const file = path.join(folder, slug + ".md");
  if (!fs.existsSync(file)) {
    return null;
  }
  const parsed = parseFrontmatter(readText(file));
  const fields = fieldsOf(parsed);
  return {
    slug: slug,
    collection: collection,
    title: fields.title,
    date: fields.date,
    excerpt: fields.excerpt,
    standfirst: fields.standfirst,
    author: fields.author,
    tags: fields.tags,
    body: parsed.body
  };
}

// A draft is a file in the drafts folder, which the build never reads.
export function draftFile(draft) {
  if (!draft.title) {
    fail("The entry needs a title.");
  }
  const slug = draft.slug ? slugForTitle(draft.slug) : slugForTitle(draft.title);
  if (!slug) {
    fail("The title does not give a usable file name.");
  }
  const target = resolveInside(DRAFTS_DIR, slug + ".md");
  if (!target) {
    fail("The draft would land outside the project folder.");
  }
  return target;
}

// The file an entry is written to inside its section.
export function entryFile(draft) {
  if (!draft.title) {
    fail("The entry needs a title.");
  }
  const collection = String(draft.collection || "blog");
  const slug = draft.slug ? slugForTitle(draft.slug) : slugForTitle(draft.title);
  if (!slug) {
    fail("The title does not give a usable file name.");
  }
  const target = resolveInside(path.join(ENTRIES_DIR, collection), slug + ".md");
  if (!target) {
    fail("The entry would land outside the project folder.");
  }
  return { file: target, collection: collection, slug: slug };
}

// A deleted entry moves into the trash folder instead of vanishing.
export function moveToTrash(collection, slug) {
  const source = resolveInside(path.join(ENTRIES_DIR, collection), slug + ".md");
  if (!source || !fs.existsSync(source)) {
    fail("The entry " + collection + "/" + slug + " is not on disk.");
  }
  const target = trashFile(collection, slug);
  fs.mkdirSync(TRASH_DIR, { recursive: true });
  fs.renameSync(source, target);
  return { source: source, target: target };
}

// A trashed entry goes back into the section it came from.
export function restoreFromTrash(collection, slug) {
  const source = trashFile(collection, slug);
  if (!fs.existsSync(source)) {
    fail("The entry " + collection + "/" + slug + " is not in the trash.");
  }
  const target = resolveInside(path.join(ENTRIES_DIR, collection), slug + ".md");
  if (!target) {
    fail("The entry would land outside the project folder.");
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(source, target);
  return { source: source, target: target };
}

// The file of a trashed entry.
export function trashFile(collection, slug) {
  const source = resolveInside(TRASH_DIR, collection + "-" + slug + ".md");
  if (!source) {
    fail("The trashed entry would land outside the project folder.");
  }
  return source;
}

// The name of a trashed entry, split back into its section and its slug.
function splitTrashName(name) {
  for (const collection of COLLECTIONS) {
    const prefix = collection.id + "-";
    if (name.indexOf(prefix) === 0) {
      return { collection: collection.id, slug: name.slice(prefix.length).replace(/\.md$/i, "") };
    }
  }
  return null;
}

// Everything that sits in the trash right now.
export function readTrash() {
  if (!fs.existsSync(TRASH_DIR)) {
    return [];
  }
  const entries = [];
  const names = fs.readdirSync(TRASH_DIR).sort();
  for (const name of names) {
    if (!name.toLowerCase().endsWith(".md")) {
      continue;
    }
    const parts = splitTrashName(name);
    if (!parts) {
      continue;
    }
    const parsed = parseFrontmatter(readText(path.join(TRASH_DIR, name)));
    const fields = fieldsOf(parsed);
    entries.push({
      name: name,
      collection: parts.collection,
      slug: parts.slug,
      title: fields.title,
      date: fields.date
    });
  }
  return entries;
}

// The card of an entry, exactly as the build renders it.
export function excerptFor(body, custom) {
  const text = markdownToText(String(body || ""));
  const own = String(custom || "").trim();
  if (own !== "") {
    return { excerpt: own, truncated: false };
  }
  const count = text.replace(/\s+/g, " ").trim().split(" ").filter(function (word) { return word.length > 0; }).length;
  return { excerpt: excerptOf(text, 45), truncated: count > 45 };
}

// The link the card of a section carries.
export function cardLinkOf(collection) {
  for (const known of COLLECTIONS) {
    if (known.id === collection) {
      return known.cardLink;
    }
  }
  return "Read the entry";
}

export { relativeToRoot };
