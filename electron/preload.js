const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    firebaseGoogleLogin: () => ipcRenderer.invoke('auth:firebase-google'),
    loginGoogle: (credentials) => ipcRenderer.invoke('auth:start', credentials),
    logoutGoogle: () => ipcRenderer.invoke('auth:logout'),
    refreshGoogle: (data) => ipcRenderer.invoke('auth:refresh', data)
});
