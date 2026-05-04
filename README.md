# PhD Application Tracker

[![CI](https://github.com/sci-freak/phd-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/sci-freak/phd-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-149eca.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vite.dev/)

A cross-platform application tracker for PhD applicants — manage universities, deadlines, requirements, referees, and supporting documents in one place. Available as a web app, Electron desktop app, and React Native mobile app, all backed by Firebase.

> Built and used to track real-world PhD applications. Open-source under MIT.

## Highlights

- **Three targets, one codebase.** React 19 web app, Electron desktop wrapper, and Expo mobile app share a `@phd-tracker/shared` package for domain logic.
- **Firebase-backed sync** with Firestore + Storage + Auth. Per-user data isolation enforced by security rules.
- **Guest mode** for use without an account. Local data merges into your account on first sign-in.
- **Drag-and-drop reordering** with intelligent guards (disabled when filters or non-manual sort would corrupt order).
- **Google Calendar integration** via Cloud Functions OAuth2 flow.
- **Deadlines on a calendar** with color-coded event types and Google Calendar overlays.
- **Document storage** with graceful fallback (Firebase Storage → inline data URL on upload failure).
- **CSV / JSON import & export** for backups and migrations.
- **Themes** (dark, light, midnight) with theme-aware toasts and dialogs.
- **Accessible** modals with focus traps, body-scroll lock, ARIA roles, and keyboard navigation (Tab/Shift-Tab cycle, Escape to close).
- **Code-split** lazy-loaded modals and views for fast initial load.

## Tech Stack

| Layer | Tech |
|---|---|
| Web | React 19, Vite 7, sonner, lucide-react, @dnd-kit, react-big-calendar (date-fns localizer) |
| Desktop | Electron 39 |
| Mobile | React Native, Expo SDK 54 |
| Backend | Firebase (Firestore, Storage, Auth, Cloud Functions v2) |
| Build/Test | Vite, vitest, @testing-library/react, ESLint |
| CI | GitHub Actions (lint + tests + mobile imports + build) |

## Quick Start

Requires **Node 20+** and **npm 10+**.

```bash
git clone https://github.com/sci-freak/phd-tracker.git
cd phd-tracker
npm install
npm run dev          # Vite dev server (http://localhost:5173)
```

For the Electron desktop app:

```bash
npm run electron:dev   # runs Vite + Electron concurrently
npm run electron:build # produces release-builds/phd-tracker-win32-x64/phd-tracker.exe
```

For the mobile app (Expo):

```bash
npm run mobile:install
npm run mobile:start
npm run mobile:android   # or :ios, :web
npm run mobile:doctor    # Expo SDK health check
```

## Verification

`npm run verify` runs the full pipeline locally (also enforced in CI on every PR):

```bash
npm run verify
# → shared tests → unit tests → mobile imports check → ESLint → Vite build
```

Individual steps:

```bash
npm run test:shared    # pure-JS shared package tests
npm run test:unit      # React component / hook tests (vitest + RTL)
npm run lint           # ESLint
npm run build          # production Vite build
```

## Architecture

```
phd-tracker/
├── src/                          Web app (React 19 + Vite)
│   ├── components/               UI components
│   ├── hooks/                    Custom hooks (useApplications, useConfirm, ...)
│   ├── services/DataService.js   Firestore CRUD + guest-localStorage fallback
│   ├── context/                  Auth + Theme context providers
│   └── styles/                   Design tokens + global CSS
├── electron/                     Electron main + preload
├── functions/                    Firebase Cloud Functions (Calendar OAuth)
├── packages/shared/              Cross-platform domain logic + tests
├── phd-tracker-v2/mobile/        React Native / Expo app
└── .github/workflows/ci.yml      GitHub Actions
```

### Key design choices

- **Workspace-based monorepo.** `@phd-tracker/shared` is consumed by web, mobile, and Cloud Functions for normalization, validation, and domain comparators — so the rules don't drift between platforms.
- **Per-user data isolation** enforced via Firestore + Storage security rules at `users/{uid}/**`.
- **OAuth secrets** for Google Calendar live in Firebase Functions secrets (`defineSecret`), never in source.
- **Composable hooks** in `src/hooks/`: `useApplications`, `useImportExport`, `useGuestMerge`, `useGlobalShortcut`, `useFilteredApplications`, `useConfirm`, `useFocusTrap`, `useBodyScrollLock`. `App.jsx` is a thin orchestrator (~210 lines).

## Google Calendar Setup

Optional. To enable Calendar integration:

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (Web Application type).
2. Add your Firebase Hosting domain and `http://localhost:5173` as authorized origins.
3. Set the Cloud Functions secrets:
   ```bash
   firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_ID
   firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_SECRET
   firebase functions:secrets:set GOOGLE_CALENDAR_REDIRECT_URI
   ```
4. Deploy: `npm run functions:deploy`.

For Electron, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars (see [`electron/main.js`](electron/main.js)) or enter them in the Calendar connection UI.

Detailed setup notes in [`google_cloud_setup.md`](google_cloud_setup.md) and [`BACKEND_CALENDAR_AUTH.md`](BACKEND_CALENDAR_AUTH.md).

## Releases

| Version | Highlights |
|---|---|
| v2.6.0 | Tests, a11y, code splitting, design tokens polish, dropped moment for date-fns |
| v2.5.0 | Design system overhaul (icons, design tokens, Inter font, themed toasts) |
| v2.4.0 | Notification system (sonner), accessible confirm dialog, App.jsx refactored into hooks/components |
| v2.3.1 | Theme bug fix, DnD guards, CORS allowlist, hardened localStorage parsing |

See [CHANGELOG.md](CHANGELOG.md) for full history.

## Privacy & Terms

- [Privacy Policy](PRIVACY_POLICY.md)
- [Terms of Service](TERMS_OF_SERVICE.md)

## License

[MIT](LICENSE) © Harsh Srivastava
