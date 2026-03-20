# Changelog

All notable changes to this project will be documented in this file.

## [1.3.1] - 2025-12-03

### Fixed
- **Context Menu**: Added missing "Copy" and "Paste" options to the right-click menu in the Notes editor.
- **External Links**: Fixed issue where external links (e.g., university websites) were opening in the internal application window. They now correctly open in the user's default system browser.
- **Stability**: Resolved an application freeze/crash issue that occurred when typing rapidly or adding large amounts of text to the Notes section. Optimized the rich text editor's rendering logic to prevent infinite update loops.

### Changed
- Updated `electron/main.js` to intercept window open requests.
- Optimized `WysiwygEditor.jsx` with debounced input handling and improved effect dependencies.
