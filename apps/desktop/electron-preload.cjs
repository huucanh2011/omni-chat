const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onUnread: (callback) => {
    const h = (_e, payload) => callback(payload);
    ipcRenderer.on("accounts:unread", h);
    return () => ipcRenderer.removeListener("accounts:unread", h);
  },
  switchAccountWebview: (payload) => ipcRenderer.invoke("webview:switch", payload),
  mountAccountWebview: (payload) => ipcRenderer.invoke("webview:mount", payload),
  resizeAccountWebview: (payload) => ipcRenderer.invoke("webview:resize", payload),
  setAccountWebviewVisibility: (payload) => ipcRenderer.invoke("webview:visibility", payload),
  reloadAccountWebview: (payload) => ipcRenderer.invoke("webview:reload", payload),
  closeAccountWebview: (payload) => ipcRenderer.invoke("webview:close", payload),
  getGatewayBaseUrl: () => ipcRenderer.invoke("app:getGatewayBaseUrl"),
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  getUpdateState: () => ipcRenderer.invoke("app:getUpdateState"),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  quitAndInstallUpdate: () => ipcRenderer.invoke("app:quitAndInstallUpdate"),
  setLaunchOnStartup: (enabled) => ipcRenderer.invoke("app:setLaunchOnStartup", enabled),
  getLaunchOnStartup: () => ipcRenderer.invoke("app:getLaunchOnStartup"),
  clearAccountSession: (payload) => ipcRenderer.invoke("account:clearSession", payload),
  getAccountHealth: () => ipcRenderer.invoke("account:getHealth"),
  recoverAccount: (payload) => ipcRenderer.invoke("account:recover", payload)
});
