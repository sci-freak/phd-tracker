const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    firebaseGoogleLogin: () => ipcRenderer.invoke('auth:firebase-google'),
    getGoogleSession: () => ipcRenderer.invoke('auth:get-session'),
    getGoogleCalendarToken: () => ipcRenderer.invoke('auth:get-calendar-token'),
    saveGoogleDesktopCredentials: (credentials) => ipcRenderer.invoke('auth:set-desktop-credentials', credentials),
    loginGoogle: (credentials) => ipcRenderer.invoke('auth:start', credentials),
    logoutGoogle: () => ipcRenderer.invoke('auth:logout'),
    refreshGoogle: () => ipcRenderer.invoke('auth:refresh'),
    openExternal: (targetUrl) => ipcRenderer.invoke('shell:open-external', targetUrl)
});
