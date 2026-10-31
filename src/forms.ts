export function initForms(): void {
  const forms = document.querySelectorAll("form.contact-form");
  forms.forEach(function (form: Element): void {
    if (form instanceof HTMLFormElement) {
      wireForm(form);
    }
  });
}
function wireForm(form: HTMLFormElement): void {
  const startedAt = Math.floor(Date.now() / 1000);
  const status = form.querySelector("[data-form-status]");
  const submit = form.querySelector("button[type='submit']");
  const endpoint = (form.getAttribute("data-endpoint") || "").trim();
  wireFieldMessages(form);
  // The browser refuses to send a form with an empty field, so the submit
  // event never arrives. The invalid event does, and it does not bubble, so
  // the form listens for it while the event is on its way down.
  form.addEventListener("invalid", function (event: Event): void {
    if (!isFormField(event.target)) {
      return;
    }
    announce(status, "Please complete the required fields before sending.");
  }, true);
  form.addEventListener("submit", function (event: Event): void {
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
function isFormField(node: EventTarget | null): boolean {
  return node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement;
}
function firstInvalidField(form: HTMLFormElement): HTMLElement | null {
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
function wireFieldMessages(form: HTMLFormElement): void {
  const fields = form.querySelectorAll("input, select, textarea");
  fields.forEach(function (field: Element): void {
    if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement) && !(field instanceof HTMLTextAreaElement)) {
      return;
    }
    field.addEventListener("input", function (): void {
      field.setCustomValidity("");
    });
    field.addEventListener("invalid", function (): void {
      field.setCustomValidity(messageFor(field));
    });
  });
}
function messageFor(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
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
function openMailtoFallback(form: HTMLFormElement, status: Element | null): void {
  const fallback = form.getAttribute("action") || "mailto:spider@annoyinggoods.com";
  if (!fallback.toLowerCase().startsWith("mailto:")) {
    announce(status, "The form endpoint is not configured yet. Please use the mailto fallback.");
    return;
  }
  const data = new FormData(form);
  const subject = String(data.get("summary") || data.get("subject") || "Annoying Goods report");
  const lines: string[] = [];
  data.forEach(function (value: FormDataEntryValue, key: string): void {
    lines.push(key + ": " + String(value));
  });
  const body = encodeURIComponent(lines.join("\n"));
  const separator = fallback.indexOf("?") >= 0 ? "&" : "?";
  const target = fallback + separator + "subject=" + encodeURIComponent(subject) + "&body=" + body;
  announce(status, "Opening your mail app to send the report.");
  window.location.href = target;
}
function postForm(
  form: HTMLFormElement,
  endpoint: string,
  status: Element | null,
  submit: HTMLButtonElement | null,
  startedAt: number
): void {
  if (submit) {
    submit.disabled = true;
  }
  announce(status, "Sending your message.");
  const data = new FormData(form);
  const payload: Record<string, string> = {};
  data.forEach(function (value: FormDataEntryValue, key: string): void {
    payload[key] = String(value);
  });
  payload["form_started_at"] = String(startedAt);
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  }).then(function (response: Response): void {
    if (!response.ok) {
      throw new Error("Request failed with status " + String(response.status));
    }
    announce(status, "Message sent. The spider will read it soon.");
    form.reset();
    if (submit) {
      submit.disabled = false;
    }
  }).catch(function (err: unknown): void {
    void err;
    announce(status, "Sending failed. Please try again or use the mailto fallback.");
    if (submit) {
      submit.disabled = false;
    }
  });
}
function announce(status: Element | null, message: string): void {
  if (status) {
    status.textContent = message;
  }
}
