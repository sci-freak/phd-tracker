# PhD Application Tracker

A desktop application to track PhD applications, deadlines, notes, and supporting requirements.

## Repo Status

The active desktop/web application lives in the repository root.

- Root app: current source of truth for the Electron + React application
- `packages/shared`: shared domain helpers consumed by both desktop and mobile
- `phd-tracker-v2/mobile`: React Native mobile app, now exposed as the `@phd-tracker/mobile` workspace
- `archive/legacy-web`: archived duplicate web/desktop tree kept for reference only

If you are making changes to the desktop app, work in the root `src/`, `electron/`, and root config files.

## Features

- Track applications, universities, and statuses
- View deadlines on a calendar
- Sync with Google Calendar
- Keep rich notes per application
- Use guest mode or signed-in sync
- Export and import JSON/CSV backups

## Developer Setup

1. Clone the repository:
```bash
git clone https://github.com/sci-freak/phd-tracker.git
cd phd-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Configure Google credentials if you want Calendar integration.

The Electron calendar flow reads defaults from environment variables in [electron/main.js](C:\Users\harsh\Documents\New%20project\repo_analysis\electron\main.js):

```bash
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_CLIENT_SECRET=your_client_secret
```

You can also enter custom credentials from the app's Google Calendar connection UI. Those values are now stored by Electron in the app user-data directory rather than in browser `localStorage`.

4. Run the desktop app in development:
```bash
npm run electron:dev
```

5. Verify the active app:
```bash
npm run verify
```

6. Lint the active app only:
```bash
npm run lint
```

7. Build for production:
```bash
npm run build
```

8. Check dependency audit status:
```bash
npm run audit:check
```

9. Package the Electron app:
```bash
npm run electron:build
```

## Mobile App Commands

The mobile app is now an explicit npm workspace and the root package exposes helper commands for it:

```bash
npm run mobile:install
npm run mobile:start
npm run mobile:android
npm run mobile:ios
npm run mobile:web
npm run mobile:doctor
```

These commands proxy into `phd-tracker-v2/mobile` so the desktop and mobile workflows are easier to distinguish from the repository root.
`npm run mobile:doctor` runs Expo Doctor against the mobile workspace before device testing.

The workspace package name is:

```bash
@phd-tracker/mobile
```

The mobile app also supports backup import/export from the home screen via the `More` menu.
Export uses the platform share sheet, and import accepts `.json` and `.csv` backups using the same shared parsing logic as desktop.
Sample backup files for testing live in `public/sample-backups/`, and the runtime checklist lives in `MOBILE_BACKUP_QA.md`.
Use `MOBILE_BACKUP_QA_REPORT_TEMPLATE.md` to capture the first device or simulator validation pass.
The latest completed runtime result is recorded in `MOBILE_BACKUP_QA_REPORT.md`.

## Project Layout

- `src/`: active React application
- `electron/`: active Electron main/preload process code
- `packages/shared/`: shared domain logic for both desktop and mobile
- `archive/recovery-scripts/`: historical recovery and sanitizing utilities
- `archive/legacy-web/`: archived duplicate of the old desktop/web tree
- `phd-tracker-v2/mobile/`: mobile app
- `google_cloud_setup.md`: Google API setup notes
- `MOBILE_BUILD_GUIDE.md`: mobile-specific build notes
- `MOBILE_BACKUP_QA.md`: mobile backup runtime QA checklist
- `MOBILE_BACKUP_QA_REPORT_TEMPLATE.md`: fill-in report for mobile backup runtime validation
- `MOBILE_BACKUP_QA_REPORT.md`: latest completed mobile backup QA result

## Shared Code

Cross-platform business logic should go into the shared workspace instead of being copied between apps.

Current shared modules:

- `@phd-tracker/shared/countries`
- `@phd-tracker/shared/countryFlags`
- `@phd-tracker/shared/applications`
- `@phd-tracker/shared/dates`
- `@phd-tracker/shared/imports`
- `@phd-tracker/shared/statuses`

## Verification

Current active app verification completed during cleanup:

- `npm run lint`: passes
- `npm run build`: passes
- `npm run verify`: passes
- `npm audit`: 0 vulnerabilities after applied fixes

A GitHub Actions workflow now runs `npm run mobile:doctor` and `npm run verify` on pushes and pull requests via [ci.yml](/C:/Users/harsh/Documents/New%20project/repo_analysis/.github/workflows/ci.yml).

## Notes

The repo still contains archived recovery scripts in `archive/recovery-scripts/` and an archived legacy web tree in `archive/legacy-web/`. They are intentionally excluded from the active lint/verification path to keep maintenance focused on the current desktop application.
