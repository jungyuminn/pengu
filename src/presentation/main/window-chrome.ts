import { BrowserWindow, ipcMain } from "electron";

export function registerWindowChrome(): void {
  ipcMain.handle("pengu:window-minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle("pengu:window-close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}
