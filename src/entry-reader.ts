const ENTRY_SELECTOR = "[data-entry-body]";

let reader: HTMLElement | null = null;
let openId = "";
let trigger: HTMLElement | null = null;

export function initEntryReader(): void {
  const main = document.querySelector("[data-main-box]");
  if (!(main instanceof HTMLElement)) {
    return;
  }
  if (!document.querySelector(ENTRY_SELECTOR)) {
    return;
  }
  window.addEventListener("hashchange", function (): void {
    render(main);
  });
  render(main);
}

function entryId(): string {
  const hash = window.location.hash || "";
  if (hash.length < 2) {
    return "";
  }
  return hash.slice(1);
}

function render(main: HTMLElement): void {
  const id = entryId();
  const source = id ? document.querySelector('[data-entry-body="' + id + '"]') : null;
  if (!source) {
    close(main);
    return;
  }
  if (openId === id && reader) {
    return;
  }
  const opener = findTrigger(id);
  close(main);
  openId = id;
  const title = entryTitle(source);
  reader = document.createElement("article");
  reader.className = "entry-reader";
  reader.setAttribute("data-admin", "content:content.css");
  reader.setAttribute("tabindex", "-1");
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.setAttribute("tabindex", "-1");
  heading.textContent = title;
  const body = document.createElement("div");
  body.className = "entry-reader-body";
  body.innerHTML = source.innerHTML;
  smoothExcerptMark(body);
  const back = document.createElement("button");
  back.className = "entry-back";
  back.type = "button";
  back.textContent = "Back to the list";
  back.addEventListener("click", function (): void {
    closeAndClearHash(main);
  });
  reader.appendChild(heading);
  reader.appendChild(body);
  reader.appendChild(back);
  main.appendChild(reader);
  main.classList.add("is-reading");
  main.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "auto" });
  trigger = opener;
  focusReader();
  announceEntryOpen(title);
}

function findTrigger(id: string): HTMLElement | null {
  const links = document.querySelectorAll("a[href]");
  for (const link of links) {
    if (!(link instanceof HTMLElement)) {
      continue;
    }
    if (link.getAttribute("href") === "#" + id) {
      return link;
    }
  }
  return null;
}

function focusReader(): void {
  if (!reader) {
    return;
  }
  const heading = reader.querySelector(".section-heading");
  if (heading instanceof HTMLElement) {
    heading.focus();
    return;
  }
  reader.focus();
}

function announceEntryOpen(title: string): void {
  const status = document.querySelector("[data-entry-status]");
  if (!status) {
    return;
  }
  status.textContent = "";
  window.requestAnimationFrame(function (): void {
    status.textContent = "Opened " + title + " in full.";
  });
}

function closeAndClearHash(main: HTMLElement): void {
  clearHash();
  close(main);
}

function clearHash(): void {
  if (!window.location.hash) {
    return;
  }
  const url = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", url);
}

function close(main: HTMLElement): void {
  if (reader) {
    reader.remove();
    reader = null;
  }
  main.classList.remove("is-reading");
  openId = "";
  restoreFocus();
}

function restoreFocus(): void {
  if (!trigger) {
    return;
  }
  const target = trigger;
  trigger = null;
  if (target.isConnected) {
    target.focus();
  }
}

function entryTitle(source: Element): string {
  const card = source.closest("article");
  const heading = card ? card.querySelector(".article-heading") : null;
  if (heading) {
    const text = heading.textContent || "";
    if (text.trim().length > 0) {
      return text.trim();
    }
  }
  return "Entry";
}

// The card excerpt ends with three dots. Inside the full text it reads as a
// stray mark, so the first one is dropped.
function smoothExcerptMark(body: HTMLElement): void {
  const first = body.querySelector("p");
  if (!first) {
    return;
  }
  const text = first.textContent || "";
  const cut = text.indexOf("...");
  if (cut === -1) {
    return;
  }
  const cleaned = text.slice(0, cut) + text.slice(cut + 3);
  first.textContent = cleaned;
}
