# Mobile App Build Guide

The mobile app now lives under the `@phd-tracker/mobile` workspace and can consume shared domain helpers from `@phd-tracker/shared`.

## 1. Install Dependencies

From the repository root:

```bash
npm install
```

Or install only the mobile workspace:

```bash
npm run mobile:install
```

## 2. Prerequisites

- You need an [Expo Account](https://expo.dev/signup)
- Install EAS CLI:

```bash
npm install -g eas-cli
```

- Log in:

```bash
eas login
```

## 3. Local Development

From the repository root:

```bash
npm run mobile:start
npm run mobile:android
npm run mobile:ios
npm run mobile:web
```

## 3.1 Backups On Mobile

The mobile home screen now includes backup tools under the `More` button:

- `Export Backup`: writes the current applications list to a JSON file in cache and opens the platform share sheet
- `Import Backup`: picks a `.json` or `.csv` backup file and imports valid applications into guest storage or the signed-in cloud account

The import flow reuses the same shared parsing and normalization helpers as the desktop app, so JSON/CSV backups are aligned across both platforms.

## 4. Configure Build

Run this command inside `phd-tracker-v2/mobile` if you need to create the Expo build configuration:

```bash
eas build:configure
```

## 5. Create The Build

For Android (APK for testing):

```bash
eas build -p android --profile preview
```

For iOS (Simulator build):

```bash
eas build -p ios --profile preview
```

## 6. Google Console Update

Once you have the built app, Google Sign-In will use your custom scheme:

1. Go to Google Cloud Console.
2. Add this to **Authorized redirect URIs**:
   `phdtracker:/oauth2redirect/google`

Note: The exact format depends on how Expo handles the redirect, usually `scheme:/oauth2redirect/google` or just `scheme://`.

## 7. Verification

Install the resulting `.apk` on your phone. Google Sign-In will then work natively without the "Access blocked" error.

## 8. Backup QA

For a concrete runtime checklist, use [MOBILE_BACKUP_QA.md](/C:/Users/harsh/Documents/New%20project/repo_analysis/MOBILE_BACKUP_QA.md).
Capture the results in [MOBILE_BACKUP_QA_REPORT_TEMPLATE.md](/C:/Users/harsh/Documents/New%20project/repo_analysis/MOBILE_BACKUP_QA_REPORT_TEMPLATE.md).
Sample import files are included in:

- [public/sample-backups/phd-applications-sample.json](/C:/Users/harsh/Documents/New%20project/repo_analysis/public/sample-backups/phd-applications-sample.json)
- [public/sample-backups/phd-applications-sample.csv](/C:/Users/harsh/Documents/New%20project/repo_analysis/public/sample-backups/phd-applications-sample.csv)
