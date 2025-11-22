# How to Create Google Cloud Desktop Credentials

1.  **Go to Google Cloud Console**:
    - Visit [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).

2.  **Create Credentials**:
    - Click **+ CREATE CREDENTIALS** at the top.
    - Select **OAuth client ID**.

3.  **Configure Application Type**:
    - **Application type**: Select **Desktop app**.
    - **Name**: Enter a name (e.g., "PhD Tracker Desktop").

4.  **Finish**:
    - Click **CREATE**.
    - You will see a popup with your **Client ID** and **Client Secret**.
    - Copy both of these values; you will need them for the app.

5.  **Add Test Users (Crucial Step)**:
    - In the left menu, under "Google Auth Platform", click **Audience**.
    - Scroll down to the **Test users** section.
    - Click **+ ADD USERS**.
    - Enter the email address(es) you will use to sign in (e.g., your gmail).
    - Click **SAVE**.
    - *Note: Without this, you will see an "Access blocked" error.*

6.  **Publishing (For Sharing)**:
    - To let others log in *without* adding their emails manually:
    - Go to **OAuth consent screen**.
    - Click the **PUBLISH APP** button under "Publishing status".
    - Confirm to push to **Production**.
    - **Important**: Since you haven't gone through Google's formal verification process (which takes weeks), users will see a **"Google hasn't verified this app"** warning.
    - Tell them to click **Advanced** -> **Go to PhD Tracker (unsafe)** to continue. This is safe; it just means Google hasn't audited your personal app.

    > [!WARNING]
    > **User Limit**: Unverified apps are limited to **100 unique users**. If you share this with more than 100 people who sign in, new users will be blocked until you verify the app with Google (which is a complex process).
