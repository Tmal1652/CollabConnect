# Mobile Architecture Roadmap

This document outlines the structural steps to evolve the current responsive web experience into a robust mobile / installable app (PWA and future native wrapper).

## 1. Progressive Web App (PWA) Foundation
- Added manifest.json with core metadata, start_url, icons placeholder.
- Added service worker (sw.js) caching shell assets for offline-first launch.
- Linked manifest & registration script across pages.
- Next: Add maskable icon, adaptive icon, and iOS Apple touch icons.

## 2. View Management Strategy
Current: CSS + JS hide/show sections on mobile via data-view and selective body scroll locking.
Planned Enhancements:
- Introduce lightweight client-side router (hash-based) that syncs history/back button.
- Persist last active view in localStorage for faster resume.
- Lazy-load large sections (e.g., profile) when first visited.

## 3. State & Data Layer
Short Term:
- Simple module (state.js) for user session, profile stub, and event pub/sub (e.g., onProfileUpdate).
Mid Term:
- IndexedDB caching layer for projects & messages.
- Background sync queue for offline submissions.
Long Term:
- Switch to real backend API with auth tokens; plug into service worker for request interception.

## 4. Offline & Performance
- Current shell cached; add runtime strategy split: stale-while-revalidate for images, network-first for API, cache-first for static.
- Preload critical fonts or use CSS font-display swap.
- Add route-based code splitting (defer profile-specific script until needed).

## 5. UX / Native Feel
- Add install prompt controller (defer beforeinstallprompt and present custom CTA in hero).
- Add pull-to-refresh visual (over scroll listener) only when on home.
- Gesture transitions between views (CSS slide/fade) using prefers-reduced-motion guard.
- Haptic feedback (Vibration API where available) for tab changes & form success.

## 6. Security & Reliability
- Add basic Content Security Policy meta.
- Upgrade SW to versioned precache manifest build step eventually (Workbox or Rollup plugin).
- Validate inputs client-side before network calls; sandbox future iframe content.

## 7. Native Packaging (Future)
- Use tools like Capacitor or Tauri after PWA maturity.
- Reuse service worker + asset pipeline; map push notifications if needed.

## 8. File / Module Layout (Proposed)
```
/manifest.json
/sw.js
/app.js                # bootstrap & section logic
/mobile/Router.js      # future hash router
/mobile/state.js       # shared reactive state
/mobile/storage.js     # IndexedDB + caching helpers
/mobile/ui-transitions.css
/mobile/haptics.js
/icons/
```

## 9. Immediate Next Steps (Suggested Order)
1. Implement hash-based router replacing showView (maintain existing APIs).
2. Add transitions (fade/slide) with motion preference respect.
3. Add install prompt handler & UI trigger.
4. Add localStorage persistence for last view.
5. Expand SW strategies (split caches, runtime caching patterns).

## 10. Testing & Metrics
- Add simple performance timing log (first view render, view switch latency).
- Lighthouse PWA audit baseline.
- Use navigator.storage.estimate() to monitor cache growth.

---
Incrementally ship each layer; keep bundle lean and guard advanced features behind capability checks.
