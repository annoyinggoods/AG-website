// The panel changes the text of an element in a content fragment.
// Only the first piece of text inside the element is replaced, so the markup
// around it stays exactly as the author wrote it.

export function findElement(source, elementId) {
  const marker = "id=\"" + elementId + "\"";
  const markerAt = source.indexOf(marker);
  if (markerAt === -1) {
    return null;
  }
  const tagStart = source.lastIndexOf("<", markerAt);
  if (tagStart === -1) {
    return null;
  }
  const tagEnd = source.indexOf(">", markerAt);
  if (tagEnd === -1) {
    return null;
  }
  return { tagStart: tagStart, tagEnd: tagEnd };
}

// Replace the first text run inside the element with the element id.
export function replaceElementText(source, elementId, text) {
  const element = findElement(source, elementId);
  if (!element) {
    return { ok: false, message: "The fragment has no element with the id " + elementId + "." };
  }
  const bodyStart = element.tagEnd + 1;
  const body = source.slice(bodyStart);
  const match = /[^<>]*\S[^<>]*/.exec(body);
  if (!match || match.index === undefined) {
    return { ok: false, message: "The element " + elementId + " has no text of its own, so there is nothing to change." };
  }
  const start = bodyStart + match.index;
  const end = start + match[0].length;
  return {
    ok: true,
    message: "The text of " + elementId + " was changed.",
    source: source.slice(0, start) + text + source.slice(end)
  };
}
