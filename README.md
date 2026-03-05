# CollabConnect (Static) - v1.9.0

CollabConnect is a collaboration-first social platform concept built as a static multi-page web app. It is designed to help developers, teams, and creators share ideas, post progress, get feedback, and build projects together in a more positive, project-centered environment.

## Status
- Current release: `v1.9.0`
- Platform focus (current phase): `Desktop-first`
- Mobile: temporary splash screen shown on small screens (`desktop-only for now`, mobile redesign coming later)

## What CollabConnect Is
CollabConnect takes familiar social interactions (posting, commenting, sharing updates) and pushes them toward collaboration instead of just engagement.

The goal is to create a space where people can:
- share ideas and creations
- ask for help and give constructive feedback
- connect with collaborators
- track project progress
- build together in a positive environment

## Key Features (Current Project Scope)
- Collaboration-focused social experience
- Project and progress sharing
- Team and creator profile pages
- Projects page for discovery and organization
- Metallic/glass desktop UI system with light/dark parity
- PWA/service worker support (static app shell caching)
- Accessibility-minded UI patterns (keyboard/focus/readability improvements)

## Recent Highlights (v1.9.0)
- Projects Hub overhaul with rich desktop demo interactions:
  - `My Projects`, `Community`, `Shared` views
  - search, filters, sort, create/edit, archive/restore
  - project detail modal with milestones/activity
  - share-to-social demo integration via localStorage
- Redesigned `About` page with clearer collaboration-first messaging and layered content structure
- Redesigned `Features` page to align with About page positioning and visual hierarchy
- Added desktop-priority mobile splash gate for small screens
- Safe CSS cleanup removing obsolete About/Features selectors (`about-content`, `features-container`)
- Continued metallic/titanium/silver/midnight design refinements and readability polish

## Tech Stack
- HTML (multi-page static site)
- CSS (shared monolithic stylesheet with design tokens and scoped page overrides)
- Vanilla JavaScript (shared UI behavior, routing helpers, auth UI helpers)
- Service Worker (offline/app-shell caching support)

## Project Structure (Key Files)
- `index.html` - home page
- `about.html` - about page
- `features.html` - features page
- `social.html` - social/collaboration feed page
- `projects.html` - projects page
- `profile.html` - profile page
- `style.css` - shared styles and design system
- `app.js` - shared UI interactions
- `page-init.js` - shared boot logic (service worker + cache helper + mobile splash gate)
- `mobile/router.js` - mobile routing helpers (legacy/mobile behavior support)
- `sw.js` - service worker

## Getting Started
This is a static project. You can run it locally with a simple static server.

### Clone the repository
- `git clone <your-repo-url>`
- `cd CollabConnect`

### Option 1: Open directly
- Open `index.html` in a browser

Note:
- Some service worker behavior may be limited when using `file://`

### Option 2: Run a local static server (recommended)
Use any static server you prefer, for example:

- Python:
  - `python3 -m http.server 8000`
- Node (if installed):
  - `npx serve .`

Then open:
- `http://localhost:8000`

## Development Scripts
If Node.js is installed, the following scripts are available:

- Lint CSS
  - `npm run lint:css`
- Build minified CSS
  - `npm run build:css`

Output:
- `style.min.css` (production minified stylesheet)

## Desktop-Only (Current Phase)
CollabConnect is currently being optimized for desktop first.

On mobile/small screens:
- users will see a desktop-only splash screen
- the app UI is intentionally blocked
- a dedicated mobile redesign is planned for a future release

This is a temporary product decision while desktop UX is prioritized.

## Accessibility / UX Notes
- Focus visibility and readability are actively being improved
- Light/dark modes share one visual language (metallic/futuristic palette)
- Motion is restrained and reduced-motion support is considered in newer scoped UI blocks

## Roadmap (Planned)
- Major mobile redesign (future phase)
- Continued desktop UX refinement for core social/project workflows
- CSS cleanup and deduplication of legacy style blocks
- Additional page polish (auth/profile/secondary pages)
- Improved production styling pipeline and asset organization

## Contributing
This project is currently under active design and product iteration. If you plan to contribute:
- open an issue describing the change (design, bug fix, or feature)
- keep UI changes consistent with the metallic desktop-first design system
- avoid breaking shared page scripts (`page-init.js`, `app.js`, `mobile/router.js`)

## License
No license has been added yet.

If you plan to publish this project publicly for reuse, add a license file (for example: MIT).

## Author
- Tyler Malovrh

## Version History (Recent)
### v1.9.0
- Projects Hub redesign and demo-state architecture
- Local-persistent project workflows (create/edit/archive/share)
- Cross-page demo sharing into Social feed

### v1.8.0
- About + Features redesigns
- Desktop-only mobile splash gate
- Safe CSS cleanup for obsolete About/Features selectors

### v1.6.0
- About page collaboration-first redesign
- About page readability and visual consistency improvements

### v1.5.0
- Unified metallic UI theme (light/dark parity)
- Core page redesign updates (Home, Social, Projects)
- Navigation/caching stability fixes and FOUC fix
