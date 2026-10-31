// The markdown file the panel writes, in the same shape as the helper writes
// it, so the operator can save the file by hand when the helper is away.
function optionalLine(label, value) {
    const clean = value.trim();
    return clean === "" ? [] : [label + ": " + clean];
}
// The file name of an entry, cleaned so a title can never climb out of the
// content folder.
export function slugForTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}
export function entrySource(draft) {
    const lines = [
        "---",
        "title: " + draft.title.trim(),
        "date: " + draft.date.trim(),
        "tags: " + draft.tags.trim()
    ];
    lines.push(...optionalLine("excerpt", draft.excerpt || ""));
    lines.push(...optionalLine("standfirst", draft.standfirst || ""));
    lines.push(...optionalLine("author", draft.author || ""));
    lines.push("---", "", draft.body.trim(), "");
    return lines.join("\n");
}
//# sourceMappingURL=entry-source.js.map