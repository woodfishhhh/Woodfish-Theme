/**
 * Parses JSON with comments and trailing commas, the format VS Code accepts for theme
 * files (Tokyo Night and Nord ship theirs that way).
 */
function parseJsonc(text) {
  let output = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      const string = /"(?:[^"\\]|\\.)*"/y;
      string.lastIndex = index;
      const match = string.exec(text);
      output += match[0];
      index += match[0].length - 1;
    } else if (char === '/' && next === '/') {
      const end = text.indexOf('\n', index);
      if (end < 0) {
        break;
      }
      index = end - 1;
    } else if (char === '/' && next === '*') {
      index = text.indexOf('*/', index + 2) + 1;
    } else {
      output += char;
    }
  }
  return JSON.parse(output.replace(/,(\s*[}\]])/g, '$1'));
}

module.exports = { parseJsonc };
