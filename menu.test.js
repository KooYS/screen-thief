const test = require('node:test');
const assert = require('node:assert');
const { sliceAt } = require('./menu.js');

test('maps directions to slices clockwise from top', () => {
  assert.strictEqual(sliceAt(0, -100, 6, 46), 0); // up
  assert.strictEqual(sliceAt(87, -50, 6, 46), 1); // up-right
  assert.strictEqual(sliceAt(87, 50, 6, 46), 2); // down-right
  assert.strictEqual(sliceAt(0, 100, 6, 46), 3); // down
  assert.strictEqual(sliceAt(-87, 50, 6, 46), 4); // down-left
  assert.strictEqual(sliceAt(-87, -50, 6, 46), 5); // up-left
});

test('inside the hub selects nothing', () => {
  assert.strictEqual(sliceAt(10, 10, 6, 46), -1);
});
