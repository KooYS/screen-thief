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

  chrome.storage.local.get(cfg, (v) => ((cfg = v), render()));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const k in changes) cfg[k] = changes[k].newValue;
    render();
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

  function render() {
    if (!cfg.spotlight) return veil?.remove(), (veil = null);
    if (!veil) {
      veil = document.createElement('div');
      veil.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
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
