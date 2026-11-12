// The build checks the structure of every page it writes.
// It refuses a page with two first level headings, a heading level that is
// skipped, an image without an alternative text and a page that lost one of
// the hooks the modules read.

const TAG_PATTERN = /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTRIBUTE_PATTERN = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

// The hooks every page has to carry, because a module reads them.
const REQUIRED_HOOKS = [
  { label: "the root element carries the theme", pattern: /<html[^>]*\sdata-theme="/ },
  { label: "the root element carries the live event", pattern: /<html[^>]*\sdata-event="/ },
  { label: "the body carries the page path", pattern: /<body[^>]*\sdata-page="/ },
  { label: "the skip link is the first link", pattern: /<a[^>]*class="skip-link"[^>]*href="#main-content"/ },
  { label: "the main box is marked", pattern: /<main[^>]*id="main-content"[^>]*data-main-box/ },
  { label: "the menu is marked", pattern: /<nav[^>]*data-menu\b/ },
  { label: "the menu tree is marked", pattern: /data-menu(-top)?-tree/ },
  { label: "the cookie notice is marked", pattern: /data-cookie-banner/ },
  { label: "the lens is marked", pattern: /data-lens/ },
  { label: "the glow is marked", pattern: /data-glow/ },
  { label: "the lightbox is marked", pattern: /data-lightbox/ },
  { label: "the entry reader status is marked", pattern: /data-entry-status/ }
];

// The sidebar-only hooks. The playground layout's top menu has no search box
// by design, so the search markers are only required on the sidebar layout.
const SIDEBAR_HOOKS = [
  { label: "the menu search is marked", pattern: /data-menu-search\b/ },
  { label: "the menu search results are marked", pattern: /data-menu-results/ },
  { label: "the menu search status is marked", pattern: /data-menu-search-status/ }
];

const PLAYGROUND_BODY = /<body[^>]*data-layout="playground"/;

function stripScriptsAndStyles(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

function attributesOf(source) {
  const attributes = new Map();
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match = ATTRIBUTE_PATTERN.exec(source);
  while (match !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] !== undefined ? match[4] : ""));
    if (!attributes.has(name)) {
      attributes.set(name, value);
    }
    match = ATTRIBUTE_PATTERN.exec(source);
  }
  return attributes;
}

function headingsOf(html) {
  const headings = [];
  const source = stripScriptsAndStyles(html);
  TAG_PATTERN.lastIndex = 0;
  let match = TAG_PATTERN.exec(source);
  while (match !== null) {
    const name = match[1].toLowerCase();
    if (/^h[1-6]$/.test(name)) {
      headings.push(Number(name.slice(1)));
    }
    match = TAG_PATTERN.exec(source);
  }
  return headings;
}

function imagesOf(html) {
  const images = [];
  const source = stripScriptsAndStyles(html);
  TAG_PATTERN.lastIndex = 0;
  let match = TAG_PATTERN.exec(source);
  while (match !== null) {
    const name = match[1].toLowerCase();
    if (name === "img") {
      images.push(attributesOf(match[2]));
    }
    match = TAG_PATTERN.exec(source);
  }
  return images;
}

// Every acceptance rule returns a list of plain sentences, so the build can
// print them and stop.
export function validatePageHtml(html, pagePath) {
  const errors = [];
  const headings = headingsOf(html);
  const firstLevel = headings.filter(function (level) { return level === 1; });
  if (firstLevel.length === 0) {
    errors.push("the page " + pagePath + " has no first level heading");
  }
  if (firstLevel.length > 1) {
    errors.push("the page " + pagePath + " has " + String(firstLevel.length) + " first level headings and it must have exactly one");
  }
  let previous = 0;
  for (let i = 0; i < headings.length; i += 1) {
    const level = headings[i];
    if (previous > 0 && level > previous + 1) {
      errors.push("the page " + pagePath + " jumps from a level " + String(previous) + " heading to a level " + String(level) + " heading");
      break;
    }
    previous = level;
  }
  const images = imagesOf(html);
  for (let i = 0; i < images.length; i += 1) {
    if (!images[i].has("alt")) {
      errors.push("the page " + pagePath + " has an image without an alt attribute");
      break;
    }
  }
  const hooks = PLAYGROUND_BODY.test(html) ? REQUIRED_HOOKS : REQUIRED_HOOKS.concat(SIDEBAR_HOOKS);
  for (let i = 0; i < hooks.length; i += 1) {
    const hook = hooks[i];
    if (!hook.pattern.test(html)) {
      errors.push("the page " + pagePath + " is missing " + hook.label);
    }
  }
  return errors;
}
