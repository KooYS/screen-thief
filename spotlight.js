// Blurs the page except an ellipse around the cursor. State lives in chrome.storage.local
// so toggling in one tab applies to every tab.
(() => {
  const MIN = 60;
  const MAX = 600;
  const BLUR = 7; // px
  let cfg = { spotlight: false, radius: 160 };
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let veil = null;
  let frame = 0;

  chrome.storage.local.get(cfg, (v) => ((cfg = v), render()));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const k in changes) cfg[k] = changes[k].newValue;
    render();
  });

  addEventListener('mousemove', (e) => ((x = e.clientX), (y = e.clientY), paint()), { passive: true });
  document.documentElement.addEventListener('mouseleave', () => ((x = -9999), paint()));

  // Alt + wheel resizes the clear area.
  addEventListener(
    'wheel',
    (e) => {
      if (!veil || !e.altKey) return;
      e.preventDefault();
      const radius = Math.min(MAX, Math.max(MIN, cfg.radius - Math.sign(e.deltaY) * 20));
      if (radius !== cfg.radius) chrome.storage.local.set({ radius });
    },
    { passive: false },
  );

  function render() {
    if (!cfg.spotlight) return veil?.remove(), (veil = null);
    if (!veil) {
      veil = document.createElement('div');
      veil.style.cssText =
        `position:fixed;inset:0;z-index:2147483647;pointer-events:none;` +
        `backdrop-filter:blur(${BLUR}px);-webkit-backdrop-filter:blur(${BLUR}px);`;
      document.documentElement.append(veil);
    }
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
