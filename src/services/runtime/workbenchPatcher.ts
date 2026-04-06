export const WOODFISH_MARKER_START = '<!-- WOODFISH_THEME_START -->';
export const WOODFISH_MARKER_END = '<!-- WOODFISH_THEME_END -->';

const WOODFISH_BLOCK_PATTERN = new RegExp(
  `${WOODFISH_MARKER_START}[\\s\\S]*?${WOODFISH_MARKER_END}`,
  'g'
);

export function hasWoodfishPayload(htmlContent: string): boolean {
  WOODFISH_BLOCK_PATTERN.lastIndex = 0;
  return WOODFISH_BLOCK_PATTERN.test(htmlContent);
}

export function removeWorkbenchPayload(htmlContent: string): string {
  WOODFISH_BLOCK_PATTERN.lastIndex = 0;
  return htmlContent
    .replace(WOODFISH_BLOCK_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n<\/html>/g, '</html>');
}

export function injectWorkbenchPayload(htmlContent: string, payload: string): string {
  const cleaned = removeWorkbenchPayload(htmlContent);
  const block = `${WOODFISH_MARKER_START}\n${payload}\n${WOODFISH_MARKER_END}`;

  if (cleaned.includes('</html>')) {
    return cleaned.replace('</html>', `${block}\n</html>`);
  }

  return `${cleaned}\n${block}`;
}
