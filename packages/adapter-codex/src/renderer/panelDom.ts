/*
 * DOM helpers shared by the sections the overlay adds to Codex's Appearance settings.
 */

/** Class names copied from Codex's own settings section, or Woodfish fallbacks. */
export interface Look {
  section: string;
  header: string;
  title: string;
  body: string;
  card: string;
  cardStyle: string;
  row: string;
  rowLeft: string;
  labelWrap: string;
  label: string;
  description: string;
  rowRight: string;
}

function classOf(element: Element | null | undefined, fallback: string): string {
  const value = element?.getAttribute('class');
  return value && value.trim() ? value : fallback;
}

/**
 * Reads the layout classes of the Appearance page so the Woodfish section looks native,
 * even after Codex restyles its settings. Anything missing falls back to Woodfish CSS.
 */
export function readLook(anchorSection: Element): Look {
  const header = anchorSection.children[0];
  const body = anchorSection.children[1];
  const card = body?.querySelector('[class*="rounded-2xl"]') ?? body?.firstElementChild;
  const rows = [...document.querySelectorAll('[class*="settings-row"]')].filter(
    (row) => row.children.length === 2 && row.querySelector('[class*="font-medium"]')
  );
  const row = rows[rows.length - 1];
  const left = row?.children[0];
  const labelWrap = left?.firstElementChild;
  return {
    section: classOf(anchorSection, 'woodfish-settings-fallback-section'),
    header: classOf(header, ''),
    title: classOf(
      header?.querySelector('[class*="font-medium"]'),
      'woodfish-settings-fallback-title'
    ),
    body: classOf(body, 'woodfish-settings-fallback-section'),
    card: classOf(card, 'woodfish-settings-fallback-card'),
    cardStyle: card?.getAttribute('style') ?? '',
    row: classOf(row, 'woodfish-settings-fallback-row'),
    rowLeft: classOf(left, ''),
    labelWrap: classOf(labelWrap, ''),
    label: classOf(labelWrap?.firstElementChild, 'woodfish-settings-label'),
    description: 'woodfish-settings-description',
    rowRight: classOf(row?.children[1], ''),
  };
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  attributes: Record<string, string> = {},
  children: Array<Node | string> = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

export function labelBlock(look: Look, label: string, description: string): HTMLElement {
  return element('div', look.rowLeft, {}, [
    element('div', look.labelWrap, {}, [
      element('div', look.label, {}, [label]),
      element('div', look.description, {}, [description]),
    ]),
  ]);
}
