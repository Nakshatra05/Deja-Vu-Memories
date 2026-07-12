import { contextBridge, ipcRenderer } from "electron";
// Expose a safe bridge to the renderer (your React app).
contextBridge.exposeInMainWorld("electronAPI", {
    platform: process.platform,
    isElectron: true,
    // Listen to clipboard changes sent from main process
    onClipboardChange: (callback) => {
        ipcRenderer.on("clipboard-changed", (_event, text) => callback(text));
    },
});
