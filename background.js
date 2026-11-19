const SLACK = 'https://app.slack.com/*';
// Shown on the collapsed group chip; pick something that reads like routine work.
const GROUP_TITLE = 'PR 리뷰';

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'toggle') toggle();
  if (cmd === 'spotlight') chrome.storage.local.get({ spotlight: false }, (v) => chrome.storage.local.set({ spotlight: !v.spotlight }));
});
// From the radial menu (menu.js).
chrome.runtime.onMessage.addListener((msg) => msg.type === 'hide' && toggle());

async function toggle() {
  const { hidden } = await chrome.storage.session.get('hidden');
  if (hidden) {
    await chrome.storage.session.remove('hidden');
    try {
      await chrome.tabs.ungroup(hidden);
      const tab = await chrome.tabs.update(hidden, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    } catch {} // tab was closed meanwhile
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [slack] = await chrome.tabs.query({ url: SLACK });
  if (!tab || tab.id === slack?.id) return;

  // A group can't collapse while it holds the active tab, so move focus off it first.
  const siblings = await chrome.tabs.query({ windowId: tab.windowId });
  const next =
    (slack?.windowId === tab.windowId && slack) ||
    siblings.find((t) => t.index === tab.index + 1) ||
    siblings.find((t) => t.index === tab.index - 1);
  if (next) await chrome.tabs.update(next.id, { active: true });
  else await chrome.tabs.create({ windowId: tab.windowId, active: true });
  if (slack && slack.windowId !== tab.windowId) {
    await chrome.tabs.update(slack.id, { active: true });
    await chrome.windows.update(slack.windowId, { focused: true });
  }

  const groupId = await chrome.tabs.group({ tabIds: tab.id });
  await chrome.tabGroups.update(groupId, { title: GROUP_TITLE, color: 'grey', collapsed: true });
  await chrome.storage.session.set({ hidden: tab.id });
}

if (typeof module !== 'undefined') module.exports = { toggle };
