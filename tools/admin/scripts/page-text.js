// View three: the page text editor.
// It lists every page of the site and lets the operator change the text of
// its content fragment. The fragment is the HTML the build assembles into a
// page, so editing it changes what a visitor reads. The view still exports
// the change when the helper is not running.
import { fetchPageFragments, fetchPageFragment, savePageFragment } from "./api.js";
import { waitForBuild } from "./build-state.js";
import { clear, element, required, setStatus } from "./dom.js";
function labelOf(fragment) {
    return fragment.title + " (" + fragment.path + ")";
}
function fillList() {
    const select = required("[data-page-text-page]");
    const current = select.value;
    clear(select);
    fetchPageFragments().then(function (fragments) {
        for (const fragment of fragments) {
            const option = element("option", "", labelOf(fragment));
            option.value = fragment.slug;
            select.appendChild(option);
        }
        if (current && Array.from(select.options).some(function (o) { return o.value === current; })) {
            select.value = current;
        }
    }).catch(function (err) {
        setStatus(err instanceof Error ? err.message : String(err), "error");
    });
}
async function loadFragment(slug) {
    const form = required("[data-page-text-form]");
    const hint = required("[data-page-text-hint]");
    const body = required("[data-page-text-html]");
    const path = required("[data-page-text-path]");
    try {
        const draft = await fetchPageFragment(slug);
        if (!draft) {
            setStatus("The page " + slug + " has no content fragment on disk.", "error");
            return;
        }
        path.textContent = "tools/build/content/" + draft.slug + ".html";
        body.value = draft.html;
        hint.textContent = "Editing the text of " + draft.slug + ". Save writes the fragment and rebuilds the site.";
        form.hidden = false;
        required("[data-page-text-note]").textContent = "The fragment " + draft.slug + ".html is open.";
    }
    catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), "error");
    }
}
function formValues() {
    const slug = required("[data-page-text-page]").value;
    const html = required("[data-page-text-html]").value;
    return { slug: slug, html: html };
}
// The fragment the panel would write, so the operator can save it by hand
// when the helper is not running.
function exportFragment() {
    const target = required("[data-page-text-export-text]");
    const draft = formValues();
    const lines = [
        "File: tools/build/content/" + draft.slug + ".html",
        "",
        draft.html
    ];
    target.textContent = lines.join("\n");
}
async function reportChange(answer, done) {
    if (!answer.ok) {
        setStatus(answer.message, "error");
        return;
    }
    if (answer.buildStartedAt === 0) {
        setStatus(answer.message, "ok");
        return;
    }
    setStatus(answer.message + " The site is rebuilding.", "plain");
    const build = await waitForBuild(answer.buildStartedAt);
    if (!build) {
        setStatus(answer.message + " The rebuild did not report back in time.", "error");
        return;
    }
    if (build.ok) {
        setStatus(done, "ok");
        return;
    }
    setStatus("The change was written, but the build failed: " + build.message, "error");
}
async function publish() {
    const draft = formValues();
    if (!draft.slug) {
        setStatus("Pick a page first.", "error");
        return;
    }
    try {
        const answer = await savePageFragment(draft);
        if (answer.ok) {
            required("[data-page-text-form]").hidden = true;
        }
        await reportChange(answer, "The page " + draft.slug + " is written and the site is rebuilt.");
    }
    catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), "error");
    }
}
async function closeForm() {
    required("[data-page-text-form]").hidden = true;
}
export async function startPageText() {
    const select = required("[data-page-text-page]");
    select.addEventListener("change", function () {
        void loadFragment(select.value);
    });
    required("[data-page-text-publish]").addEventListener("click", function () {
        void publish();
    });
    required("[data-page-text-cancel]").addEventListener("click", function () {
        void closeForm();
    });
    required("[data-page-text-export]").addEventListener("click", function () {
        exportFragment();
        setStatus("The fragment is ready to copy into the file by hand.", "ok");
    });
    try {
        fillList();
    }
    catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), "error");
    }
}
//# sourceMappingURL=page-text.js.map