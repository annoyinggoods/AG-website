export function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className !== undefined) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}
export function setText(element, text) {
    if (element.textContent === text) {
        return;
    }
    element.textContent = text;
}
//# sourceMappingURL=dom.js.map