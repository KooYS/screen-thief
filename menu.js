// Hold Option (Alt) for a moment: a radial menu opens at the cursor.
// Point at a slice and release to run it, or click slices (menu stays open) and release to close.

const SLICES = [
  { id: 'spotlight', label: (c) => (c.spotlight ? '흐리게 끄기' : '흐리게') },
  { id: 'radius+', label: () => '영역 ＋' },
  { id: 'blur+', label: () => '흐림 ＋' },
  { id: 'hide', label: () => '접기' },
  { id: 'blur-', label: () => '흐림 －' },
  { id: 'radius-', label: () => '영역 －' },
];

// Slice index under (dx, dy) from the centre, slice 0 centred at 12 o'clock; -1 inside the hub.
function sliceAt(dx, dy, n, hub) {
  if (Math.hypot(dx, dy) < hub) return -1;
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90 + 180 / n; // 0 = top slice's left edge
  return Math.floor((((deg % 360) + 360) % 360) / (360 / n));
}

if (typeof module !== 'undefined') module.exports = { sliceAt };
else {
  (() => {
    const HOLD_MS = 180;
    const R = 130; // outer radius
    const HUB = 46; // inner radius
    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let timer = 0;
    let host = null;
    let origin = null;
    let active = -1;
    let clicked = false;
    let cfg = { spotlight: false, radius: 160, blur: 16 };

    addEventListener('mousemove', (e) => ((x = e.clientX), (y = e.clientY), host && highlight()), { passive: true });
    addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Alt' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          clearTimeout(timer);
          timer = setTimeout(open, HOLD_MS);
        } else if (e.key !== 'Alt') cancel(); // Option+key = typing or another shortcut
      },
      true,
    );
    addEventListener(
      'keyup',
      (e) => {
        if (e.key !== 'Alt') return;
        const pick = host && active >= 0 && !clicked ? SLICES[active].id : null;
        cancel();
        if (pick) run(pick);
      },
      true,
    );
    addEventListener('blur', cancel);

    // While the menu is open, clicks pick slices and never reach the page.
    for (const type of ['mousedown', 'mouseup', 'click', 'auxclick', 'contextmenu']) {
      addEventListener(
        type,
        (e) => {
          if (!host) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          if (type === 'mousedown' && e.button === 0 && active >= 0) {
            clicked = true;
            run(SLICES[active].id);
          }
        },
        true,
      );
    }

    function cancel() {
      clearTimeout(timer);
      host?.remove();
      host = origin = null;
      active = -1;
      clicked = false;
    }

    function run(id) {
      if (id === 'hide') return chrome.runtime.sendMessage({ type: 'hide' });
      chrome.storage.local.get(cfg, (c) => {
        const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
        if (id === 'spotlight') c.spotlight = !c.spotlight;
        if (id === 'radius+') c.radius = clamp(c.radius + 40, 60, 600);
        if (id === 'radius-') c.radius = clamp(c.radius - 40, 60, 600);
        if (id === 'blur+') c.blur = clamp(c.blur + 4, 2, 40);
        if (id === 'blur-') c.blur = clamp(c.blur - 4, 2, 40);
        // Adjusting size or strength implies you want to see it.
        if (id !== 'spotlight') c.spotlight = true;
        chrome.storage.local.set(c);
        cfg = c;
        host?.texts.forEach((t, i) => (t.textContent = SLICES[i].label(c))); // e.g. 흐리게 ↔ 흐리게 끄기
      });
    }

    function arc(i, n) {
      const gap = 1.5;
      const a0 = ((-90 - 180 / n + i * (360 / n) + gap) * Math.PI) / 180;
      const a1 = ((-90 - 180 / n + (i + 1) * (360 / n) - gap) * Math.PI) / 180;
      const p = (r, a) => `${R + r * Math.cos(a)} ${R + r * Math.sin(a)}`;
      return `M${p(R - 4, a0)} A${R - 4} ${R - 4} 0 0 1 ${p(R - 4, a1)} L${p(HUB + 6, a1)} A${HUB + 6} ${HUB + 6} 0 0 0 ${p(HUB + 6, a0)}Z`;
    }

    function open() {
      chrome.storage.local.get(cfg, (c) => {
        cfg = c;
        origin = { x, y };
        host = document.createElement('div');
        host.style.cssText = `position:fixed;left:${x - R}px;top:${y - R}px;width:${2 * R}px;height:${2 * R}px;z-index:2147483647;pointer-events:none;`;
        const root = host.attachShadow({ mode: 'closed' });
        const n = SLICES.length;
        const label = (i) => {
          const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
          const r = (R + HUB) / 2;
          return `<text x="${R + r * Math.cos(a)}" y="${R + r * Math.sin(a)}">${SLICES[i].label(c)}</text>`;
        };
        root.innerHTML = `
          <style>
            .ring { position:absolute; inset:0; border-radius:50%; backdrop-filter:blur(14px) saturate(1.4);
              -webkit-backdrop-filter:blur(14px) saturate(1.4); background:rgba(214,178,132,.35);
              box-shadow:0 10px 40px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.45); animation:pop .12s ease-out; }
            @keyframes pop { from { transform:scale(.85); opacity:0 } }
            svg { position:absolute; inset:0; }
            path { fill:rgba(255,241,226,.82); stroke:rgba(255,255,255,.7); stroke-width:1; transition:fill .08s; }
            path.on { fill:#e4632f; }
            text { font:700 14px -apple-system,'Apple SD Gothic Neo',sans-serif; fill:#2a2118; text-anchor:middle; dominant-baseline:central; }
            text.on { fill:#fff; }
            .hub { position:absolute; left:${R - HUB}px; top:${R - HUB}px; width:${2 * HUB}px; height:${2 * HUB}px; border-radius:50%;
              background:rgba(255,248,240,.6); display:grid; place-items:center; text-align:center;
              font:600 11px/1.3 -apple-system,'Apple SD Gothic Neo',sans-serif; color:#6b5a48; }
          </style>
          <div class="ring"><svg viewBox="0 0 ${2 * R} ${2 * R}">
            ${SLICES.map((_, i) => `<path d="${arc(i, n)}"/>`).join('')}
            ${SLICES.map((_, i) => label(i)).join('')}
          </svg><div class="hub">여기서 놓으면<br>취소</div></div>`;
        host.paths = root.querySelectorAll('path');
        host.texts = root.querySelectorAll('text');
        document.documentElement.append(host);
        highlight();
      });
    }

    function highlight() {
      if (!origin) return;
      active = sliceAt(x - origin.x, y - origin.y, SLICES.length, HUB);
      host.paths.forEach((p, i) => p.classList.toggle('on', i === active));
      host.texts.forEach((t, i) => t.classList.toggle('on', i === active));
    }
  })();
}
