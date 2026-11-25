/** Mirrors only native geometry declarations. The original rules, layers and markup stay intact. */
import { eligible, scaleNativeLength } from './squircle';

const LENGTH = /^(\d*\.?\d+)(px|rem|em)$/;
const FULL = /%|infinity|--(?:radius-full|vscode-cornerRadius-circle)\b/;
const RADIUS = /^border(?:-(?:top|bottom)-(?:left|right)|-(?:start|end)-(?:start|end))?-radius$/;

/** The shape and any fixed radius missing from the host's theme tokens, per written corner. */
export function nativeCorner(value: string): { radius: string; shape: string } {
  if (FULL.test(value) || /^0(?:px)?$/.test(value)) return { radius: value, shape: 'round' };
  if (/^(inherit|initial|unset|revert|revert-layer)$/.test(value))
    return { radius: value, shape: value };
  const fixed = LENGTH.exec(value);
  if (fixed && fixed[2] === 'px') {
    const radius = Number(fixed[1]);
    return radius < 5 || radius >= 100
      ? { radius: value, shape: 'round' }
      : {
          radius: 'calc(' + value + ' * var(--squircle-k, 1))',
          shape: 'var(--squircle-shape, round)',
        };
  }
  const raw = originalRadii(value);
  return {
    radius: scaleNativeLength(raw),
    shape: 'var(--woodfish-native-shape, superellipse(calc(1 + ' + eligible(raw) + ')))',
  };
}

// Preserve the source of local aliases (e.g. --button-radius), including aliases of theme tokens.
function originalRadii(value: string): string {
  return value.replace(
    /var\((--[\w-]*radius[\w-]*)\)/gi,
    (whole: string, name: string) => 'var(--woodfish-original' + name + ', ' + whole + ')'
  );
}

function declarations(style: CSSStyleDeclaration): string {
  const result: string[] = [];
  const props = Array.from(style);
  // Chromium exposes pending var() shorthands as four empty longhands and one readable shorthand.
  const shorthand = style.getPropertyValue('border-radius');
  if (shorthand) props.push('border-radius');
  for (const prop of new Set(props)) {
    if (prop.startsWith('--') && /radius/i.test(prop) && !prop.startsWith('--woodfish-')) {
      result.push('--woodfish-original' + prop + ':' + originalRadii(style.getPropertyValue(prop)));
      continue;
    }
    if (shorthand && /^border-(top|bottom)-/.test(prop)) continue;
    if (!RADIUS.test(prop)) continue;
    const v = style.getPropertyValue(prop).trim();
    // Split shorthand only outside functions, keeping var() fallbacks and calc() whole.
    const words = v.match(/(?:[^\s()/]+|\((?:[^()]|\([^()]*\))*\))+/g) ?? [];
    if (!words.length || v.includes('/') || words.length > 4) continue;
    const corners = words.map(nativeCorner);
    const important = style.getPropertyPriority(prop) ? ' !important' : '';
    const radius = corners.map((c) => c.radius).join(' ');
    // The later token or zero still needs to supersede an earlier fixed radius in this sheet.
    result.push(prop + ':' + radius + important);
    const shape = prop.replace('border', 'corner').replace('radius', 'shape');
    // A host's explicit shape (for instance a circular switch thumb) takes precedence.
    if (!style.getPropertyValue(shape))
      result.push(shape + ':' + corners.map((c) => c.shape).join(' ') + important);
  }
  return result.join(';');
}

function mirror(rules: CSSRuleList): string {
  const out: string[] = [];
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      const decl = declarations(rule.style);
      const nested = rule.cssRules?.length ? mirror(rule.cssRules) : '';
      if (decl || nested) out.push(rule.selectorText + '{' + decl + ';' + nested + '}');
    } else if (
      'cssRules' in rule &&
      /^(?:@media|@supports|@container|@layer|@scope)\b/.test(rule.cssText)
    ) {
      const nested = mirror((rule as CSSGroupingRule).cssRules);
      if (nested)
        out.push(rule.cssText.substring(0, rule.cssText.indexOf('{')) + '{' + nested + '}');
    }
  }
  return out.join('\n');
}

type SheetNode = HTMLStyleElement | HTMLLinkElement;
/** Scan each host stylesheet once, including styles loaded later for a menu or settings page. */
export function startNativeCorners(): () => void {
  if (!globalThis.CSS?.supports?.('corner-shape', 'squircle')) return () => undefined;
  const copies = new Map<SheetNode, HTMLStyleElement>();
  const scan = (node: Node): void => {
    if (
      !(node instanceof HTMLStyleElement || node instanceof HTMLLinkElement) ||
      !node.sheet ||
      (node.id.includes('woodfish') &&
        !/fx-(?:accent|caret|glass|stream-cursor)-js$/.test(node.id)) ||
      node.hasAttribute('data-woodfish-native-corners') ||
      node.hasAttribute('data-woodfish-theme') ||
      node.hasAttribute('data-woodfish-user-css')
    )
      return;
    let rules: CSSRuleList;
    try {
      rules = node.sheet.cssRules;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'SecurityError') return;
      throw err;
    }
    const css = mirror(rules);
    let copy = copies.get(node);
    if (!css) {
      copy?.remove();
      copies.delete(node);
      return;
    }
    if (!copy) {
      copy = document.createElement('style');
      copy.setAttribute('data-woodfish-native-corners', '');
      copy.media = node.media;
      copy.nonce = node.nonce;
      copies.set(node, copy);
      node.after(copy);
    }
    copy.textContent = css;
  };
  for (const sheet of Array.from(document.styleSheets)) if (sheet.ownerNode) scan(sheet.ownerNode);
  const observer = new MutationObserver((records) => {
    const changed = new Set<Node>();
    for (const record of records) {
      changed.add(record.target);
      record.addedNodes.forEach((node) => changed.add(node));
      record.removedNodes.forEach((node) => {
        if (node instanceof HTMLStyleElement || node instanceof HTMLLinkElement) {
          copies.get(node)?.remove();
          copies.delete(node);
        }
      });
    }
    changed.forEach(scan);
  });
  observer.observe(document.head, { childList: true, subtree: true });
  // Monaco menus may have their own shadow tree. Discover it on interaction, without watching editor rows.
  const roots = new WeakSet<ShadowRoot>();
  const adopted = new Set<HTMLStyleElement>();
  const enterShadow = (event: Event): void => {
    for (const root of event.composedPath()) {
      if (!(root instanceof ShadowRoot) || roots.has(root)) continue;
      roots.add(root);
      // A fresh context menu can replace the whole previous shadow tree.
      for (const [source] of copies) if (!source.isConnected) copies.delete(source);
      for (const copy of adopted) if (!copy.isConnected) adopted.delete(copy);
      for (const sheet of Array.from(root.styleSheets)) if (sheet.ownerNode) scan(sheet.ownerNode);
      const css = root.adoptedStyleSheets.map((sheet) => mirror(sheet.cssRules)).join('\n');
      if (css) {
        const copy = document.createElement('style');
        copy.setAttribute('data-woodfish-native-corners', '');
        copy.textContent = css;
        root.append(copy);
        adopted.add(copy);
      }
    }
  };
  document.addEventListener('focusin', enterShadow, true);
  document.addEventListener('pointerover', enterShadow, true);
  const loaded = (e: Event): void => {
    if (e.target instanceof HTMLLinkElement) scan(e.target);
  };
  document.addEventListener('load', loaded, true);
  return () => {
    document.removeEventListener('focusin', enterShadow, true);
    document.removeEventListener('pointerover', enterShadow, true);
    adopted.forEach((copy) => copy.remove());
    observer.disconnect();
    document.removeEventListener('load', loaded, true);
    copies.forEach((copy) => copy.remove());
  };
}
