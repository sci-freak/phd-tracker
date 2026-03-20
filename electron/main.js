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

    // Handle external links - allow Firebase auth popups to open within Electron
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Allow Firebase auth and Google sign-in popups to open as Electron windows
        if (url.includes('firebaseapp.com') || 
            url.includes('accounts.google.com') || 
            url.includes('googleapis.com')) {
            return { 
                action: 'allow',
                overrideBrowserWindowOptions: {
                    width: 500,
                    height: 700,
                    autoHideMenuBar: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                }
            };
        }
        // All other external links open in the system browser
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

// --- Firebase Google Auth for Electron ---
ipcMain.handle('auth:firebase-google', async () => {
    return new Promise((resolve, reject) => {
        const authWindow = new BrowserWindow({
            width: 500,
            height: 700,
            show: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // Firebase Web Client ID from the Google Cloud Console
        const WEB_CLIENT_ID = '852501777550-7vlcc4vq4pn4ar50in5qg6879n87d0b4.apps.googleusercontent.com';
        const REDIRECT_URI = 'https://phd-tracker-ae84e.firebaseapp.com/__/auth/handler';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${WEB_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=id_token` +
            `&scope=${encodeURIComponent('openid email profile')}` +
            `&nonce=${Date.now()}`;

        authWindow.loadURL(authUrl);

        // Monitor navigation for the redirect with the id_token
        authWindow.webContents.on('will-redirect', (event, redirectUrl) => {
            handleRedirect(redirectUrl);
        });

        authWindow.webContents.on('will-navigate', (event, navUrl) => {
            handleRedirect(navUrl);
        });

        function handleRedirect(redirectUrl) {
            try {
                const urlObj = new URL(redirectUrl);
                const hash = urlObj.hash.substring(1); // Remove leading #
                const params = new URLSearchParams(hash);
                const idToken = params.get('id_token');
                
                if (idToken) {
                    authWindow.close();
                    resolve({ idToken });
                    return;
                }

                // Also check query params
                const queryToken = urlObj.searchParams.get('id_token');
                if (queryToken) {
                    authWindow.close();
                    resolve({ idToken: queryToken });
                }
            } catch (e) {
                // Not a valid URL yet, ignore
            }
        }

        authWindow.on('closed', () => {
            reject(new Error('Auth window was closed'));
        });
    });
});

// --- Google Calendar Auth Handlers ---

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET_HERE';

ipcMain.handle('auth:start', async (event, credentials = {}) => {
    const clientId = credentials.clientId || GOOGLE_CLIENT_ID;
    const clientSecret = credentials.clientSecret || GOOGLE_CLIENT_SECRET;

    return new Promise((resolve, reject) => {
        if (server) {
            server.close();
            server = null;
        }

        // Create a new OAuth2Client
        server = http.createServer(async (req, res) => {
            try {
                if (req.url.startsWith('/oauth2callback')) {
                    const port = server.address().port;
                    const qs = new url.URL(req.url, `http://127.0.0.1:${port}`).searchParams;
                    
                    const error = qs.get('error');
                    if (error) {
                        res.end(`Authentication failed: ${error}. You can close this window.`);
                        if (server) { server.close(); server = null; }
                        reject(new Error(`OAuth Error: ${error}`));
                        return;
                    }

                    const code = qs.get('code');
                    if (!code) {
                        res.end('Authentication failed: No code provided. You can close this window.');
                        if (server) { server.close(); server = null; }
                        reject(new Error('No auth code found'));
                        return;
                    }

                    res.end('Authentication successful! You can close this window and return to the app.');
                    if (server) { server.close(); server = null; }

                    // Now that we have the code, use that to acquire tokens
                    const { tokens } = await oauth2Client.getToken(code);
                    oauth2Client.setCredentials(tokens);

                    resolve(tokens);
                } else {
                    res.end('Not found');
                }
            } catch (e) {
                if (server) {
                    server.close();
                    server = null;
                }
                reject(e);
            }
        });

        server.on('error', (e) => {
            if (server) { server.close(); server = null; }
            reject(e);
        });

        server.listen(0, () => {
            const port = server.address().port;
            const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
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

            // open the browser to the authorize url to start the workflow
            shell.openExternal(authorizeUrl);
        });
    });
});

ipcMain.handle('auth:refresh', async (event, { refreshToken, clientId, clientSecret }) => {
    const cId = clientId || GOOGLE_CLIENT_ID;
    const cSecret = clientSecret || GOOGLE_CLIENT_SECRET;

    // Always create a new OAuth2Client to ensure we use valid credentials for refresh
    const client = new OAuth2Client(cId, cSecret);
    
    client.setCredentials({
        refresh_token: refreshToken
    });

    const { credentials } = await client.refreshAccessToken();
    
    oauth2Client = client; // Update global reference if needed
    
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
