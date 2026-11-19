const SLACK = 'https://app.slack.com/*';

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'cloak') cloak(msg.payload, sender.tab);
  if (msg.type === 'back') back();
});

async function cloak(payload, from) {
  await chrome.storage.session.set({ fromTabId: from.id });
  let [slack] = await chrome.tabs.query({ url: SLACK });
  if (!slack) {
    slack = await chrome.tabs.create({ url: 'https://app.slack.com/client', index: from.index + 1 });
    await loaded(slack.id);
  }
  await chrome.tabs.update(slack.id, { active: true });
  await chrome.windows.update(slack.windowId, { focused: true });
  await send(slack.id, payload);
}

async function send(tabId, payload) {
  const msg = { type: 'show', payload };
  try {
    await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    // Slack tab was open before the extension loaded: inject once, then retry.
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['slack.css'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['defaults.js', 'words.js', 'slack.js'] });
    await chrome.tabs.sendMessage(tabId, msg);
  }
}

function loaded(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function on(id, info) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(on);
        resolve();
      }
    });
  });
}

async function back() {
  const { fromTabId } = await chrome.storage.session.get('fromTabId');
  if (fromTabId) chrome.tabs.update(fromTabId, { active: true }).catch(() => {});
}
