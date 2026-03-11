const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d0d0f',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ─── IPC: Vault ────────────────────────────────────────────────────────────

ipcMain.handle('vault:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose your vault folder',
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('vault:read-all', async (_event, vaultPath) => {
  console.log('[main] vault:read-all called with:', vaultPath)
  try {
    const files = fs.readdirSync(vaultPath).filter(f => f.endsWith('.md'))
    console.log('[main] found .md files:', files.length, files)
    const nodes = files.map(file => {
      const fullPath = path.join(vaultPath, file)
      const content = fs.readFileSync(fullPath, 'utf-8')
      return { file, content }
    })
    return nodes
  } catch (e) {
    console.error('[main] vault:read-all error:', e.message)
    return []
  }
})

ipcMain.handle('vault:write-node', async (_event, vaultPath, filename, content) => {
  try {
    const fullPath = path.join(vaultPath, filename)
    fs.writeFileSync(fullPath, content, 'utf-8')
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('vault:delete-node', async (_event, vaultPath, filename) => {
  try {
    const fullPath = path.join(vaultPath, filename)
    fs.unlinkSync(fullPath)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('vault:get-path', async () => {
  // Return stored vault path from electron-store equivalent
  const configPath = path.join(app.getPath('userData'), 'config.json')
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return config.vaultPath || null
  } catch {
    return null
  }
})

ipcMain.handle('vault:set-path', async (_event, vaultPath) => {
  const configPath = path.join(app.getPath('userData'), 'config.json')
  fs.writeFileSync(configPath, JSON.stringify({ vaultPath }), 'utf-8')
  return { success: true }
})
