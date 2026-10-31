// Small DOM helpers, so every view reads the panel in the same way.
export function query(selector, scope = document) {
    return scope.querySelector(selector);
}
export function queryAll(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
}
export function required(selector, scope = document) {
    const found = query(selector, scope);
    if (!found) {
        throw new Error("The panel is missing the element " + selector);
    }
    return found;
}
export function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text) {
        node.textContent = text;
    }
    return node;
}
export function clear(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
let statusNode = null;
export function setStatus(message, kind = "plain") {
    if (!statusNode) {
        statusNode = query("[data-panel-status]");
    }
    if (!statusNode) {
        return;
    }
    statusNode.textContent = message;
    statusNode.classList.remove("is-ok", "is-error");
    if (kind === "ok") {
        statusNode.classList.add("is-ok");
    }
    if (kind === "error") {
        statusNode.classList.add("is-error");
    }
}
//# sourceMappingURL=dom.js.map