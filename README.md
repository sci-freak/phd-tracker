# PhD Application Tracker

A desktop application to track your PhD applications, deadlines, and requirements.

## Features

- **Track Applications**: Keep a list of universities, programs, and statuses.
- **Calendar View**: Visualize deadlines on a calendar.
- **Google Calendar Integration**: Sync deadlines to your Google Calendar.
- **Rich Text Notes**: Keep detailed notes for each application.
- **Theme Support**: Light, Dark, and Midnight themes.
- **Data Export/Import**: Backup your data to JSON or CSV.

## Installation (For Users)

Simply download and run the `PhD Tracker.exe` file. No setup required.

## Developer Setup (Building from Source)

If you want to modify the code and build the app yourself, follow these steps:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/sci-freak/phd-tracker.git
    cd phd-tracker
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Google API Keys**:
    > **IMPORTANT**: The Google API keys have been removed from the source code for security. You must add your own keys for the Calendar integration to work.

    - Open `src/config.js` and replace the placeholders:
      ```javascript
      export const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID';
      export const GOOGLE_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
      ```
    - Open `electron/main.js` and replace the placeholders:
      ```javascript
      const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID';
      const GOOGLE_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
      ```

4.  **Run in Development Mode**:
    ```bash
    npm run electron:dev
    ```

5.  **Build for Production**:
    ```bash
    npm run build
    npm run package
    ```
