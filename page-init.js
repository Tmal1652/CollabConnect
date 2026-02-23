// Shared page bootstrapping for static pages:
// - service worker registration
// - optional cache purge helper (?purgeCaches=1)
(function () {
  const isHttp = location.protocol === "http:" || location.protocol === "https:";

  if ("serviceWorker" in navigator && isHttp) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(console.error);
    });
  }

  // Dev helper: purge caches quickly with ?purgeCaches=1
  if (location.search.includes("purgeCaches=1") && "caches" in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => console.log("Caches cleared"))
      .catch(console.error);
  }
})();
