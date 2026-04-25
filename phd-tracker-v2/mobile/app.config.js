// Expo dynamic config. Takes precedence over app.json when both exist.
// Values can be overridden via environment variables at build time
// (e.g. on EAS: `eas secret:create`).
//
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID      - Google OAuth 2.0 Web client ID
// EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  - Google OAuth 2.0 Android client ID
// EXPO_PUBLIC_EXPO_OWNER                - Expo account slug used for the auth proxy redirect
// EXPO_PUBLIC_NATIVE_REDIRECT_SCHEME    - iOS/Android URI scheme (matches app.scheme)

const DEFAULTS = {
    googleWebClientId: '852501777550-7vlcc4vq4pn4ar50in5qg6879n87d0b4.apps.googleusercontent.com',
    googleAndroidClientId: '852501777550-a8q3o4srrpb5cu7rd7hiu1a3rruta3jc.apps.googleusercontent.com',
    expoOwner: 'scifreak',
    nativeRedirectScheme: 'com.drharshsriv.phdtracker'
};

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULTS.googleWebClientId;
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || DEFAULTS.googleAndroidClientId;
const expoOwner = process.env.EXPO_PUBLIC_EXPO_OWNER || DEFAULTS.expoOwner;
const nativeRedirectScheme = process.env.EXPO_PUBLIC_NATIVE_REDIRECT_SCHEME || DEFAULTS.nativeRedirectScheme;

module.exports = () => ({
    expo: {
        name: 'PhD Tracker',
        slug: 'mobile',
        version: '2.3.0',
        orientation: 'portrait',
        scheme: ['phdtracker', nativeRedirectScheme],
        icon: './assets/icon.png',
        userInterfaceStyle: 'light',
        newArchEnabled: true,
        splash: {
            image: './assets/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff'
        },
        ios: {
            supportsTablet: true
        },
        android: {
            package: 'com.drharshsriv.phdtracker',
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                backgroundColor: '#ffffff'
            },
            edgeToEdgeEnabled: true
        },
        web: {
            favicon: './assets/favicon.png'
        },
        owner: expoOwner,
        extra: {
            eas: {
                projectId: '1d6c4899-c543-4a98-8b5f-443ca327d383'
            },
            googleOauth: {
                webClientId: googleWebClientId,
                androidClientId: googleAndroidClientId,
                expoProxyRedirectUri: `https://auth.expo.io/@${expoOwner}/mobile/oauthredirect`,
                nativeRedirectUri: `${nativeRedirectScheme}:/oauthredirect`
            }
        }
    }
});
