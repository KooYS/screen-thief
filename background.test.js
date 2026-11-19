const test = require('node:test');
const assert = require('node:assert');

function fakeChrome({ tabs }) {
  const log = [];
  const store = {};
  let closed = null;
  global.chrome = {
    commands: { onCommand: { addListener() {} } },
    storage: { session: { get: async () => ({ ...store }), set: async (o) => Object.assign(store, o) } },
    tabs: {
      query: async (q) => (q.url ? tabs.filter((t) => t.url.startsWith('https://app.slack.com')) : tabs.filter((t) => t.active)),
      update: async (id) => log.push(['activate', id]),
      remove: async (id) => (log.push(['close', id]), (closed = { tab: { sessionId: 's' + id } })),
    },
    windows: { update: async () => {} },
    sessions: {
      getRecentlyClosed: async () => [closed],
      restore: async (id) => log.push(['restore', id]),
    },
  };
  delete require.cache[require.resolve('./background.js')];
  return { log, toggle: require('./background.js').toggle };
}

test('hides active tab, jumps to slack, then restores it', async () => {
  const { log, toggle } = fakeChrome({
    tabs: [
      { id: 1, url: 'https://www.wanted.co.kr/wd/1', active: true },
      { id: 2, url: 'https://app.slack.com/client/T1', active: false, windowId: 9 },
    ],
  });
  await toggle();
  await toggle();
  assert.deepStrictEqual(log, [['activate', 2], ['close', 1], ['restore', 's1']]);
});

test('does nothing when slack itself is active', async () => {
  const { log, toggle } = fakeChrome({ tabs: [{ id: 2, url: 'https://app.slack.com/client', active: true }] });
  await toggle();
  assert.deepStrictEqual(log, []);
});
