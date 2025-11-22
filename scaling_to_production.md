# Google App Verification Guide (Unlimited Users)

To allow **unlimited users** to sign in to your Desktop App, you must verify it with Google.
**Good news**: Your domain `scifreak.com` is perfect for this!

## Prerequisites
Before you start, ensure you have these two pages on your website:
1.  **Home Page**: A page describing the app (e.g., `scifreak.com/phd-tracker`).
2.  **Privacy Policy**: A page explaining that you access Google Calendar to "display events" and do not store data externally (e.g., `scifreak.com/privacy`).

## Step-by-Step Verification

1.  **Go to Google Cloud Console**:
    - Navigate to **APIs & Services** > **Branding**.

2.  **Configure Branding**:
    - **App Name**: PhD Application Tracker
    - **User Support Email**: Your email.
    - **App Domain**:
        - **Home Page**: `https://scifreak.com` (or your specific app page)
        - **Privacy Policy**: `https://scifreak.com/privacy`
        - **Terms of Service**: `https://scifreak.com/terms` (optional but recommended)
    - **Authorized Domains**: Click "Add Domain" and enter `scifreak.com`.

3.  **Submit for Verification**:
    - Go to **APIs & Services** > **OAuth consent screen**.
    - Click **EDIT APP**.
    - Proceed through the steps until you see the **Submit for Verification** button.
    - **Note**: You might need to create a short YouTube video showing how you log in to the app and use the calendar feature. Google will ask for this link.

## Timeline
- **Review time**: 3 to 6 weeks.
- **During review**: The 100-user limit still applies.
- **After approval**: Unlimited users can sign in!
