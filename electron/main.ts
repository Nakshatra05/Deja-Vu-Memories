import { app, BrowserWindow, Tray, Menu, nativeImage, screen, clipboard } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let clipboardInterval: NodeJS.Timeout | null = null;
let lastClipboardText = "";

const DEV_URL = "http://localhost:8080";
const IS_DEV = !app.isPackaged;

function getIconPath(): string {
  // In dev, resolve from project root; in prod, from resources
  if (IS_DEV) {
    return path.join(__dirname, "..", "src", "assets", "mascot.png");
  }
  return path.join(process.resourcesPath, "mascot.png");
}

let isQuitting = false;

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(820, height),
    minWidth: 900,
    minHeight: 600,
    title: "Déjà Vu",
    icon,
    show: false, // Show when ready to avoid flash
    backgroundColor: "#0f0f14",
    autoHideMenuBar: true, // Hides the default File/Edit/View menu bar
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the Vite dev server in dev, or the built files in prod
  if (IS_DEV) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "client", "index.html"));
  }

  // Show window once content is ready (no white flash)
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Minimize to tray instead of closing
  mainWindow.on("close", (event) => {
    if (tray && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startClipboardMonitoring() {
  lastClipboardText = clipboard.readText();
  clipboardInterval = setInterval(() => {
    const text = clipboard.readText();
    if (text !== lastClipboardText) {
      lastClipboardText = text;
      // Send the new clipboard text to the React app
      if (mainWindow) {
        mainWindow.webContents.send("clipboard-changed", text);
      }
    }
  }, 1000); // Check every 1 second
}

function createTray(): void {
  const iconPath = getIconPath();
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Déjà Vu",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Déjà Vu — The memory that finds you");
  tray.setContextMenu(contextMenu);

  // Click tray icon to show window
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// ── App lifecycle ────────────────────────────────

// Disable Hardware Acceleration and aggressive GPU/sandbox disable to prevent GPU process crashes on some Windows machines
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-gpu-rasterization");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("no-sandbox");

app.whenReady().then(() => {
  createTray();
  createWindow();
  startClipboardMonitoring();

  app.on("activate", () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
