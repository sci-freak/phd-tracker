# Mobile App Build Guide

To get Google Sign-In working in the final product (and to create the APK/IPA files), you need to build the app.

## 1. Prerequisites
-   You need an [Expo Account](https://expo.dev/signup).
-   Run `npm install -g eas-cli`
-   Login: `eas login`

## 2. Configure Build
Run this command to create the build configuration file:
```bash
eas build:configure
```

## 3. Create the Build
**For Android (APK for testing):**
```bash
eas build -p android --profile preview
```

**For iOS (Simulator build):**
```bash
eas build -p ios --profile preview
```

## 4. Google Console Update
Once you have the built app, Google Sign-In will use your custom scheme:
1.  Go to Google Cloud Console.
2.  Add this to **Authorized redirect URIs**:
    `phdtracker:/oauth2redirect/google`
    (Note: The exact format depends on how Expo handles the redirect, usually `scheme:/oauth2redirect/google` or just `scheme://`)

## 5. Verification
Install the resulting `.apk` on your phone. Google Sign-In will now work natively without the "Access blocked" error.
