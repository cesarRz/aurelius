const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  vault: {
    choose: () => ipcRenderer.invoke('vault:choose'),
    readAll: (vaultPath) => ipcRenderer.invoke('vault:read-all', vaultPath),
    writeNode: (vaultPath, filename, content) =>
      ipcRenderer.invoke('vault:write-node', vaultPath, filename, content),
    deleteNode: (vaultPath, filename) =>
      ipcRenderer.invoke('vault:delete-node', vaultPath, filename),
    getPath: () => ipcRenderer.invoke('vault:get-path'),
    setPath: (vaultPath) => ipcRenderer.invoke('vault:set-path', vaultPath),
  },
})
