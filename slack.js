/* global ST_DEFAULTS, parseDict, replaceWords */
// Runs on app.slack.com: covers only the message pane; real sidebar and header stay visible.
(() => {
  // ponytail: Slack class names change; update this list when the cover lands in the wrong place.
  const PANE = ['[data-qa="message_pane"]', '.p-message_pane', '.p-workspace__primary_view_body', '.p-workspace__primary_view'];
  let cover = null;
  let observer = null;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'show') chrome.storage.sync.get(ST_DEFAULTS, (cfg) => waitPane((pane) => show(pane, msg.payload, cfg)));
  });

  // While covered, swallow every key so nothing reaches the real composer.
  window.addEventListener(
    'keydown',
    (e) => {
      if (!cover) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.altKey && e.code === 'KeyS') {
        hide();
        chrome.runtime.sendMessage({ type: 'back' });
      }
    },
    true,
  );
  for (const type of ['paste', 'drop', 'beforeinput']) {
    window.addEventListener(type, (e) => cover && (e.preventDefault(), e.stopImmediatePropagation()), true);
  }

  function waitPane(cb, tries = 50) {
    const pane = PANE.map((s) => document.querySelector(s)).find(Boolean);
    if (pane) return cb(pane);
    if (tries) return setTimeout(() => waitPane(cb, tries - 1), 200);
    cb(document.body); // Slack never rendered a pane (logged out?): cover the whole page.
  }

  function bg(node) {
    for (let n = node; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'transparent' && !c.startsWith('rgba(0, 0, 0, 0')) return c;
    }
    return '#fff';
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function hue(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 45% 45%)`;
  }

  function message(name, time, body, title) {
    const m = el('div', 'st-msg');
    const av = el('div', 'st-av', name.slice(-2));
    av.style.background = hue(name);
    const col = el('div', 'st-col');
    const meta = el('div', 'st-meta');
    meta.append(el('b', null, name), el('span', 'st-time', time));
    col.append(meta);
    if (title) col.append(el('div', 'st-title', title));
    if (body) col.append(el('div', 'st-body', body));
    m.append(av, col);
    return m;
  }

  function show(pane, payload, cfg) {
    hide();
    const dict = parseDict(cfg.dict);
    const fix = (s) => replaceWords(s || '', dict);
    const people = cfg.people.split(',').map((s) => s.trim()).filter(Boolean);
    const who = (i) => people[i % people.length] || '동료';
    const now = Date.now();
    const at = (minsAgo) =>
      new Date(now - minsAgo * 60000).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });

    const msgs =
      payload.kind === 'list'
        ? payload.items.map((t) => ({ text: t }))
        : payload.sections.map((s) => ({ title: s.title, text: s.text }));

    cover = el('div');
    cover.id = 'st-cover';
    const style = getComputedStyle(pane);
    cover.style.background = bg(pane);
    cover.style.color = style.color;
    msgs.forEach((m, i) => cover.append(message(who(i), at((msgs.length - i) * 3), fix(m.text), fix(m.title))));

    const place = () => {
      const r = pane.getBoundingClientRect();
      Object.assign(cover.style, { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px' });
    };
    place();
    observer = new ResizeObserver(place);
    observer.observe(pane);
    document.activeElement?.blur();
    document.documentElement.append(cover);
  }

  function hide() {
    observer?.disconnect();
    cover?.remove();
    cover = observer = null;
  }
})();
