const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    loginGoogle: (credentials) => ipcRenderer.invoke('auth:start', credentials),
    logoutGoogle: () => ipcRenderer.invoke('auth:logout'),
    refreshGoogle: (refreshToken) => ipcRenderer.invoke('auth:refresh', refreshToken)
});
