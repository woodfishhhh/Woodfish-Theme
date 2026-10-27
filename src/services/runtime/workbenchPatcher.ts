export const WOODFISH_MARKER_START = '<!-- WOODFISH_THEME_START -->';
export const WOODFISH_MARKER_END = '<!-- WOODFISH_THEME_END -->';

const WOODFISH_BLOCK_PATTERN = new RegExp(
  `${WOODFISH_MARKER_START}[\\s\\S]*?${WOODFISH_MARKER_END}`,
  'g'
);

const STYLE_TAG_PATTERN = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
const LINK_TAG_PATTERN = /<link\b[^>]*>/gi;
const LEGACY_WOODFISH_CONTEXT_TOKENS = ['bearded theme', 'bearded%20theme', 'woodfish-theme'];
const LEGACY_WOODFISH_ASSET_TOKENS = [
  'glow-effects.css',
  'syntax-highlighting.css',
  'cursor-core.css',
  'cursor-glow.css',
  'cursor-loader.css',
  'cursor-animation.css',
  'activity-bar.css',
  'tab-bar.css',
  'index-all.css',
  'index-base.css',
  'index-with-glow.css',
  'index-with-rainbow.css',
  'transparent-ui.css',
  'woodfish-theme-test.css',
];

export type LegacyWoodfishPayloadMatch = {
  fragment: string;
  signature: string;
};

export type LegacyWoodfishRemovalResult = {
  html: string;
  removed: LegacyWoodfishPayloadMatch[];
};

function isKnownLegacyWoodfishFragment(fragment: string): LegacyWoodfishPayloadMatch | null {
  const normalized = fragment.toLowerCase();
  const hasWoodfishContext = LEGACY_WOODFISH_CONTEXT_TOKENS.some((token) =>
    normalized.includes(token)
  );

  if (!hasWoodfishContext) {
    return null;
  }

  const signature = LEGACY_WOODFISH_ASSET_TOKENS.find((token) => normalized.includes(token));
  if (!signature) {
    return null;
  }

  return {
    fragment,
    signature,
  };
}

export function findKnownLegacyWoodfishPayloads(htmlContent: string): LegacyWoodfishPayloadMatch[] {
  const fragments = [
    ...(htmlContent.match(STYLE_TAG_PATTERN) ?? []),
    ...(htmlContent.match(LINK_TAG_PATTERN) ?? []),
  ];
  const seen = new Set<string>();
  const matches: LegacyWoodfishPayloadMatch[] = [];

  for (const fragment of fragments) {
    const match = isKnownLegacyWoodfishFragment(fragment);
    if (!match || seen.has(match.fragment)) {
      continue;
    }

    seen.add(match.fragment);
    matches.push(match);
  }

  return matches;
}

export function removeKnownLegacyWoodfishPayloads(
  htmlContent: string
): LegacyWoodfishRemovalResult {
  const removed = findKnownLegacyWoodfishPayloads(htmlContent);
  let html = htmlContent;

  if (removed.length === 0) {
    // Never rewrite a document Woodfish has not touched (keeps VS Code's checksum valid).
    return { html: htmlContent, removed };
  }

  for (const match of removed) {
    html = html.replace(match.fragment, '');
  }

  return {
    html: html.replace(/\n{3,}/g, '\n\n'),
    removed,
  };
}

export function hasWoodfishPayload(htmlContent: string): boolean {
  WOODFISH_BLOCK_PATTERN.lastIndex = 0;
  return WOODFISH_BLOCK_PATTERN.test(htmlContent);
}

const BLOCK_SOURCE = `${WOODFISH_MARKER_START}[\\s\\S]*?${WOODFISH_MARKER_END}`;
const BLOCK_WITH_TRAILING_NEWLINE = new RegExp(`${BLOCK_SOURCE}\\r?\\n`, 'g');
const BLOCK_WITH_LEADING_NEWLINE = new RegExp(`\\r?\\n?${BLOCK_SOURCE}`, 'g');

/**
 * Inverse of {@link injectWorkbenchPayload}: removes exactly the block and the
 * newline the injector added, so an untouched document is returned unchanged and
 * a patched one is restored byte for byte.
 */
export function removeWorkbenchPayload(htmlContent: string): string {
  if (!hasWoodfishPayload(htmlContent)) {
    return htmlContent;
  }

  return htmlContent
    .replace(BLOCK_WITH_TRAILING_NEWLINE, '')
    .replace(BLOCK_WITH_LEADING_NEWLINE, '');
}

export function injectWorkbenchPayload(htmlContent: string, payload: string): string {
  const cleaned = removeWorkbenchPayload(htmlContent);
  const block = `${WOODFISH_MARKER_START}\n${payload}\n${WOODFISH_MARKER_END}`;

  if (cleaned.includes('</html>')) {
    return cleaned.replace('</html>', `${block}\n</html>`);
  }

  return `${cleaned}\n${block}`;
}
