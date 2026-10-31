import { debounce } from "./utils-dom.js";
import { initMenuData, getMenuPages, getMenuEntries } from "./menu-data.js";
import { scoreSubsequence, buildHighlight } from "./utils-fuzzy.js";
const MAX_RESULTS = 25;
const DEBOUNCE_MS = 120;
export function initMenuSearch() {
    initMenuData();
    const input = document.querySelector("[data-menu-search]");
    const nav = document.querySelector("[data-menu]");
    if (!(input instanceof HTMLInputElement) || !nav) {
        return;
    }
    const resultsHost = document.querySelector("[data-menu-results]");
    const liveRegion = document.querySelector("[data-menu-search-status]");
    const tree = document.querySelector("[data-menu-tree]");
    const clearButton = document.querySelector("[data-menu-search-clear]");
    if (!(resultsHost instanceof HTMLElement) || !(liveRegion instanceof HTMLElement)) {
        return;
    }
    const host = resultsHost;
    const live = liveRegion;
    let activeIndex = -1;
    let currentItems = [];
    let currentTotal = 0;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", "menu-search-listbox");
    host.id = "menu-search-listbox";
    const runSearch = debounce(function () {
        const query = input.value;
        const outcome = searchPages(query);
        currentItems = outcome.items;
        currentTotal = outcome.total;
        activeIndex = -1;
        renderResults(host, tree, outcome, query);
        announceCount(live, outcome, query);
        syncChrome(nav, input, clearButton, query);
    }, DEBOUNCE_MS);
    input.addEventListener("input", runSearch);
    input.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            activeIndex = moveActive(host, activeIndex, 1);
        }
        else if (event.key === "ArrowUp") {
            event.preventDefault();
            activeIndex = moveActive(host, activeIndex, -1);
        }
        else if (event.key === "Enter") {
            if (activeIndex >= 0 && activeIndex < currentItems.length) {
                const picked = currentItems[activeIndex];
                if (picked) {
                    event.preventDefault();
                    followResult(picked);
                }
            }
        }
        else if (event.key === "Escape") {
            input.value = "";
            currentItems = [];
            currentTotal = 0;
            activeIndex = -1;
            renderResults(host, tree, { items: [], total: 0 }, "");
            announceCount(live, { items: [], total: 0 }, "");
            syncChrome(nav, input, clearButton, "");
            input.blur();
        }
    });
    if (clearButton instanceof HTMLButtonElement) {
        clearButton.addEventListener("click", function () {
            input.value = "";
            currentItems = [];
            currentTotal = 0;
            activeIndex = -1;
            renderResults(host, tree, { items: [], total: 0 }, "");
            announceCount(live, { items: [], total: 0 }, "");
            syncChrome(nav, input, clearButton, "");
            input.focus();
        });
    }
}
function syncChrome(nav, input, clearButton, query) {
    const searching = query.trim().length > 0;
    if (searching) {
        document.body.classList.add("menu-searching");
        input.setAttribute("aria-expanded", "true");
    }
    else {
        document.body.classList.remove("menu-searching");
        input.setAttribute("aria-expanded", "false");
    }
    if (clearButton instanceof HTMLElement) {
        clearButton.hidden = !searching;
    }
    void nav;
}
function searchPages(query) {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) {
        return { items: [], total: 0 };
    }
    const pages = getMenuPages();
    const entries = getMenuEntries();
    const items = [];
    for (let i = 0; i < pages.length; i = i + 1) {
        const page = pages[i];
        if (!page) {
            continue;
        }
        const titleHit = scoreSubsequence(trimmed, page.title);
        const keywordhits = countKeywordHits(trimmed, page.keywords);
        if (!titleHit && keywordhits === 0) {
            continue;
        }
        const base = titleHit ? titleHit.score : 40;
        const score = base + keywordhits * 6 - page.depth;
        let positions = [];
        if (titleHit) {
            positions = titleHit.positions.filter(function (pos) {
                return pos < page.title.length;
            });
        }
        items.push({
            title: page.title,
            href: page.path,
            depth: page.depth,
            score: score,
            positions: positions,
        });
    }
    for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        if (!entry) {
            continue;
        }
        const titleHit = scoreSubsequence(trimmed, entry.title);
        const keywordhits = countKeywordHits(trimmed, entry.keywords);
        if (!titleHit && keywordhits === 0) {
            continue;
        }
        const base = titleHit ? titleHit.score : 40;
        const score = base + keywordhits * 6 - entry.depth;
        let positions = [];
        if (titleHit) {
            positions = titleHit.positions.filter(function (pos) {
                return pos < entry.title.length;
            });
        }
        items.push({
            title: entry.title,
            href: entry.path,
            depth: entry.depth,
            score: score,
            positions: positions,
        });
    }
    items.sort(compareItems);
    const total = items.length;
    return { items: items.slice(0, MAX_RESULTS), total: total };
}
function countKeywordHits(query, keywords) {
    let hits = 0;
    for (let i = 0; i < keywords.length; i = i + 1) {
        const keyword = keywords[i];
        if (!keyword) {
            continue;
        }
        if (keyword.toLowerCase().indexOf(query) >= 0) {
            hits = hits + 1;
        }
    }
    return hits;
}
function compareItems(a, b) {
    if (b.score !== a.score) {
        return b.score - a.score;
    }
    if (a.depth !== b.depth) {
        return a.depth - b.depth;
    }
    if (a.title < b.title) {
        return -1;
    }
    if (a.title > b.title) {
        return 1;
    }
    return 0;
}
function renderResults(host, tree, outcome, query) {
    host.innerHTML = "";
    if (query.trim().length === 0) {
        host.hidden = true;
        if (tree instanceof HTMLElement) {
            tree.hidden = false;
        }
        return;
    }
    if (tree instanceof HTMLElement) {
        tree.hidden = true;
    }
    host.hidden = false;
    const list = document.createElement("ul");
    list.className = "menu-search-list";
    list.setAttribute("role", "presentation");
    const visible = outcome.items;
    for (let i = 0; i < visible.length; i = i + 1) {
        const item = visible[i];
        if (!item) {
            continue;
        }
        const row = document.createElement("li");
        row.classList.add("menu-search-item");
        row.classList.add("menu-item");
        row.setAttribute("role", "option");
        row.id = "menu-search-option-" + String(i);
        row.setAttribute("aria-selected", "false");
        row.setAttribute("data-search-index", String(i));
        row.style.paddingInlineStart = String(0.5 + item.depth * 0.9) + "rem";
        const link = document.createElement("a");
        link.classList.add("menu-link");
        link.classList.add("menu-search-link");
        link.href = item.href;
        link.tabIndex = -1;
        link.innerHTML = buildHighlight(item.title, item.positions);
        row.appendChild(link);
        list.appendChild(row);
    }
    host.appendChild(list);
    if (outcome.total > visible.length) {
        const more = document.createElement("p");
        more.className = "menu-search-more";
        more.textContent = String(outcome.total - visible.length) + " more";
        host.appendChild(more);
    }
    if (visible.length === 0) {
        const empty = document.createElement("p");
        empty.className = "menu-search-empty";
        empty.textContent = "No pages match this query.";
        host.appendChild(empty);
    }
}
function announceCount(live, outcome, query) {
    if (query.trim().length === 0) {
        live.hidden = true;
        live.textContent = "Full page tree restored.";
        return;
    }
    live.hidden = false;
    const shown = outcome.items.length;
    if (outcome.total === 0) {
        live.textContent = "No matching pages.";
    }
    else if (outcome.total > shown) {
        live.textContent = String(shown) + " of " + String(outcome.total) + " matching pages shown.";
    }
    else {
        live.textContent = String(shown) + " matching pages.";
    }
}
function moveActive(host, activeIndex, delta) {
    const rows = host.querySelectorAll("[data-search-index]");
    if (rows.length === 0) {
        return -1;
    }
    let next = activeIndex + delta;
    if (next < 0) {
        next = 0;
    }
    if (next >= rows.length) {
        next = rows.length - 1;
    }
    rows.forEach(function (row) {
        row.setAttribute("aria-selected", "false");
        row.classList.remove("is-active");
    });
    const target = rows[next];
    if (!(target instanceof HTMLElement)) {
        return -1;
    }
    target.setAttribute("aria-selected", "true");
    target.classList.add("is-active");
    target.scrollIntoView({ block: "nearest" });
    const input = document.querySelector("[data-menu-search]");
    if (input instanceof HTMLInputElement) {
        input.setAttribute("aria-activedescendant", target.id);
    }
    return next;
}
function followResult(item) {
    window.location.href = item.href;
}
//# sourceMappingURL=menu-search.js.map