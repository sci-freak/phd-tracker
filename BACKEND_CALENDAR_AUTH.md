# Backend Calendar Auth Plan

This repo is now moving toward a backend-assisted Google Calendar connection flow so end users do not have to enter OAuth client credentials in the desktop UI.

## Goal

After a user signs in with Google on the home screen:

1. The app loads their synced PhD applications.
2. The app can connect Google Calendar through a server-managed OAuth flow.
3. End users never see Google client IDs or secrets.

## Why The Desktop-Only Approach Broke Down

- Firebase Google sign-in works for the app account.
- Packaged Electron apps run from `file://`, which breaks Google web token flows like `storagerelay://file/...`.
- Google Calendar desktop OAuth requires a separate, valid OAuth desktop/client configuration or a server-managed exchange.

That means true one-step user experience needs a backend, not more client-side credential prompts.

## Backend Pieces Added

The `functions/` folder now contains initial Firebase Functions scaffolding for:

- `getGoogleCalendarAuthUrl`
  Returns a server-generated Google OAuth URL for the signed-in Firebase user.

- `googleCalendarOAuthCallback`
  Exchanges the Google OAuth code and stores the user’s refresh token in Firestore.

- `listGoogleCalendarEvents`
  Refreshes tokens server-side and returns upcoming primary-calendar events.

## What Still Needs To Be Deployed

These Firebase function secrets must be configured before the backend flow can work:

- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`

The redirect URI should point to the deployed callback function URL.

## Recommended Deployment Commands

Run these from the repository root in your own terminal:

```powershell
npx.cmd firebase login
npm.cmd run functions:install
npx.cmd firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_ID
npx.cmd firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_SECRET
npx.cmd firebase functions:secrets:set GOOGLE_CALENDAR_REDIRECT_URI
npm.cmd run functions:deploy
```

When prompted:

- `GOOGLE_CALENDAR_CLIENT_ID`: use your Google OAuth desktop/web client ID chosen for the backend flow
- `GOOGLE_CALENDAR_CLIENT_SECRET`: use the matching secret
- `GOOGLE_CALENDAR_REDIRECT_URI`: use the deployed callback URL for `googleCalendarOAuthCallback`

The callback URL format will look like:

```text
https://<region>-<project-id>.cloudfunctions.net/googleCalendarOAuthCallback
```

## Recommended Next Step

1. Deploy Firebase Functions.
2. Store Google OAuth secrets in Firebase Functions secrets.
3. Refactor the desktop app to call the backend auth URL + callback flow instead of asking users for desktop credentials locally.
4. Remove the Settings credential UI once the backend path is live.
