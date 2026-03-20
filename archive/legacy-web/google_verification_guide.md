# Google App Verification Guide

Since your app uses the Google Calendar API (`calendar.events.readonly`), you need to go through Google's verification process if you want to:
1.  Remove the "Google hasn't verified this app" warning screen.
2.  Onboard more than 100 users.

Here is the step-by-step process.

## Prerequisites

Before starting, ensure you have:
1.  **A Privacy Policy URL**: A publicly accessible page (e.g., on GitHub Pages or a website) explaining how you handle user data.
2.  **A Terms of Service URL**: Also publicly accessible.
3.  **A YouTube Video**: A demo video showing the login process (see below).

---

## Step 1: Configure OAuth Consent Screen

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project.
3.  Navigate to **APIs & Services** > **OAuth consent screen**.
4.  Click **Edit App**.
5.  **App Information**:
    *   **App Name**: Must match the name in your app and demo video (e.g., "PhD Tracker").
    *   **User Support Email**: Your email.
    *   **App Logo**: Upload your app icon (optional but recommended).
6.  **App Domain**:
    *   **Application Home Page**: Link to your GitHub repo or website.
    *   **Privacy Policy Link**: **REQUIRED**. (You can host a simple markdown file on GitHub Pages).
    *   **Terms of Service Link**: **REQUIRED**.
7.  **Authorized Domains**:
    *   Add the domain where your privacy policy is hosted (e.g., `github.io` if using GitHub Pages).
8.  Click **Save and Continue**.

## Step 2: Scopes

1.  Click **Add or Remove Scopes**.
2.  Search for `calendar.events.readonly`.
3.  Select it and click **Update**.
4.  **Justification**: You will be asked why you need this scope.
    *   *Explanation*: "The app allows users to view their upcoming Google Calendar events alongside their PhD application deadlines to help them manage their schedule effectively. It only reads events to display them in a list; it does not modify or delete any calendar data."

## Step 3: Test Users (Skip if Publishing)

If you are still in "Testing" mode, you don't need verification but are limited to 100 specific emails. To verify, you must push to **Production**.

1.  On the OAuth consent screen main page, click **PUBLISH APP**.
2.  Confirm you want to push to production.

## Step 4: Prepare for Verification

Once published, the verification status will likely change to "Needs Verification". Click **Prepare for Verification**.

### Required Materials

1.  **YouTube Demo Video**:
    *   Record a video showing:
        1.  How a user launches the app.
        2.  The **OAuth Consent Screen** (showing the URL bar with the Client ID, though in a desktop app this is in a popup, so show the popup clearly).
        3.  The user logging in.
        4.  The app displaying the calendar events.
        5.  **Crucial**: You must show *how* the data is used (e.g., "Here you can see the app listing my upcoming meetings next to my deadlines").
    *   Upload to YouTube as **Unlisted**.

2.  **Written Explanation**:
    *   Explain exactly why you need the `calendar.events.readonly` scope.
    *   *Example*: "Our application is a PhD Application Tracker. Users need to see their existing commitments (from Google Calendar) to avoid scheduling application tasks on busy days. We use the read-only scope to fetch and display these events within the application dashboard."

## Step 5: Submit for Verification

1.  Fill out the verification form in the Google Cloud Console.
2.  Paste the link to your YouTube demo video.
3.  Submit the form.

## Timeline

*   **Initial Review**: 3-5 days.
*   **Follow-up**: They might email you asking for clarification or changes to your Privacy Policy.
*   **Completion**: Can take 2-4 weeks total.

## Important: Privacy Policy Requirements

Your Privacy Policy **MUST** explicitly state:
1.  That you access Google User Data (Calendar events).
2.  That you do not store this data on your servers (since it's a local desktop app, it stays on the user's machine).
3.  That you do not share this data with third parties.

---

**Note**: Until verification is complete, users will see the "Unverified App" warning. They can bypass it by clicking **Advanced > Go to [App Name] (unsafe)**.
