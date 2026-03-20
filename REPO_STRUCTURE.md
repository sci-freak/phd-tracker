# Repository Structure

## Current Source Of Truth

The current desktop application is the root Electron + React app.

- App code: [src](C:\Users\harsh\Documents\New%20project\repo_analysis\src)
- Electron shell: [electron](C:\Users\harsh\Documents\New%20project\repo_analysis\electron)
- Shared workspace: [packages/shared](C:\Users\harsh\Documents\New%20project\repo_analysis\packages\shared)
- Tooling: [package.json](C:\Users\harsh\Documents\New%20project\repo_analysis\package.json), [vite.config.js](C:\Users\harsh\Documents\New%20project\repo_analysis\vite.config.js), [eslint.config.mjs](C:\Users\harsh\Documents\New%20project\repo_analysis\eslint.config.mjs)

## Secondary Trees

- [archive/recovery-scripts](C:\Users\harsh\Documents\New%20project\repo_analysis\archive\recovery-scripts): archived recovery and sanitizing utilities
- [archive/legacy-web](C:\Users\harsh\Documents\New%20project\repo_analysis\archive\legacy-web): archived duplicate of the older desktop/web app
- [packages/shared](C:\Users\harsh\Documents\New%20project\repo_analysis\packages\shared): shared domain helpers for both active apps
- [phd-tracker-v2/mobile](C:\Users\harsh\Documents\New%20project\repo_analysis\phd-tracker-v2\mobile): React Native app exposed as the `@phd-tracker/mobile` workspace

## Maintenance Guidance

- Make desktop fixes in the root app only.
- Put cross-platform business logic in `packages/shared` when both apps need the same behavior.
- Treat `archive/legacy-web` as archival unless you are intentionally diffing or porting code.
- Keep lint/build verification focused on the root app until the legacy tree is either removed or reconciled.
- Use the root `mobile:*` scripts or workspace-aware npm commands when you want to operate on the mobile app from the repository root.

## Recommended Future Cleanup

1. Decide whether `archive/legacy-web` should stay in the repo long-term or move out to a dedicated archival branch/release bundle.
2. Continue moving duplicated validation, import/export, and data-shaping logic into `packages/shared`.
