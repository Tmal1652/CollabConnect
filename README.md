# CollabConnect (static) - v1.8

## Version 1.8
- About page redesign (collaboration-first messaging, layered layout, improved spacing/readability)
- Features page redesign aligned to About page positioning and visual system
- Desktop-priority phase gate: mobile devices now see a desktop-only splash screen (mobile redesign coming later)
- Scoped CSS cleanup: removed obsolete selectors from old About/Features layouts

## Version 1.6
- About page redesign (collaboration-first messaging, clearer layout, better spacing/readability)
- Metallic/glass visual consistency updates scoped to the About page (light/dark parity)
- About page positioning and mission copy focused on collaborative, positive social-building workflows

## Version 1.5
- Unified metallic UI theme (light/dark parity)
- Core page redesign updates (Home, Social, Projects) plus compatibility polish for About/Profile/Auth
- Navigation and caching stability fixes (service worker, mobile router, shared page init)
- FOUC fix (blocking CSS load) to prevent raw HTML flashes during page navigation

## Dev tasks
- Lint CSS
  - npm run lint:css
- Build minified CSS
  - npm run build:css

Outputs `style.min.css` for production. Reference it in HTML if desired.

## Notes
- Design tokens are defined in `:root` of `style.css`.
- Shared page boot logic (service worker + cache purge helper) is in `page-init.js`.
- Mobile routing logic is in `mobile/router.js`.
- General page interaction helpers (scroll states, modal support, section reveal) are in `app.js`.
