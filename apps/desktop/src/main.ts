import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null
let backendProc: ChildProcess | null = null
let dbProc: ChildProcess | null = null
let appUrl = ''

const isDev = !app.isPackaged
const DEV_URL = process.env.PLANNER_DEV_URL || 'http://127.0.0.1:5173'
const DB_PORT = 3307

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo
      server.close(() => resolve(address.port))
    })
  })
}

async function waitFor(url: string, timeoutMs = 60000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // 后端尚未就绪
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function startMariaDB(mariadbDir: string): boolean {
  const exe = path.join(mariadbDir, 'bin', 'mariadbd.exe')
  if (!fs.existsSync(exe)) return false
  const dataDir = path.join(app.getPath('userData'), 'mariadb-data')
  const launchArgs = ['--datadir=' + dataDir, '--port=' + DB_PORT, '--bind-address=127.0.0.1']
  if (!fs.existsSync(path.join(dataDir, 'mysql'))) {
    const init = spawn(
      path.join(mariadbDir, 'bin', 'mariadb-install-db.exe'),
      ['--datadir=' + dataDir, '--auth-root-authentication-method=normal'],
      { stdio: 'ignore', windowsHide: true },
    )
    init.on('exit', () => {
      dbProc = spawn(exe, launchArgs, { stdio: 'ignore', windowsHide: true })
    })
  } else {
    dbProc = spawn(exe, launchArgs, { stdio: 'ignore', windowsHide: true })
  }
  return true
}

async function ensureBackend(): Promise<void> {
  const res = process.resourcesPath
  const backendDir = path.join(res, 'backend')
  const backendExe = path.join(backendDir, 'backend.exe')
  const mariadbDir = path.join(res, 'mariadb')
  const frontendDist = path.join(res, 'frontend')

  const hasBundledDb = startMariaDB(mariadbDir)
  const dbUrl = hasBundledDb
    ? `mysql+pymysql://root@127.0.0.1:${DB_PORT}/planner_db?charset=utf8mb4`
    : (process.env.DATABASE_URL || 'mysql+pymysql://root:123456@127.0.0.1:3306/planner_db?charset=utf8mb4')

  const port = await getFreePort()
  backendProc = spawn(backendExe, [], {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      FRONTEND_DIST: frontendDist,
      PLANNER_PORT: String(port),
      AUTO_CREATE_TABLES: 'true',
      DB_HOST: '127.0.0.1',
      DB_PORT: String(DB_PORT),
    },
    stdio: 'ignore',
    windowsHide: true,
  })

  const url = `http://127.0.0.1:${port}`
  if (!(await waitFor(`${url}/api/health`))) {
    throw new Error('本地后端启动超时，请检查数据配置')
  }
  appUrl = url
}

function createWindow(url: string) {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
  title: '未央 · Everlong',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadURL(url)
  mainWindow.on('closed', () => (mainWindow = null))
}

function shutdown() {
  backendProc?.kill()
  dbProc?.kill()
  backendProc = null
  dbProc = null
}

app.whenReady().then(async () => {
  try {
    if (isDev) {
      appUrl = DEV_URL
    } else {
      await ensureBackend()
    }
    createWindow(appUrl)
  } catch (err) {
    console.error('应用启动失败', err)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  shutdown()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', shutdown)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && appUrl) createWindow(appUrl)
})
