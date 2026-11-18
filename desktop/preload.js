/**
 * NIC FleetHub — Desktop Preload Bridge
 * Exposes secure native APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  isDesktop: true,
  getPlatformInfo: () => ipcRenderer.invoke("desktop:get-platform"),
  printDialog: () => ipcRenderer.invoke("desktop:print-dialog"),
  downloadFile: (options) => ipcRenderer.invoke("desktop:download-file", options)
});
