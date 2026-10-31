// The entry pipeline: markdown sources become index cards and static detail pages.
// A source lives in content/<collection>/<slug>.md and carries frontmatter.
// The build reads the folder, never the drafts folder, and never the trash folder.

import fs from "node:fs";
import path from "node:path";
import { renderMarkdown, markdownToText, markdownImages } from "./markdown.mjs";

const EXCERPT_WORDS = 45;
const DESCRIPTION_MIN = 150;
const DESCRIPTION_MAX = 160;
const DESCRIPTION_FILLER = "Annoying Goods is a spider-themed writing studio and a home for the tools, notes and experiments of the studio.";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const COLLECTIONS = [
  { id: "blog", indexPath: "/blog/", label: "Blog", cardLink: "Read the entry" },
  { id: "words", indexPath: "/words/", label: "Words", cardLink: "Read the story" }
];

function fail(message) {
  console.error("ENTRY BUILD ERROR: " + message);
  process.exit(1);
}

function readFile(target) {
  try {
    return fs.readFileSync(target, "utf8");
  } catch (err) {
    void err;
    return "";
  }
}

export function parseFrontmatter(source) {
  const text = String(source).replace(/^\uFEFF/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) {
    return { fields: {}, body: text };
  }
  const fields = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || line.trim().length === 0 || line.trim().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value.replace(/^["']|["']$/g, "");
  }
  return { fields: fields, body: text.slice(match[0].length) };
}

function words(text) {
  return String(text).replace(/\s+/g, " ").trim().split(" ").filter(function (word) {
    return word.length > 0;
  });
}

export function excerptOf(text, limit) {
  const list = words(text);
  if (list.length <= limit) {
    return list.join(" ");
  }
  return list.slice(0, limit).join(" ");
}

function fitDescription(text) {
  const source = words(text);
  const chosen = [];
  let length = 0;
  function push(word) {
    const next = length === 0 ? word.length : length + 1 + word.length;
    if (next > DESCRIPTION_MAX) {
      return false;
    }
    chosen.push(word);
    length = next;
    return true;
  }
  for (let i = 0; i < source.length; i += 1) {
    if (length >= DESCRIPTION_MIN) {
      break;
    }
    if (!push(source[i])) {
      break;
    }
  }
  if (length < DESCRIPTION_MIN) {
    const filler = words(DESCRIPTION_FILLER);
    for (let i = 0; i < filler.length; i += 1) {
      if (length >= DESCRIPTION_MIN) {
        break;
      }
      push(filler[i]);
    }
  }
  return chosen.join(" ");
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) {
    return "";
  }
  const year = match[1];
  const month = MONTHS[Number(match[2]) - 1] || "";
  const day = Number(match[3]);
  return day + " " + month + " " + year;
}

function slugOf(fileName) {
  return fileName.replace(/\.md$/i, "");
}

function readCollection(root, collection) {
  const folder = path.join(root, "content", collection.id);
  if (!fs.existsSync(folder)) {
    return [];
  }
  const files = fs.readdirSync(folder).filter(function (name) {
    return name.toLowerCase().endsWith(".md");
  }).sort();
  const entries = [];
  for (let i = 0; i < files.length; i += 1) {
    entries.push(buildEntry(root, collection, files[i]));
  }
  return entries;
}

function buildEntry(root, collection, fileName) {
  const slug = slugOf(fileName);
  const file = path.join(root, "content", collection.id, fileName);
  const source = readFile(file);
  if (!source.trim()) {
    fail("The entry " + path.relative(root, file) + " is empty.");
  }
  const parsed = parseFrontmatter(source);
  const title = parsed.fields.title ? String(parsed.fields.title) : "";
  if (!title) {
    fail("The entry " + path.relative(root, file) + " has no title in its frontmatter.");
  }
  const date = parsed.fields.date ? String(parsed.fields.date) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail("The entry " + path.relative(root, file) + " has no date in the yyyy-mm-dd form.");
  }
  const images = markdownImages(parsed.body);
  for (let i = 0; i < images.length; i += 1) {
    if (images[i].alt.length === 0) {
      fail("The entry " + path.relative(root, file) + " has an image without a description. The description becomes the alt text.");
    }
  }
  if (/^#\s+/m.test(parsed.body)) {
    fail("The entry " + path.relative(root, file) + " uses a level one heading. The page already has one, so the body starts at level two.");
  }
  const bodyText = markdownToText(parsed.body);
  const custom = parsed.fields.excerpt ? String(parsed.fields.excerpt) : "";
  const excerpt = custom ? custom : excerptOf(bodyText, EXCERPT_WORDS);
  const tags = parsed.fields.tags ? String(parsed.fields.tags) : "";
  const tagList = tags.split(",").map(function (tag) {
    return tag.trim();
  }).filter(function (tag) {
    return tag.length > 0;
  });
  const entryPath = collection.indexPath + slug + "/";
  const description = fitDescription(title + ". " + excerpt);
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    fail("The generated description for " + entryPath + " is " + description.length + " characters. It must be " + DESCRIPTION_MIN + " to " + DESCRIPTION_MAX + ".");
  }
  return {
    id: collection.id + ":" + slug,
    collection: collection.id,
    collectionLabel: collection.label,
    slug: slug,
    path: entryPath,
    title: title,
    date: date,
    dateText: formatDate(date),
    tags: tagList,
    keywords: tagList.concat([collection.label.toLowerCase()]),
    excerpt: excerpt,
    excerptTruncated: custom.length === 0 && words(bodyText).length > EXCERPT_WORDS,
    standfirst: parsed.fields.standfirst ? String(parsed.fields.standfirst) : "",
    authorNote: parsed.fields.author ? String(parsed.fields.author) : "",
    bodyHtml: renderMarkdown(parsed.body),
    description: description,
    sourceFile: path.relative(root, file).split(path.sep).join("/")
  };
}

// The index card: the first forty five words, three dots and the link.
export function cardHtml(entry) {
  const tail = entry.excerptTruncated ? "..." : "";
  return [
    '<article class="content-article entry-card" data-admin="content:content.css">',
    '<h3 class="article-heading"><a href="' + entry.path + '">' + entry.title + "</a></h3>",
    '<p class="entry-excerpt">' + entry.excerpt + tail + "</p>",
    '<p><a href="' + entry.path + '">' + entry.cardLink + "</a></p>",
    '<p class="entry-meta"><time datetime="' + entry.date + '">' + entry.dateText + "</time></p>",
    "</article>"
  ].join("");
}

// The detail page content: the shared story template with the title, the
// standfirst, the body and the author note.
export function pageHtml(entry) {
  const headingId = "entry-heading-" + entry.slug;
  const parts = [
    '<section class="content-section" data-admin="content:content.css" id="entry-' + entry.slug + '" aria-labelledby="' + headingId + '">',
    '<h2 class="section-heading" id="' + headingId + '">' + entry.title + "</h2>",
    '<article class="content-article entry-card" data-admin="content:content.css">'
  ];
  if (entry.standfirst) {
    parts.push('<p class="entry-standfirst">' + entry.standfirst + "</p>");
  }
  parts.push('<div class="entry-content">' + entry.bodyHtml + "</div>");
  parts.push('<p class="entry-meta"><time datetime="' + entry.date + '">' + entry.dateText + "</time></p>");
  if (entry.tags.length > 0) {
    parts.push('<p class="entry-meta">Tagged: ' + entry.tags.join(", ") + "</p>");
  }
  if (entry.authorNote) {
    parts.push('<p class="entry-author">' + entry.authorNote + "</p>");
  }
  parts.push("</article>");
  parts.push("</section>");
  return parts.join("\n");
}

export function loadEntries(root) {
  const entries = [];
  for (let i = 0; i < COLLECTIONS.length; i += 1) {
    const collection = COLLECTIONS[i];
    const found = readCollection(root, collection);
    for (let j = 0; j < found.length; j += 1) {
      found[j].cardLink = collection.cardLink;
      entries.push(found[j]);
    }
  }
  const seen = new Map();
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const owner = seen.get(entry.path);
    if (owner) {
      fail("The entries " + owner + " and " + entry.sourceFile + " would share the address " + entry.path + ".");
    }
    seen.set(entry.path, entry.sourceFile);
  }
  return entries;
}

// The generated section that goes at the bottom of a collection index page.
export function indexSectionHtml(collection, entries) {
  if (entries.length === 0) {
    return "";
  }
  const sectionId = collection.id + "-entries";
  const headingId = sectionId + "-heading";
  const parts = [
    '<section class="content-section" data-admin="content:content.css" id="' + sectionId + '" aria-labelledby="' + headingId + '">',
    '<h2 class="section-heading" id="' + headingId + '">Entries</h2>'
  ];
  for (let i = 0; i < entries.length; i += 1) {
    parts.push(cardHtml(entries[i]));
  }
  parts.push("</section>");
  return parts.join("\n");
}
