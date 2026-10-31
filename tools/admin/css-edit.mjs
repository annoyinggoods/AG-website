// The panel writes a value into the rule that owns an element.
// The rule is found by its selector, so the file stays readable and the
// change sits next to the values it belongs with.

const PROPERTY_PATTERN = /^[a-zA-Z-][a-zA-Z0-9-]*$/;
const CONDITIONAL_AT_RULES = ["media", "supports", "container", "layer"];

// The end of the string that starts at the given position.
function skipString(source, start) {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === quote) {
      return i + 1;
    }
    i += 1;
  }
  return i;
}

// Every comment character becomes a space, so a selector never carries a
// comment with it and the offsets of the blocks still point at the original
// file. The strings are left alone, because a comment marker inside a
// string is text and not a comment.
export function maskComments(source) {
  const characters = source.split("");
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      for (let j = i; j < stop; j += 1) {
        characters[j] = " ";
      }
      i = stop;
      continue;
    }
    if (ch === "\"" || ch === "'") {
      i = skipString(source, i);
      continue;
    }
    i += 1;
  }
  return characters.join("");
}

// A rule inside a media query, a supports query, a container query or a
// layer only applies in that case, so it must never take a plain value.
function isConditionalAtRule(prelude) {
  if (!prelude || prelude.charAt(0) !== "@") {
    return false;
  }
  const name = prelude.slice(1).split(/[\s({]/)[0].toLowerCase();
  return CONDITIONAL_AT_RULES.indexOf(name) !== -1;
}

// Every rule in the file, at any depth, with the range of its block and the
// note whether it only applies inside a conditional block.
export function scanRules(source) {
  const masked = maskComments(source);
  const rules = [];
  const stack = [];
  let preludeStart = 0;
  let i = 0;
  while (i < masked.length) {
    const ch = masked[i];
    if (ch === "\"" || ch === "'") {
      i = skipString(masked, i);
      continue;
    }
    if (ch === "{") {
      const prelude = masked.slice(preludeStart, i).trim();
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      stack.push({
        prelude: prelude,
        blockStart: i + 1,
        conditional: isConditionalAtRule(prelude) || (parent !== null && parent.conditional)
      });
      preludeStart = i + 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      const frame = stack.pop();
      if (frame) {
        rules.push({
          prelude: frame.prelude,
          blockStart: frame.blockStart,
          blockEnd: i,
          conditional: frame.conditional
        });
      }
      preludeStart = i + 1;
      i += 1;
      continue;
    }
    if (ch === ";") {
      preludeStart = i + 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  return rules;
}

// A rule matches a candidate when one of its selectors is exactly the
// candidate. A selector with a combinator belongs to a different element.
function ruleMatches(rule, candidate) {
  if (!rule.prelude || rule.prelude.charAt(0) === "@") {
    return false;
  }
  const parts = rule.prelude.split(",");
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i].trim();
    if (part === candidate) {
      return true;
    }
  }
  return false;
}

function firstMatchingRule(rules, candidates, wanted) {
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    for (let j = 0; j < rules.length; j += 1) {
      if (rules[j].conditional !== wanted) {
        continue;
      }
      if (ruleMatches(rules[j], candidate)) {
        return rules[j];
      }
    }
  }
  return null;
}

// The rule a value may be written into. A rule that always applies wins, and
// a rule inside a media query is only used when no plain rule owns the
// selector. The answer says which one it is, so the caller can refuse the
// write instead of changing a copy of the rule.
export function findRuleForWrite(source, candidates) {
  const rules = scanRules(source);
  const plain = firstMatchingRule(rules, candidates, false);
  if (plain) {
    return { rule: plain, conditional: false };
  }
  const nested = firstMatchingRule(rules, candidates, true);
  if (nested) {
    return { rule: nested, conditional: true };
  }
  return null;
}

// The rule that owns the selector, or nothing when the file has no such rule.
export function findRule(source, candidates) {
  const found = findRuleForWrite(source, candidates);
  return found ? found.rule : null;
}

// Write one declaration into the block of a rule.
export function setDeclaration(source, rule, property, value) {
  if (!PROPERTY_PATTERN.test(property)) {
    throw new Error("The property " + property + " is not a property name.");
  }
  const block = source.slice(rule.blockStart, rule.blockEnd);
  const pattern = new RegExp("(^|[;{\\s])(" + property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\s*:\\s*([^;}]*)");
  const match = pattern.exec(block);
  if (match) {
    const start = rule.blockStart + match.index + match[1].length;
    const end = rule.blockStart + match.index + match[0].length;
    return source.slice(0, start) + property + ": " + value + source.slice(end);
  }
  const indent = indentOf(source, rule);
  const insertion = "\n  " + property + ": " + value + ";";
  return source.slice(0, rule.blockEnd) + insertion + "\n" + source.slice(rule.blockEnd);
}

function indentOf(source, rule) {
  const lineStart = source.lastIndexOf("\n", rule.blockStart) + 1;
  const line = source.slice(lineStart, rule.blockStart);
  const match = /^\s*/.exec(line);
  return match ? match[0] : "";
}

// Add a rule at the end of the file when no rule owns the selector yet.
export function appendRule(source, selector, property, value) {
  const block = "\n" + selector + " {\n  " + property + ": " + value + ";\n}\n";
  return source.replace(/\s*$/, "\n") + block;
}

export function removeDeclaration(source, rule, property) {
  const block = source.slice(rule.blockStart, rule.blockEnd);
  const pattern = new RegExp("\\s*" + property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:[^;}]*;?");
  const match = pattern.exec(block);
  if (!match) {
    return source;
  }
  const start = rule.blockStart + match.index;
  const end = rule.blockStart + match.index + match[0].length;
  return source.slice(0, start) + source.slice(end);
}

// The declarations a rule holds, so a reset can show what the file really says.
export function readDeclarations(source, rule) {
  const block = source.slice(rule.blockStart, rule.blockEnd);
  const found = new Map();
  const pattern = /([a-zA-Z-][a-zA-Z0-9-]*)\s*:\s*([^;}]+)/g;
  let match = pattern.exec(block);
  while (match !== null) {
    const name = match[1];
    const value = match[2].trim();
    if (!found.has(name)) {
      found.set(name, value);
    }
    match = pattern.exec(block);
  }
  return found;
}
