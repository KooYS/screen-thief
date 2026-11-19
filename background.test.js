const test = require('node:test');
const assert = require('node:assert');

function fakeChrome(tabs, store = {}) {
  const log = [];
  const groups = {};
  const byId = (id) => tabs.find((t) => t.id === id);
  global.chrome = {
    commands: { onCommand: { addListener() {} } },
    runtime: { onMessage: { addListener() {} } },
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
      get: async (id) => byId(id) ?? Promise.reject(new Error('no tab')),
      update: async (id) => (log.push(['activate', id]), byId(id)),
      create: async () => log.push(['newtab']),
      group: async ({ tabIds }) => (log.push(['group', tabIds]), (byId(tabIds).groupId = 7), (groups[7] = {}), 7),
      ungroup: async (id) => (log.push(['ungroup', id]), (byId(id).groupId = -1)),
    },
    tabGroups: {
      get: async (id) => groups[id],
      update: async (id, o) => (log.push(['collapse', id, o.collapsed]), Object.assign(groups[id], o)),
    },
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

test('stale hidden id (group expanded by hand) falls through to hiding the current tab', async () => {
  const tabs = [
    { id: 1, index: 0, windowId: 9, url: 'https://www.wanted.co.kr', active: true, groupId: -1 },
    { id: 2, index: 1, windowId: 9, url: 'https://app.slack.com/client', active: false, groupId: -1 },
  ];
  const { log, toggle } = fakeChrome(tabs, { hidden: 1 });
  await toggle();
  assert.deepStrictEqual(log, [['activate', 2], ['group', 1], ['collapse', 7, true]]);
});
