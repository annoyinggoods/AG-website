// The panel refuses a value that would break the layout, and it says what is
// wrong in plain words before anything is written. The rules live here so the
// helper and the browser check a value in exactly the same way.

const LENGTH_UNITS = ["px", "rem", "em", "ch", "ex", "vw", "vh", "vmin", "vmax", "%", "fr"];
const LENGTH_FUNCTIONS = ["calc(", "min(", "max(", "clamp(", "var("];
const POSITION_VALUES = ["static", "relative", "absolute", "fixed", "sticky"];
const COLOUR_KEYWORDS = ["currentcolor", "transparent", "inherit"];
const GRADIENT_FUNCTIONS = ["linear-gradient(", "radial-gradient(", "conic-gradient("];

function refusal(property, value, reason) {
  return { ok: false, message: property + ": " + value + " " + reason };
}

function accepted() {
  return { ok: true, message: "" };
}

function isNegativeNumber(value) {
  return /^-\s*[0-9]/.test(value);
}

function isLength(value) {
  if (value === "0") {
    return true;
  }
  if (/^[+-]?[0-9]*\.?[0-9]+[a-z%]+$/i.test(value)) {
    const unit = value.slice(value.search(/[a-z%]/i)).toLowerCase();
    return LENGTH_UNITS.indexOf(unit) !== -1;
  }
  const lower = value.toLowerCase();
  for (const name of LENGTH_FUNCTIONS) {
    if (lower.indexOf(name) === 0) {
      return true;
    }
  }
  return false;
}

function isColour(value) {
  const lower = value.toLowerCase();
  if (COLOUR_KEYWORDS.indexOf(lower) !== -1) {
    return true;
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) {
    return true;
  }
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(value)) {
    return true;
  }
  return lower.indexOf("var(") === 0;
}

function isImage(value) {
  const lower = value.toLowerCase();
  if (lower === "none") {
    return true;
  }
  if (lower.indexOf("url(") === 0 || lower.indexOf("var(") === 0) {
    return true;
  }
  for (const name of GRADIENT_FUNCTIONS) {
    if (lower.indexOf(name) === 0) {
      return true;
    }
  }
  return false;
}

function checkLength(property, value) {
  if (isNegativeNumber(value)) {
    return refusal(property, value, "is negative, so the element would collapse.");
  }
  if (!isLength(value)) {
    return refusal(property, value, "is not a length. Use a number with a unit, for example 12rem.");
  }
  return accepted();
}

function checkZIndex(property, value) {
  if (value.toLowerCase() === "auto") {
    return accepted();
  }
  if (/^-?[0-9]+$/.test(value)) {
    return accepted();
  }
  if (/^-?[0-9]*\.[0-9]+$/.test(value)) {
    return refusal(property, value, "is not a whole number.");
  }
  return refusal(property, value, "is not a number.");
}

function checkPosition(property, value) {
  if (POSITION_VALUES.indexOf(value.toLowerCase()) === -1) {
    return refusal(property, value, "is not a position value.");
  }
  return accepted();
}

function checkColour(property, value) {
  if (!isColour(value)) {
    return refusal(property, value, "is not a colour. Use a hex colour such as #1a1a2e, or a rgb() value.");
  }
  return accepted();
}

function checkImage(property, value) {
  if (!isImage(value)) {
    return refusal(property, value, "is not an image. Use none, a url(), a gradient or a var() reference.");
  }
  return accepted();
}

// The answer for one property and one value. An empty value removes the
// declaration, and that is always allowed.
export function validateValue(property, value) {
  const clean = String(value === undefined || value === null ? "" : value).trim();
  if (clean === "") {
    return accepted();
  }
  const name = String(property === undefined || property === null ? "" : property).trim().toLowerCase();
  if (name === "height" || name === "width") {
    return checkLength(name, clean);
  }
  if (name === "z-index") {
    return checkZIndex(name, clean);
  }
  if (name === "position") {
    return checkPosition(name, clean);
  }
  if (name === "color" || name === "background-color") {
    return checkColour(name, clean);
  }
  if (name === "background-image") {
    return checkImage(name, clean);
  }
  return accepted();
}
