/* global ST_DEFAULTS */
const keys = Object.keys(ST_DEFAULTS);
chrome.storage.sync.get(ST_DEFAULTS, (cfg) => keys.forEach((k) => (document.getElementById(k).value = cfg[k])));
document.getElementById('save').onclick = () => {
  const cfg = Object.fromEntries(keys.map((k) => [k, document.getElementById(k).value]));
  chrome.storage.sync.set(cfg, () => (document.getElementById('status').textContent = '저장됨'));
};
