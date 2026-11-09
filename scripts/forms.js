export function initForms() {
    const forms = document.querySelectorAll("form.contact-form");
    forms.forEach(function (form) {
        if (form instanceof HTMLFormElement) {
            wireForm(form);
        }
    });
}
function wireForm(form) {
    const startedAt = Math.floor(Date.now() / 1000);
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector("button[type='submit']");
    const endpoint = (form.getAttribute("data-endpoint") || "").trim();
    wireFieldMessages(form);
    // The browser refuses to send a form with an empty field, so the submit
    // event never arrives. The invalid event does, and it does not bubble, so
    // the form listens for it while the event is on its way down.
    form.addEventListener("invalid", function (event) {
        if (!isFormField(event.target)) {
            return;
        }
        announce(status, "Please complete the required fields before sending.");
    }, true);
    form.addEventListener("submit", function (event) {
        const invalid = firstInvalidField(form);
        if (invalid) {
            event.preventDefault();
            announce(status, "Please complete the required fields before sending.");
            invalid.focus();
            return;
        }
        if (endpoint.length === 0) {
            event.preventDefault();
            openMailtoFallback(form, status);
            return;
        }
        event.preventDefault();
        postForm(form, endpoint, status, submit instanceof HTMLButtonElement ? submit : null, startedAt);
    });
}
function isFormField(node) {
    return node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement;
}
function firstInvalidField(form) {
    const fields = form.querySelectorAll("input, select, textarea");
    for (let i = 0; i < fields.length; i = i + 1) {
        const field = fields[i];
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
            if (!field.checkValidity()) {
                return field;
            }
        }
    }
    return null;
}
function wireFieldMessages(form) {
    const fields = form.querySelectorAll("input, select, textarea");
    fields.forEach(function (field) {
        if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement) && !(field instanceof HTMLTextAreaElement)) {
            return;
        }
        field.addEventListener("input", function () {
            field.setCustomValidity("");
        });
        field.addEventListener("invalid", function () {
            field.setCustomValidity(messageFor(field));
        });
    });
}
function messageFor(field) {
    if (field.validity.valueMissing) {
        return "This field is required so the spider knows where to weave.";
    }
    if (field.validity.typeMismatch) {
        return "Please enter a valid email address.";
    }
    if (field.validity.patternMismatch) {
        return "Please match the requested format.";
    }
    if (field.validity.tooShort) {
        return "Please add a little more detail.";
    }
    return "Please check this field and try again.";
}
function openMailtoFallback(form, status) {
    const fallback = form.getAttribute("action") || "mailto:annoying.goods@gmail.com";
    if (!fallback.toLowerCase().startsWith("mailto:")) {
        announce(status, "The form endpoint is not configured yet. Please use the mailto fallback.");
        return;
    }
    const data = new FormData(form);
    const subject = String(data.get("summary") || data.get("subject") || "Annoying Goods report");
    const lines = [];
    data.forEach(function (value, key) {
        lines.push(key + ": " + String(value));
    });
    const body = encodeURIComponent(lines.join("\n"));
    const separator = fallback.indexOf("?") >= 0 ? "&" : "?";
    const target = fallback + separator + "subject=" + encodeURIComponent(subject) + "&body=" + body;
    announce(status, "Opening your mail app to send the report.");
    window.location.href = target;
}
function postForm(form, endpoint, status, submit, startedAt) {
    if (submit) {
        submit.disabled = true;
    }
    announce(status, "Sending your message.");
    const data = new FormData(form);
    const payload = {};
    data.forEach(function (value, key) {
        payload[key] = String(value);
    });
    payload["form_started_at"] = String(startedAt);
    fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
    }).then(function (response) {
        if (!response.ok) {
            throw new Error("Request failed with status " + String(response.status));
        }
        announce(status, "Message sent. The spider will read it soon.");
        form.reset();
        if (submit) {
            submit.disabled = false;
        }
    }).catch(function (err) {
        void err;
        announce(status, "Sending failed. Please try again or use the mailto fallback.");
        if (submit) {
            submit.disabled = false;
        }
    });
}
function announce(status, message) {
    if (status) {
        status.textContent = message;
    }
}
//# sourceMappingURL=forms.js.map