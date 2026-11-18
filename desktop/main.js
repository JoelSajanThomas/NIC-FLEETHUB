/**
 * NIC FleetHub — Enterprise Desktop Application (Windows & macOS)
 * National Industries Company (K.S.C.C) Kuwait
 * 
 * Secure, cross-platform desktop shell wrapping the unified frontend
 * with native window controls, printing, document downloads, and deep linking.
 */

const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const DEFAULT_URL = process.env.FLEETHUB_URL || "http://localhost:3000/app";

let mainWindow = null;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: "NIC FleetHub — Kuwait Fleet & Workshop Management",
    icon: path.join(__dirname, "../frontend/public/assets/icon-512x512.webp"),
    backgroundColor: "#0a0a0a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Native Desktop Menu
  buildNativeMenu();

  // Load URL or local index
  if (isDev) {
    mainWindow.loadURL(DEFAULT_URL).catch(() => {
      console.warn("[Desktop] Failed to load remote dev server, falling back to local files");
      mainWindow.loadFile(path.join(__dirname, "../frontend/public/app.html"));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../frontend/public/app.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external links safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildNativeMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Print Active View / Work Order",
          accelerator: "CmdOrCtrl+P",
          click: () => {
            if (mainWindow) mainWindow.webContents.print();
          }
        },
        {
          label: "Reload System",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        { type: "separator" },
        { role: isMac ? "close" : "quit" }
      ]
    },
    {
      label: "Operations",
      submenu: [
        {
          label: "Executive Dashboard",
          accelerator: "CmdOrCtrl+1",
          click: () => navigateTo("#v-dashboard")
        },
        {
          label: "Fleet & Heavy Equipment Register",
          accelerator: "CmdOrCtrl+2",
          click: () => navigateTo("#v-fleet")
        },
        {
          label: "Breakdown Complaints",
          accelerator: "CmdOrCtrl+3",
          click: () => navigateTo("#v-complaints")
        },
        {
          label: "Central Workshop Orders",
          accelerator: "CmdOrCtrl+4",
          click: () => navigateTo("#v-work-orders")
        },
        {
          label: "Heavy Store Spare Parts",
          accelerator: "CmdOrCtrl+5",
          click: () => navigateTo("#v-inventory")
        },
        {
          label: "Kuwait Compliance & Expiries",
          accelerator: "CmdOrCtrl+6",
          click: () => navigateTo("#v-compliance")
        }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "NIC Kuwait Fleet Operations Portal",
          click: async () => {
            await shell.openExternal("https://nic.com.kw");
          }
        },
        {
          label: "About NIC FleetHub",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About NIC FleetHub",
              message: "National Industries Company (K.S.C.C) Kuwait",
              detail: "Enterprise Fleet, Workshop & Heavy Equipment Management System\nVersion 1.0.0 (Cross-Platform Edition)\nBase Currency: Kuwaiti Dinar (KWD)"
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function navigateTo(hash) {
  if (mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      if (window.location.hash !== '${hash}') {
        window.location.hash = '${hash}';
      }
    `);
  }
}

// IPC Handlers
ipcMain.handle("desktop:get-platform", () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    locale: app.getLocale()
  };
});

ipcMain.handle("desktop:print-dialog", async () => {
  if (!mainWindow) return false;
  return new Promise((resolve) => {
    mainWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      resolve({ success, failureReason });
    });
  });
});

ipcMain.handle("desktop:download-file", async (event, { defaultName, dataBase64 }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Save FleetHub Export",
    defaultPath: defaultName || "fleethub_document.pdf"
  });
  if (filePath && dataBase64) {
    const buffer = Buffer.from(dataBase64, "base64");
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  }
  return { success: false };
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
