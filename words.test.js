const test = require('node:test');
const assert = require('node:assert');
const { parseDict, replaceWords } = require('./words.js');

test('longest key wins', () => {
  const d = parseDict('지원=반영\n지원하기=반영 요청');
  assert.strictEqual(replaceWords('지금 지원하기, 지원 마감', d), '지금 반영 요청, 반영 마감');
});

test('replaces every occurrence and escapes regex chars', () => {
  assert.strictEqual(replaceWords('a+b a+b', { 'a+b': 'x' }), 'x x');
});

test('empty dict returns text unchanged', () => {
  assert.strictEqual(replaceWords('연봉', parseDict('')), '연봉');
});

test('parseDict ignores malformed lines', () => {
  assert.deepStrictEqual(parseDict('연봉 = 단가\nnoequals\n=x'), { 연봉: '단가' });
});
