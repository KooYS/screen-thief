// Blurs the page except an ellipse around the cursor. State lives in chrome.storage.local
// so toggling in one tab applies to every tab.
(() => {
  const MIN = 60;
  const MAX = 600;
  let cfg = { spotlight: false, radius: 160, blur: 16 };
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let veil = null;
  let frame = 0;
  let hud = null;
  let hudTimer = 0;

  chrome.storage.local.get(cfg, (v) => ((cfg = v), render()));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const k in changes) cfg[k] = changes[k].newValue;
    render();
    if (document.hasFocus()) showHud(changes);
  });

  addEventListener('mousemove', (e) => ((x = e.clientX), (y = e.clientY), paint()), { passive: true });
  document.documentElement.addEventListener('mouseleave', () => ((x = -9999), paint()));

  // Alt + wheel resizes the clear area; Alt + Shift + wheel changes blur strength.
  addEventListener(
    'wheel',
    (e) => {
      if (!veil || !e.altKey) return;
      e.preventDefault();
      const dir = -Math.sign(e.deltaY || e.deltaX); // macOS turns Shift+wheel into deltaX
      if (e.shiftKey) {
        const blur = Math.min(40, Math.max(2, cfg.blur + dir * 2));
        if (blur !== cfg.blur) chrome.storage.local.set({ blur });
      } else {
        const radius = Math.min(MAX, Math.max(MIN, cfg.radius + dir * 20));
        if (radius !== cfg.radius) chrome.storage.local.set({ radius });
      }
    },
    { passive: false },
  );

  // Small readout beside the cursor whenever a value changes (menu click or Alt+wheel).
  function showHud(changes) {
    const c = changes.blur || changes.radius;
    let text;
    let pct = null;
    if (c) {
      const [name, lo, hi] = changes.blur ? ['흐림', 2, 40] : ['영역', MIN, MAX];
      const arrow = c.newValue > (c.oldValue ?? c.newValue) ? '▲' : c.newValue < c.oldValue ? '▼' : '•';
      text = `${name}  ${arrow}  ${c.newValue}px`;
      pct = ((c.newValue - lo) / (hi - lo)) * 100;
    } else if (changes.spotlight) text = changes.spotlight.newValue ? '흐리게 켜짐' : '흐리게 꺼짐';
    else return;

    if (!hud) {
      hud = document.createElement('div');
      hud.style.cssText =
        'position:fixed;z-index:2147483647;pointer-events:none;padding:8px 12px;border-radius:10px;min-width:130px;' +
        'background:rgba(30,26,22,.82);color:#fff;font:600 13px/1.4 -apple-system,"Apple SD Gothic Neo",sans-serif;' +
        'box-shadow:0 6px 20px rgba(0,0,0,.25);transition:opacity .2s;';
      document.documentElement.append(hud);
    }
    hud.innerHTML = '';
    hud.append(text);
    if (pct != null) {
      const bar = document.createElement('div');
      bar.style.cssText = 'margin-top:6px;height:4px;border-radius:2px;background:rgba(255,255,255,.2);overflow:hidden;';
      const fill = document.createElement('div');
      fill.style.cssText = `height:100%;width:${pct}%;background:#e4632f;`;
      bar.append(fill);
      hud.append(bar);
    }
    // Beside the radial menu when it is open (menu.js sets stMenuBox), else beside the cursor.
    const box = globalThis.stMenuBox || { x, y, r: 24 };
    const w = hud.offsetWidth || 150;
    const right = box.x + box.r + 12;
    const left = right + w < innerWidth ? right : Math.max(8, box.x - box.r - 12 - w);
    Object.assign(hud.style, { left: left + 'px', top: Math.max(8, box.y - 20) + 'px', opacity: '1' });
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => (hud.style.opacity = '0'), 1200);
  }

  function render() {
    if (!cfg.spotlight) return veil?.remove(), (veil = null);
    if (!veil) {
      veil = document.createElement('div');
      // One below the max so the radial menu and HUD always sit on top of the veil.
      veil.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
      document.documentElement.append(veil);
    }
    // Grayscale + low contrast so logos and photos lose their colour and shape too.
    veil.style.backdropFilter = veil.style.webkitBackdropFilter =
      `blur(${cfg.blur}px) grayscale(1) contrast(0.45) brightness(1.15)`;
    paint();
  }

  function paint() {
    if (!veil || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      // ponytail: fixed 1.8:1 ellipse since text reads horizontally.
      const g = `radial-gradient(ellipse ${cfg.radius * 1.8}px ${cfg.radius}px at ${x}px ${y}px, transparent 75%, #000 100%)`;
      veil.style.maskImage = veil.style.webkitMaskImage = g;
    });
  }
})();
