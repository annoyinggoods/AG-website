const toasts = [];
let nextId = 1;
export function addToast(text) {
    const id = nextId++;
    toasts.push({ id, text });
    renderToasts();
    setTimeout(() => {
        removeToast(id);
    }, 3000);
    return id;
}
export function removeToast(id) {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx >= 0) {
        toasts.splice(idx, 1);
        renderToasts();
    }
}
function renderToasts() {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "false");
        document.body.appendChild(container);
    }
    container.textContent = "";
    for (const t of toasts) {
        const el = document.createElement("div");
        el.className = "toast";
        el.textContent = t.text;
        container.appendChild(el);
    }
}
//# sourceMappingURL=toasts.js.map