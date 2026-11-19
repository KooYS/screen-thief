// Runs on every non-Slack page: Alt+S extracts the readable text and hands it to the background.
(() => {
  const BLOCK = 'p,li,div,h1,h2,h3,h4,h5,h6,td,th,dd,dt,section,article,pre,blockquote,tr';

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: 'cloak', payload: extract() });
      }
    },
    true,
  );

  function extract() {
    // ponytail: main/article or body; add per-site selectors if a site renders junk.
    const block = document.querySelector('main, article, [role="main"]') || document.body;
    if (isList(block)) return { kind: 'list', items: listItems(block) };
    const secs = sections(block);
    // Many sites (e.g. Wanted) don't put the page title in h1-h3; fall back to the tab title.
    if (secs[0] && !secs[0].title) secs[0].title = document.title.split(' | ')[0];
    return { kind: 'detail', sections: secs };
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
    let heading = null;
    let lastBlock = null;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || !n.textContent.trim() || p.closest('script,style,noscript,svg,nav,footer,header'))
          return NodeFilter.FILTER_REJECT;
        return p.getClientRects().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    for (let n; (n = walker.nextNode()); ) {
      const t = n.textContent.trim().replace(/\s+/g, ' ');
      const h = n.parentElement.closest('h1,h2,h3');
      const cur = out[out.length - 1];
      if (h) {
        if (h === heading) cur.title += ' ' + t;
        else out.push({ title: t, text: '' }), (heading = h);
        lastBlock = null;
        continue;
      }
      const b = n.parentElement.closest(BLOCK);
      cur.text += cur.text ? (b === lastBlock ? ' ' : '\n') + t : t;
      lastBlock = b;
    }
    return out.filter((s) => s.title || s.text);
  }
})();
