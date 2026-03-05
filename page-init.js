// Shared page bootstrapping for static pages:
// - service worker registration
// - optional cache purge helper (?purgeCaches=1)
(function () {
  const MOBILE_GATE_BREAKPOINT = 820;
  const MOBILE_GATE_ID = "cc-desktop-only-gate";

  function ensureMobileGate() {
    if (document.getElementById(MOBILE_GATE_ID)) return;

    const gate = document.createElement("section");
    gate.id = MOBILE_GATE_ID;
    gate.className = "cc-desktop-only-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-labelledby", "cc-desktop-only-title");
    gate.setAttribute("aria-describedby", "cc-desktop-only-copy");
    gate.hidden = true;
    gate.innerHTML = [
      '<div class="cc-desktop-only-shell">',
      '  <p class="cc-desktop-only-kicker">Desktop Only</p>',
      '  <h1 id="cc-desktop-only-title">CollabConnect is currently optimized for desktop</h1>',
      '  <p id="cc-desktop-only-copy">A dedicated mobile redesign is coming soon. For the best experience right now, please open CollabConnect on a desktop or laptop browser.</p>',
      '  <ul class="cc-desktop-only-list" aria-label="Desktop recommendation tips">',
      '    <li>Use a desktop or laptop browser</li>',
      '    <li>If needed, request the desktop site in your mobile browser</li>',
      "  </ul>",
      '  <p class="cc-desktop-only-note">Mobile-first redesign planned for a future release.</p>',
      "</div>",
    ].join("");

    document.body.appendChild(gate);
  }

  function applyMobileGateState() {
    if (!document.body) return;

    const isMobileViewport = window.innerWidth <= MOBILE_GATE_BREAKPOINT;
    const gate = document.getElementById(MOBILE_GATE_ID);

    if (!gate) return;

    gate.hidden = !isMobileViewport;
    document.body.classList.toggle("cc-desktop-only-active", isMobileViewport);
  }

  function initMobileDesktopOnlyGate() {
    if (!document.body) return;

    ensureMobileGate();
    applyMobileGateState();

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyMobileGateState, 60);
    });
    window.addEventListener("orientationchange", applyMobileGateState);
  }

  const isHttp = location.protocol === "http:" || location.protocol === "https:";

  if ("serviceWorker" in navigator && isHttp) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(console.error);
    });
  }

  // Dev helper: purge caches quickly with ?purgeCaches=1
  if (location.search.includes("purgeCaches=1") && "caches" in window) {
    const url = new URL(window.location.href);
    url.searchParams.delete("purgeCaches");
    const nextHref = url.toString();

    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => {
        console.log("Caches cleared");
        window.location.replace(nextHref);
      })
      .catch((error) => {
        console.error(error);
        window.location.replace(nextHref);
      });
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileDesktopOnlyGate, { once: true });
  } else {
    initMobileDesktopOnlyGate();
  }
})();
