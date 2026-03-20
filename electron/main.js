const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const http = require('http');
const url = require('url');

let mainWindow;
let oauth2Client;
let server;

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET_HERE';

const getSessionFilePath = () => path.join(app.getPath('userData'), 'google-calendar-auth.json');

const encryptValue = (value) => {
    if (!value) return null;
    if (safeStorage.isEncryptionAvailable()) {
        return {
            encrypted: true,
            value: safeStorage.encryptString(value).toString('base64')
        };
    }

    return {
        encrypted: false,
        value
    };
};

const decryptValue = (payload) => {
    if (!payload || !payload.value) return '';
    if (!payload.encrypted) return payload.value;

    try {
        return safeStorage.decryptString(Buffer.from(payload.value, 'base64'));
    } catch (error) {
        console.error('Failed to decrypt Google session value', error);
        return '';
    }
};

const loadGoogleSession = () => {
    try {
        const sessionFile = getSessionFilePath();
        if (!fs.existsSync(sessionFile)) {
            return null;
        }

        const raw = fs.readFileSync(sessionFile, 'utf8');
        const parsed = JSON.parse(raw);

        return {
            refreshToken: decryptValue(parsed.refreshToken),
            clientId: decryptValue(parsed.clientId),
            clientSecret: decryptValue(parsed.clientSecret)
        };
    } catch (error) {
        console.error('Failed to load Google session', error);
        return null;
    }
};

const saveGoogleSession = ({ refreshToken, clientId, clientSecret }) => {
    const payload = {
        refreshToken: encryptValue(refreshToken),
        clientId: encryptValue(clientId),
        clientSecret: encryptValue(clientSecret)
    };

    fs.writeFileSync(getSessionFilePath(), JSON.stringify(payload, null, 2), 'utf8');
};

const clearGoogleSession = () => {
    const sessionFile = getSessionFilePath();
    if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
    }
};

const getStoredCredentials = () => {
    const storedSession = loadGoogleSession();
    return {
        clientId: storedSession?.clientId || GOOGLE_CLIENT_ID,
        clientSecret: storedSession?.clientSecret || GOOGLE_CLIENT_SECRET,
        refreshToken: storedSession?.refreshToken || ''
    };
};

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

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
        if (targetUrl.includes('firebaseapp.com') ||
            targetUrl.includes('accounts.google.com') ||
            targetUrl.includes('googleapis.com')) {
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
        if (targetUrl.startsWith('https:') || targetUrl.startsWith('http:')) {
            shell.openExternal(targetUrl);
        }
        return { action: 'deny' };
    });
}

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

ipcMain.handle('auth:firebase-google', async () => {
    return new Promise((resolve, reject) => {
        let resolved = false;
        const authWindow = new BrowserWindow({
            width: 500,
            height: 700,
            show: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const WEB_CLIENT_ID = '852501777550-7vlcc4vq4pn4ar50in5qg6879n87d0b4.apps.googleusercontent.com';
        const REDIRECT_URI = 'https://phd-tracker-ae84e.firebaseapp.com/__/auth/handler';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${WEB_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=id_token` +
            `&scope=${encodeURIComponent('openid email profile')}` +
            `&nonce=${Date.now()}`;

        authWindow.loadURL(authUrl);

        const handleRedirect = (redirectUrl) => {
            try {
                const urlObj = new URL(redirectUrl);
                const hash = urlObj.hash.substring(1);
                const params = new URLSearchParams(hash);
                const idToken = params.get('id_token') || urlObj.searchParams.get('id_token');

                if (idToken && !resolved) {
                    resolved = true;
                    authWindow.close();
                    resolve({ idToken });
                }
            } catch {
                // Ignore incomplete redirects.
            }
        };

        authWindow.webContents.on('will-redirect', (_event, redirectUrl) => {
            handleRedirect(redirectUrl);
        });

        authWindow.webContents.on('will-navigate', (_event, navUrl) => {
            handleRedirect(navUrl);
        });

        authWindow.on('closed', () => {
            if (!resolved) {
                reject(new Error('Auth window was closed'));
            }
        });
    });
});

ipcMain.handle('auth:get-session', async () => {
    const storedSession = loadGoogleSession();
    return {
        hasRefreshToken: Boolean(storedSession?.refreshToken),
        hasCustomCredentials: Boolean(storedSession?.clientId && storedSession?.clientSecret)
    };
});

ipcMain.handle('auth:start', async (_event, credentials = {}) => {
    const clientId = credentials.clientId || GOOGLE_CLIENT_ID;
    const clientSecret = credentials.clientSecret || GOOGLE_CLIENT_SECRET;

    return new Promise((resolve, reject) => {
        if (server) {
            server.close();
            server = null;
        }

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

                    const { tokens } = await oauth2Client.getToken(code);
                    oauth2Client.setCredentials(tokens);

                    if (tokens.refresh_token) {
                        saveGoogleSession({
                            refreshToken: tokens.refresh_token,
                            clientId: credentials.clientId || '',
                            clientSecret: credentials.clientSecret || ''
                        });
                    }

                    resolve({
                        access_token: tokens.access_token || '',
                        expiry_date: tokens.expiry_date || null,
                        hasRefreshToken: Boolean(tokens.refresh_token)
                    });
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
            oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

            const authorizeUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
                prompt: 'consent'
            });

            shell.openExternal(authorizeUrl);
        });
    });
});

ipcMain.handle('auth:refresh', async () => {
    const { refreshToken, clientId, clientSecret } = getStoredCredentials();

    if (!refreshToken) {
        throw new Error('No stored refresh token found');
    }

    const client = new OAuth2Client(clientId, clientSecret);
    client.setCredentials({
        refresh_token: refreshToken
    });

    const { credentials } = await client.refreshAccessToken();
    oauth2Client = client;

    return {
        access_token: credentials.access_token || '',
        expiry_date: credentials.expiry_date || null,
        hasRefreshToken: true
    };
});

ipcMain.handle('auth:logout', async () => {
    oauth2Client = null;
    clearGoogleSession();
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
