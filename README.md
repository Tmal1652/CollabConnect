# CollabConnect (static) - v1.5

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
