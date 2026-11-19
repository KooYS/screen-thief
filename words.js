// Pure helpers shared by the content script and node tests.

function parseDict(text) {
  const dict = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) dict[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return dict;
}

function replaceWords(text, dict) {
  // Longest key first so "지원하기" wins over "지원".
  const keys = Object.keys(dict).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;
  const re = new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return text.replace(re, (m) => dict[m]);
}

if (typeof module !== 'undefined') module.exports = { parseDict, replaceWords };
