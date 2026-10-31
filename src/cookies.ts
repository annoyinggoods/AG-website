import { readLocalString, writeLocalString } from "./utils-dom.js";
const COOKIE_STORAGE_KEY = "ag-cookie-consent";
const COOKIE_CONSENT_VERSION = 1;
const CONSENT_ATTRIBUTE = "data-cookie";
type ConsentChoice = "accepted" | "declined" | "unset";
interface ConsentRecord {
  choice: ConsentChoice;
  version: number;
  updatedAt: string;
}
export function initCookies(): void {
  const banner = document.querySelector("[data-cookie-banner]");
  if (!(banner instanceof HTMLElement)) {
    return;
  }
  const ok = banner.querySelector("[data-cookie-ok]");
  const exit = banner.querySelector("[data-cookie-exit]");
  const record = readConsent();
  if (record.choice === "unset") {
    banner.classList.add("is-visible");
  }
  if (ok instanceof HTMLButtonElement) {
    ok.addEventListener("click", function (): void {
      saveConsent("accepted");
      hideBanner(banner);
    });
  }
  if (exit instanceof HTMLButtonElement) {
    exit.addEventListener("click", function (): void {
      saveConsent("declined");
      hideBanner(banner);
    });
  }
  wireSettingsLink(banner);
}
// The banner is visible by default so it also reaches a visitor without
// scripting. The pre-paint snippet marks the document as decided, and this
// hides the banner again once a choice has been stored.
function hideBanner(banner: HTMLElement): void {
  banner.classList.remove("is-visible");
  document.documentElement.setAttribute(CONSENT_ATTRIBUTE, "set");
}
function showBanner(banner: HTMLElement): void {
  banner.classList.add("is-visible");
}
function readConsent(): ConsentRecord {
  const raw = readLocalString(COOKIE_STORAGE_KEY);
  if (!raw) {
    return { choice: "unset", version: COOKIE_CONSENT_VERSION, updatedAt: "" };
  }
  try {
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (
      (parsed.choice === "accepted" || parsed.choice === "declined") &&
      parsed.version === COOKIE_CONSENT_VERSION
    ) {
      return {
        choice: parsed.choice,
        version: parsed.version,
        updatedAt: parsed.updatedAt || "",
      };
    }
    return { choice: "unset", version: COOKIE_CONSENT_VERSION, updatedAt: "" };
  } catch (err) {
    void err;
    const trimmed = raw.trim();
    if (trimmed === "accepted" || trimmed === "declined" || trimmed === "unset") {
      return { choice: trimmed, version: COOKIE_CONSENT_VERSION, updatedAt: "" };
    }
    return { choice: "unset", version: COOKIE_CONSENT_VERSION, updatedAt: "" };
  }
}
function saveConsent(choice: ConsentChoice): void {
  const record: ConsentRecord = {
    choice: choice,
    version: COOKIE_CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  writeLocalString(COOKIE_STORAGE_KEY, JSON.stringify(record));
}
function wireSettingsLink(banner: HTMLElement): void {
  const links = document.querySelectorAll("[data-cookie-settings]");
  links.forEach(function (link: Element): void {
    link.addEventListener("click", function (event: Event): void {
      event.preventDefault();
      showBanner(banner);
      const ok = banner.querySelector("[data-cookie-ok]");
      if (ok instanceof HTMLElement) {
        ok.focus();
      }
    });
  });
}
