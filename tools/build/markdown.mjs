// A small markdown renderer for the entry pipeline.
// It handles the subset the studio writes: headings, paragraphs, lists,
// blockquotes, code fences, rules, emphasis, links and images.
// The renderer never trusts the source, so every character is escaped first.

const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, function (character) {
    return HTML_ENTITIES[character] || character;
  });
}

function isBlank(line) {
  return line.trim().length === 0;
}

function headingOf(line) {
  const match = /^(#{1,6})\s+(.*)$/.exec(line);
  if (!match) {
    return null;
  }
  const level = match[1].length;
  const text = match[2].trim();
  return { level: level, text: text };
}

function listItemOf(line) {
  const unordered = /^[-*]\s+(.*)$/.exec(line);
  if (unordered) {
    return { ordered: false, text: unordered[1] };
  }
  const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
  if (ordered) {
    return { ordered: true, text: ordered[1] };
  }
  return null;
}

function isRuleOf(line) {
  return /^\s*([-*_])\s*(\1\s*){2,}$/.test(line);
}

function startsBlock(line) {
  if (isBlank(line)) {
    return true;
  }
  if (headingOf(line)) {
    return true;
  }
  if (listItemOf(line)) {
    return true;
  }
  if (isRuleOf(line)) {
    return true;
  }
  if (/^>\s?/.test(line)) {
    return true;
  }
  if (/^```/.test(line)) {
    return true;
  }
  return false;
}

function renderCodeBlock(lines) {
  const body = lines.map(escapeHtml).join("\n");
  return "<pre><code>" + body + "</code></pre>";
}

function renderList(items, ordered) {
  const tag = ordered ? "ol" : "ul";
  const parts = items.map(function (item) {
    return "<li>" + renderInline(item) + "</li>";
  });
  return "<" + tag + ">" + parts.join("") + "</" + tag + ">";
}

function renderBlockquote(lines) {
  const inner = lines.map(function (line) {
    return line.replace(/^>\s?/, "");
  }).join("\n");
  return "<blockquote>" + renderMarkdown(inner) + "</blockquote>";
}

export function renderMarkdown(source) {
  const lines = String(source).replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (isBlank(line)) {
      index = index + 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code = [];
      index = index + 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index = index + 1;
      }
      index = index + 1;
      blocks.push(renderCodeBlock(code));
      continue;
    }
    if (isRuleOf(line)) {
      blocks.push("<hr>");
      index = index + 1;
      continue;
    }
    const heading = headingOf(line);
    if (heading) {
      blocks.push("<h" + String(heading.level) + ">" + renderInline(heading.text) + "</h" + String(heading.level) + ">");
      index = index + 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quoted = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoted.push(lines[index]);
        index = index + 1;
      }
      blocks.push(renderBlockquote(quoted));
      continue;
    }
    const item = listItemOf(line);
    if (item) {
      const items = [];
      while (index < lines.length) {
        const current = listItemOf(lines[index]);
        if (!current || current.ordered !== item.ordered) {
          break;
        }
        items.push(current.text);
        index = index + 1;
      }
      blocks.push(renderList(items, item.ordered));
      continue;
    }
    const paragraph = [];
    while (index < lines.length && !startsBlock(lines[index])) {
      paragraph.push(lines[index].trim());
      index = index + 1;
    }
    if (paragraph.length > 0) {
      blocks.push("<p>" + renderInline(paragraph.join(" ")) + "</p>");
    }
  }
  return blocks.join("\n");
}

function imageTag(alt, source, title) {
  const safeAlt = escapeHtml(alt);
  const safeSrc = escapeHtml(source);
  const size = /^(\d+)x(\d+)$/.exec(title || "");
  const dimensions = size ? ' width="' + size[1] + '" height="' + size[2] + '"' : "";
  return '<img src="' + safeSrc + '" alt="' + safeAlt + '"' + dimensions + ' loading="lazy">';
}

function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (match, alt, source, title) {
    return imageTag(alt, source, title || "");
  });
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (match, label, href, title) {
    const titleAttribute = title ? ' title="' + escapeHtml(title) + '"' : "";
    return '<a href="' + escapeHtml(href) + '"' + titleAttribute + ">" + label + "</a>";
  });
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
  return out;
}

// The plain text of a markdown source, used for the excerpt and the description.
export function markdownToText(source) {
  const withoutCode = String(source).replace(/```[\s\S]*?```/g, " ");
  const withoutMarks = withoutCode
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ");
  return withoutMarks.replace(/\s+/g, " ").trim();
}

// Every image in the source, so the build can refuse one without a description.
export function markdownImages(source) {
  const images = [];
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  let match = pattern.exec(String(source));
  while (match !== null) {
    images.push({ alt: match[1].trim(), src: match[2], title: match[3] || "" });
    match = pattern.exec(String(source));
  }
  return images;
}
