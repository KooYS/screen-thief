const SLACK = 'https://app.slack.com/*';

chrome.commands.onCommand.addListener((cmd) => cmd === 'toggle' && toggle());

async function toggle() {
  const { hidden = [] } = await chrome.storage.session.get('hidden');
  if (hidden.length) {
    for (const id of hidden) await chrome.sessions.restore(id).catch(() => {});
    return chrome.storage.session.set({ hidden: [] });
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [slack] = await chrome.tabs.query({ url: SLACK });
  if (!tab || tab.id === slack?.id) return;

  if (slack) {
    await chrome.tabs.update(slack.id, { active: true });
    await chrome.windows.update(slack.windowId, { focused: true });
  }
  // Chrome can't hide a tab, so close it and keep its session id to restore later.
  // ponytail: unsaved form input is lost on restore; history and scroll come back.
  await chrome.tabs.remove(tab.id);
  const [closed] = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
  const id = (closed?.tab || closed?.window)?.sessionId;
  if (id) await chrome.storage.session.set({ hidden: [id] });
}

if (typeof module !== 'undefined') module.exports = { toggle };
