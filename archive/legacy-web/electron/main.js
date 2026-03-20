const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const http = require('http');
const url = require('url');

let mainWindow;
let oauth2Client;
let server;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    // In development, load from Vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built index.html
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
}

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});

// --- Google Auth Handlers ---

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';

ipcMain.handle('auth:start', async (event, credentials = {}) => {
    const clientId = credentials.clientId || GOOGLE_CLIENT_ID;
    const clientSecret = credentials.clientSecret || GOOGLE_CLIENT_SECRET;

    return new Promise((resolve, reject) => {
        if (server) {
            server.close();
            server = null;
        }

        // Create a new OAuth2Client
        // Use a loopback IP for the redirect URI
        const redirectUri = 'http://127.0.0.1:3000/oauth2callback';

        oauth2Client = new OAuth2Client(
            clientId,
            clientSecret,
            redirectUri
        );

        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
            prompt: 'consent' // Force consent to ensure we get a refresh token
        });

        // Create a temporary local server to listen for the callback
        server = http.createServer(async (req, res) => {
            try {
                if (req.url.startsWith('/oauth2callback')) {
                    const qs = new url.URL(req.url, 'http://127.0.0.1:3000').searchParams;
                    const code = qs.get('code');

                    res.end('Authentication successful! You can close this window and return to the app.');
                    server.close();
                    server = null;

                    // Now that we have the code, use that to acquire tokens
                    const { tokens } = await oauth2Client.getToken(code);
                    oauth2Client.setCredentials(tokens);

                    resolve(tokens);
                }
            } catch (e) {
                reject(e);
            }
        });

        server.listen(3000, () => {
            // open the browser to the authorize url to start the workflow
            shell.openExternal(authorizeUrl);
        });
    });
});

ipcMain.handle('auth:refresh', async (event, { refreshToken, clientId, clientSecret }) => {
    const cId = clientId || GOOGLE_CLIENT_ID;
    const cSecret = clientSecret || GOOGLE_CLIENT_SECRET;

    if (!oauth2Client) {
        // Re-initialize client if needed
        oauth2Client = new OAuth2Client(
            cId,
            cSecret,
            'http://127.0.0.1:3000/oauth2callback'
        );
    }

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
});

ipcMain.handle('auth:logout', async () => {
    oauth2Client = null;
    return true;
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
