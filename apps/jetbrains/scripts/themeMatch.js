// Resolves the color and font style a VS Code theme gives to a TextMate scope stack.
// The stack is walked from the outermost scope to the innermost one; at each level the most specific
// matching rule is picked and only the properties it sets (foreground, fontStyle) replace the inherited ones,
// which is how VS Code's tokenizer styles a token.

const NOT_SET = -1;
const STYLE_BITS = { italic: 1, bold: 2, underline: 4, strikethrough: 8 };

function parseFontStyle(text) {
  if (text === undefined) return NOT_SET;
  return text.split(/\s+/).reduce((bits, word) => bits | (STYLE_BITS[word] ?? 0), 0);
}

function selectorsOf(scope) {
  const list = Array.isArray(scope) ? scope : [scope];
  return list
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** A selector "a b c" targets scope c under ancestors a, b; parents are kept nearest first. */
function toRules(tokenColors) {
  const rules = [];
  tokenColors.forEach(({ scope, settings }, order) => {
    if (!scope || !settings) return;
    const style = {
      foreground: settings.foreground,
      fontStyle: parseFontStyle(settings.fontStyle),
    };
    for (const selector of selectorsOf(scope)) {
      const parts = selector.split(/\s+/);
      rules.push({
        scope: parts[parts.length - 1],
        parents: parts.length > 1 ? parts.slice(0, -1).reverse() : null,
        order,
        ...style,
      });
    }
  });
  return rules;
}

function segmentsOf(scope) {
  return scope.split('.');
}

function isPrefix(prefix, scope) {
  const a = segmentsOf(prefix);
  const b = segmentsOf(scope);
  return a.length <= b.length && a.every((part, i) => part === b[i]);
}

function sameParents(a, b) {
  return (
    (a === null && b === null) || (a && b && a.length === b.length && a.every((v, i) => v === b[i]))
  );
}

function parentsMatch(parents, stackAbove) {
  if (parents === null) return true;
  let next = 0;
  for (let i = stackAbove.length - 1; i >= 0 && next < parents.length; i--) {
    if (isPrefix(parents[next], stackAbove[i])) next++;
  }
  return next === parents.length;
}

/** Rules that apply to a scope name: every rule whose scope is a dot-prefix, merged per distinct parent list. */
function candidatesFor(rules, scope) {
  const ordered = rules
    .filter((rule) => isPrefix(rule.scope, scope))
    .sort(
      (a, b) =>
        segmentsOf(a.scope).length - segmentsOf(b.scope).length ||
        Number(a.parents !== null) - Number(b.parents !== null) ||
        a.order - b.order
    );
  const merged = [];
  for (const rule of ordered) {
    let into = merged.find((m) => sameParents(m.parents, rule.parents));
    if (!into) {
      // a parent-scoped rule starts from what the same scope already gets without parents
      const base = rule.parents ? merged.find((m) => m.parents === null) : null;
      into = {
        parents: rule.parents,
        depth: 0,
        foreground: base?.foreground,
        fontStyle: base?.fontStyle ?? NOT_SET,
      };
      merged.push(into);
    }
    into.depth = segmentsOf(rule.scope).length;
    if (rule.foreground !== undefined) into.foreground = rule.foreground;
    if (rule.fontStyle !== NOT_SET) into.fontStyle = rule.fontStyle;
  }
  return merged.sort((a, b) => b.depth - a.depth || compareParents(a.parents, b.parents));
}

/** Longer parent selectors win position by position (nearest first), then more parents win. */
function compareParents(a, b) {
  const left = a ?? [];
  const right = b ?? [];
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i].length !== right[i].length) return right[i].length - left[i].length;
  }
  return right.length - left.length;
}

/**
 * @param {object[]} tokenColors the theme's tokenColors
 * @returns {(stack: string) => {foreground: string | undefined, fontStyle: number}}
 */
function createResolver(tokenColors) {
  const rules = toRules(tokenColors);
  const cache = new Map();
  return (stack) => {
    const scopes = stack.split(/\s+/);
    let foreground;
    let fontStyle = 0;
    scopes.forEach((scope, i) => {
      if (!cache.has(scope)) cache.set(scope, candidatesFor(rules, scope));
      const above = scopes.slice(0, i);
      const hit = cache.get(scope).find((rule) => parentsMatch(rule.parents, above));
      if (!hit) return;
      if (hit.foreground !== undefined) foreground = hit.foreground;
      if (hit.fontStyle !== NOT_SET) fontStyle = hit.fontStyle;
    });
    return { foreground, fontStyle };
  };
}

module.exports = { createResolver, STYLE_BITS };
