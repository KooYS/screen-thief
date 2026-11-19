const test = require('node:test');
const assert = require('node:assert');

function fakeChrome(tabs) {
  const log = [];
  const store = {};
  global.chrome = {
    commands: { onCommand: { addListener() {} } },
    storage: {
      session: {
        get: async () => ({ ...store }),
        set: async (o) => Object.assign(store, o),
        remove: async (k) => delete store[k],
      },
    },
    tabs: {
      query: async (q) =>
        q.url ? tabs.filter((t) => t.url.startsWith('https://app.slack.com'))
        : q.windowId != null ? tabs.filter((t) => t.windowId === q.windowId)
        : tabs.filter((t) => t.active),
      update: async (id) => (log.push(['activate', id]), tabs.find((t) => t.id === id)),
      create: async () => log.push(['newtab']),
      group: async ({ tabIds }) => (log.push(['group', tabIds]), 7),
      ungroup: async (id) => log.push(['ungroup', id]),
    },
    tabGroups: { update: async (id, o) => log.push(['collapse', id, o.collapsed]) },
    windows: { update: async () => {} },
  };
  delete require.cache[require.resolve('./background.js')];
  return { log, toggle: require('./background.js').toggle };
}

test('collapses active tab into a group, jumps to slack, then restores', async () => {
  const { log, toggle } = fakeChrome([
    { id: 1, index: 0, windowId: 9, url: 'https://www.wanted.co.kr/wd/1', active: true },
    { id: 2, index: 1, windowId: 9, url: 'https://app.slack.com/client/T1', active: false },
  ]);
  await toggle();
  await toggle();
  assert.deepStrictEqual(log, [
    ['activate', 2], ['group', 1], ['collapse', 7, true],
    ['ungroup', 1], ['activate', 1],
  ]);
});

test('without slack, focuses the neighbour tab before collapsing', async () => {
  const { log, toggle } = fakeChrome([
    { id: 1, index: 0, windowId: 9, url: 'https://a.test', active: false },
    { id: 3, index: 1, windowId: 9, url: 'https://www.wanted.co.kr', active: true },
  ]);
  await toggle();
  assert.deepStrictEqual(log.slice(0, 2), [['activate', 1], ['group', 3]]);
});

test('does nothing when slack itself is active', async () => {
  const { log, toggle } = fakeChrome([{ id: 2, index: 0, windowId: 9, url: 'https://app.slack.com/client', active: true }]);
  await toggle();
  assert.deepStrictEqual(log, []);
});
