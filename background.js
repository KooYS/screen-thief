const SLACK = 'https://app.slack.com/*';
// Shown on the collapsed group chip; pick something that reads like routine work.
const GROUP_TITLE = 'PR 리뷰';

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'toggle') toggle();
  if (cmd === 'spotlight') chrome.storage.local.get({ spotlight: false }, (v) => chrome.storage.local.set({ spotlight: !v.spotlight }));
});
// From the radial menu (menu.js).
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'hide') toggle();
});

// The stored id goes stale if the user expands the group by hand or closes the tab,
// so trust it only while that tab is still inside a collapsed group.
async function stillHidden(id) {
  try {
    const tab = await chrome.tabs.get(id);
    return tab.groupId !== -1 && (await chrome.tabGroups.get(tab.groupId)).collapsed;
  } catch {
    return false; // tab closed
  }
}

async function toggle() {
  const { hidden } = await chrome.storage.session.get('hidden');
  if (hidden) {
    await chrome.storage.session.remove('hidden');
    if (await stillHidden(hidden)) {
      await chrome.tabs.ungroup(hidden);
      const tab = await chrome.tabs.update(hidden, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return;
    }
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
