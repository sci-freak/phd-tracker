# Changelog

All notable changes to this project will be documented in this file.

## [2.3.0] - 2026-04-25

### Added
- **Mobile drag-to-reorder**: Long-press the `⋮⋮` handle on any application card to drag and drop it into a new position. Powered by `react-native-sortables` + `react-native-reanimated` 4 with haptic feedback during drag.
- **Mobile document cache pre-warm**: When an application detail screen opens, small remote documents (≤5 MB) are silently pre-fetched into the local cache so the first tap opens the share sheet without a network round-trip.
- **Per-document loading spinner** on the mobile detail screen while a document is being downloaded/opened, with sibling rows dimmed and tap-disabled.

### Fixed
- **Mobile crash on "More" tap** (Fabric `YGNodeGetOwner` Yoga assertion): replaced `FlatList` with a plain `ScrollView` + `.map()` and removed `react-native-gesture-handler`'s `Swipeable` wrappers, both of which corrupted shadow-tree ownership on Expo SDK 54 / RN 0.81. Modals are now conditionally mounted to avoid pre-mount layout passes.
- **Mobile document upload** failing silently with `Blob is not supported`: switched the Firebase Storage upload path to stream local files directly to the REST API via `expo-file-system`, bypassing the unsupported RN Blob polyfill.
- **Mobile document open** showing "Failed to open document": `expo-sharing.shareAsync` requires a local `file://` URI on Android, so remote `https://` Storage URLs are now downloaded to `cacheDirectory` first. Concurrent share invocations are coalesced into a single in-flight promise, eliminating the "Another share request is being processed" warning.
- **Mobile out-of-memory crash** when the application list re-rendered: heavy `dataUrl` / `content` / `file` / `uri` fields are now stripped from documents in the list subscription. Detail/edit screens still load full content via separate `getDoc` calls.
- **Mobile Android style NaN crash** (`startCornerRadius is NaN`): replaced unsupported `height: '100%'` on the search input row with `alignSelf: 'stretch'`.

### Changed
- **Manual sort persistence** is now centralised in `applyManualSortOrder` (shared) so web, mobile, and the new mobile drag handler all batch identical `sortOrder` writes to Firestore.
- **`SafeAreaView`** migrated from the deprecated React Native export to `react-native-safe-area-context` to silence Expo SDK 54 deprecation warnings.

### Infrastructure
- Added `firestore.rules` and `storage.rules` (locked to `request.auth.uid == userId`) and wired them into `firebase.json` so they ship on every `firebase deploy`.
- New EAS `preview` profile (`buildType: apk`) for distributable Android builds; existing `development` profile retained for Metro-connected dev clients.

## [1.3.1] - 2025-12-03

### Fixed
- **Context Menu**: Added missing "Copy" and "Paste" options to the right-click menu in the Notes editor.
- **External Links**: Fixed issue where external links (e.g., university websites) were opening in the internal application window. They now correctly open in the user's default system browser.
- **Stability**: Resolved an application freeze/crash issue that occurred when typing rapidly or adding large amounts of text to the Notes section. Optimized the rich text editor's rendering logic to prevent infinite update loops.

### Changed
- Updated `electron/main.js` to intercept window open requests.
- Optimized `WysiwygEditor.jsx` with debounced input handling and improved effect dependencies.
