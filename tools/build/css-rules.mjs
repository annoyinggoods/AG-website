// Single responsibility: count the rules in a stylesheet so a parse error can
// never ship again.
//
// The defect that shipped once was a rule that lost its selector. The browser
// reads the declarations as a rule prelude, swallows the block that follows,
// and the rest of the file after it is parsed against a broken context. The
// build copies the source into the bundle without parsing it, so the defect
// reached the page.
//
// The guard counts two numbers for every stylesheet:
//   authoredRules - the blocks the author wrote that carry declarations.
//   parsedRules   - the blocks a CSS parser keeps, so a block whose prelude
//                   is not a selector never counts.
// The build fails when parsedRules is lower than authoredRules, and when the
// scanner finds a parse problem at all.

const PROPERTY_RE = /^-{0,2}[A-Za-z_][\w-]*$/;

// Remove comments and string literals, so their braces never reach the scanner.
export function stripCssNoise(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      out += " ";
      continue;
    }
    if (ch === "\"" || ch === "'") {
      const quote = ch;
      out += " ";
      i += 1;
      while (i < source.length) {
        const inner = source[i];
        if (inner === "\\") {
          i += 2;
          continue;
        }
        i += 1;
        if (inner === quote) {
          break;
        }
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

// A prelude is a selector list or an at-rule keyword. A prelude that holds a
// declaration or a stray brace is the signature of a rule that lost its
// selector.
function isValidPrelude(prelude) {
  if (prelude.length === 0) {
    return false;
  }
  if (prelude.indexOf(";") !== -1 || prelude.indexOf("}") !== -1) {
    return false;
  }
  return true;
}

function looksLikeDeclaration(text) {
  const trimmed = text.trim();
  const colon = trimmed.indexOf(":");
  if (colon <= 0) {
    return false;
  }
  const property = trimmed.slice(0, colon).trim();
  return PROPERTY_RE.test(property);
}

function shorten(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= 80) {
    return flat;
  }
  return flat.slice(0, 77) + "...";
}

// Walk the stylesheet once and report the rule counts plus every parse
// problem that would cost the browser a rule.
export function inspectStylesheet(source) {
  const text = stripCssNoise(source);
  const errors = [];
  const frames = [];
  let authoredRules = 0;
  let parsedRules = 0;
  let chunk = "";
  let orphanDeclarations = false;

  function currentFrame() {
    if (frames.length === 0) {
      return null;
    }
    return frames[frames.length - 1];
  }

  function markDeclaration(text) {
    const frame = currentFrame();
    if (!frame) {
      if (looksLikeDeclaration(text)) {
        orphanDeclarations = true;
        errors.push("the declaration \"" + shorten(text) + "\" sits outside of a rule, so its selector was lost");
      }
      return;
    }
    if (looksLikeDeclaration(text)) {
      frame.hasDeclaration = true;
    }
  }

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      const prelude = chunk.trim();
      chunk = "";
      const isAtRule = prelude.charAt(0) === "@";
      const swallowed = orphanDeclarations && !isAtRule;
      const valid = isAtRule || isValidPrelude(prelude);
      orphanDeclarations = false;
      if (swallowed) {
        errors.push("the block for \"" + shorten(prelude) + "\" is swallowed by the declarations that lost their selector");
      } else if (!valid) {
        errors.push("the rule prelude \"" + shorten(prelude) + "\" holds a declaration, so the selector was lost");
      }
      frames.push({ prelude: prelude, hasDeclaration: false, isAtRule: isAtRule, valid: valid && !swallowed });
      continue;
    }
    if (ch === "}") {
      markDeclaration(chunk);
      chunk = "";
      if (frames.length === 0) {
        errors.push("a closing brace has no matching opening brace");
        continue;
      }
      const frame = frames.pop();
      if (frame.hasDeclaration) {
        authoredRules += 1;
        if (frame.valid) {
          parsedRules += 1;
        }
      }
      continue;
    }
    if (ch === ";") {
      markDeclaration(chunk);
      chunk = "";
      continue;
    }
    chunk += ch;
  }

  if (frames.length > 0) {
    errors.push(frames.length + " block(s) are never closed");
  }

  return {
    authoredRules: authoredRules,
    parsedRules: parsedRules,
    errors: errors
  };
}

// Compare the rules the bundle keeps with the rules the sources wrote.
export function findRuleLoss(sources, bundle) {
  let authored = 0;
  for (let i = 0; i < sources.length; i += 1) {
    authored += sources[i].authoredRules;
  }
  if (bundle.parsedRules >= authored && bundle.errors.length === 0) {
    return null;
  }
  const detail = bundle.errors.length > 0 ? bundle.errors[0] : "the compiled stylesheet lost a rule";
  return "the compiled stylesheet keeps " + String(bundle.parsedRules) + " of " + String(authored) + " rules: " + detail;
}
