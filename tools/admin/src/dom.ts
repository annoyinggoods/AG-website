// Small DOM helpers, so every view reads the panel in the same way.

export function query<T extends Element>(selector: string, scope: ParentNode = document): T | null {
  return scope.querySelector<T>(selector);
}

export function queryAll<T extends Element>(selector: string, scope: ParentNode = document): T[] {
  return Array.from(scope.querySelectorAll<T>(selector));
}

export function required<T extends Element>(selector: string, scope: ParentNode = document): T {
  const found = query<T>(selector, scope);
  if (!found) {
    throw new Error("The panel is missing the element " + selector);
  }
  return found;
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text) {
    node.textContent = text;
  }
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

let statusNode: HTMLElement | null = null;

export function setStatus(message: string, kind: "ok" | "error" | "plain" = "plain"): void {
  if (!statusNode) {
    statusNode = query<HTMLElement>("[data-panel-status]");
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
