/* global ST_DEFAULTS, parseDict, replaceWords */
(() => {
  // Simple pinwheel-ish favicon; inline so no network request is made.
  const FAVICON =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
        '<rect x="12" y="2" width="6" height="16" rx="3" fill="#36C5F0"/>' +
        '<rect x="14" y="14" width="16" height="6" rx="3" fill="#2EB67D"/>' +
        '<rect x="14" y="14" width="6" height="16" rx="3" fill="#ECB22E"/>' +
        '<rect x="2" y="12" width="16" height="6" rx="3" fill="#E01E5A"/></svg>',
    );
  const BLOCK = 'p,li,div,h1,h2,h3,h4,h5,h6,td,th,dd,dt,section,article,pre,blockquote,tr';
  let saved = null;

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    },
    true,
  );

  function toggle() {
    if (saved) return restore();
    chrome.storage.sync.get(ST_DEFAULTS, show);
  }

  function pickBlock() {
    // ponytail: main/article or body; add per-site selectors if a site renders junk.
    return document.querySelector('main, article, [role="main"]') || document.body;
  }

  function isList(block) {
    const total = block.innerText.length || 1;
    const links = [...block.querySelectorAll('a')].reduce((n, a) => n + a.innerText.length, 0);
    return links / total >= 0.6;
  }

  function listItems(block) {
    const seen = new Set();
    const items = [];
    for (const a of block.querySelectorAll('a')) {
      const t = a.innerText.trim().replace(/\n+/g, '\n');
      if (t.length > 4 && !seen.has(t)) seen.add(t), items.push(t);
    }
    return items.slice(0, 50);
  }

  // Split visible text into sections at h1-h3; inline text joins with spaces.
  function sections(block) {
    const out = [{ title: '', text: '' }];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || !n.textContent.trim() || p.closest('script,style,noscript,svg,nav,footer,header'))
          return NodeFilter.FILTER_REJECT;
        return p.offsetParent || p.getClientRects().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let lastBlock = null;
    for (let n; (n = walker.nextNode()); ) {
      const t = n.textContent.trim().replace(/\s+/g, ' ');
      const h = n.parentElement.closest('h1,h2,h3');
      const cur = out[out.length - 1];
      if (h) {
        if (cur.heading === h) cur.title += ' ' + t;
        else out.push({ title: t, text: '', heading: h });
        lastBlock = null;
        continue;
      }
      const b = n.parentElement.closest(BLOCK);
      cur.text += cur.text ? (b === lastBlock ? ' ' : '\n') + t : t;
      lastBlock = b;
    }
    return out.filter((s) => s.title || s.text);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function color(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 45% 45%)`;
  }

  function message(name, time, body, title) {
    const m = el('div', 'st-msg');
    const av = el('div', 'st-av', name.slice(-2));
    av.style.background = color(name);
    const col = el('div', 'st-col');
    const meta = el('div', 'st-meta');
    meta.append(el('b', null, name), el('span', 'st-time', time));
    col.append(meta);
    if (title) col.append(el('div', 'st-title', title));
    col.append(el('div', 'st-body', body));
    m.append(av, col);
    return m;
  }

  function show(cfg) {
    const dict = parseDict(cfg.dict);
    const fix = (s) => replaceWords(s, dict);
    const people = cfg.people.split(',').map((s) => s.trim()).filter(Boolean);
    const who = (i) => people[i % people.length] || '동료';
    const block = pickBlock();
    const now = Date.now();
    const timeAt = (minsAgo) =>
      new Date(now - minsAgo * 60000).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });

    const root = el('div');
    root.id = 'st-overlay';
    const side = el('aside', 'st-side');
    side.append(el('div', 'st-ws', cfg.workspace), el('div', 'st-group', '채널'));
    for (const c of cfg.channels.split(',').map((s) => s.trim()).filter(Boolean)) {
      side.append(el('div', 'st-ch' + (c === cfg.channel ? ' on' : ''), '# ' + c));
    }
    const main = el('section', 'st-main');
    main.append(el('header', 'st-head', '# ' + cfg.channel));
    const msgs = el('div', 'st-msgs');
    main.append(msgs);
    root.append(side, main);

    if (isList(block)) {
      const items = listItems(block);
      items.forEach((t, i) => msgs.append(message(who(i), timeAt((items.length - i) * 3), fix(t))));
    } else {
      const [first, ...rest] = sections(block);
      if (first) {
        const m = message(who(0), timeAt(rest.length * 2 + 5), fix(first.text), fix(first.title));
        if (rest.length) m.querySelector('.st-col').append(el('div', 'st-replies', `댓글 ${rest.length}개`));
        msgs.append(m);
      }
      if (rest.length) {
        const thread = el('aside', 'st-thread');
        thread.append(el('header', 'st-head', '스레드  # ' + cfg.channel));
        const list = el('div', 'st-msgs');
        rest.forEach((s, i) => list.append(message(who(i + 1), timeAt((rest.length - i) * 2), fix(s.text), fix(s.title))));
        thread.append(list);
        root.append(thread);
      }
    }

    const icons = [...document.querySelectorAll('link[rel~="icon"]')];
    saved = { title: document.title, icons, overflow: document.documentElement.style.overflow, root };
    icons.forEach((l) => l.remove());
    const icon = el('link');
    icon.rel = 'icon';
    icon.href = FAVICON;
    saved.icon = icon;
    document.head.append(icon);
    document.title = `${cfg.channel} (Channel) - ${cfg.workspace} - Slack`;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.append(root);
  }

  function restore() {
    saved.root.remove();
    saved.icon.remove();
    saved.icons.forEach((l) => document.head.append(l));
    document.title = saved.title;
    document.documentElement.style.overflow = saved.overflow;
    saved = null;
  }

  // Exposed for the demo harness only; harmless in the isolated content-script world.
  window.__stToggle = toggle;
})();
