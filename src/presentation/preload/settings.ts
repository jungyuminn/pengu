import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("pengu", {
  getState: () => ipcRenderer.invoke("pengu:get-state"),
  saveApiKey: (apiKey: string) => ipcRenderer.invoke("pengu:save-api-key", apiKey),
  sync: () => ipcRenderer.invoke("pengu:sync"),
  toggleOverlay: (enabled: boolean) => ipcRenderer.invoke("pengu:toggle-overlay", enabled),
  setTheme: (theme: string) => ipcRenderer.invoke("pengu:set-theme", theme),
  preview: () => ipcRenderer.invoke("pengu:preview"),
  championDetail: (championId: number) => ipcRenderer.invoke("pengu:champion-detail", championId),
  minimize: () => ipcRenderer.invoke("pengu:window-minimize"),
  closeWindow: () => ipcRenderer.invoke("pengu:window-close"),
  onState: (listener: (state: unknown) => void) => {
    const wrapped = (_event: unknown, state: unknown) => listener(state);
    ipcRenderer.on("pengu:state", wrapped);
    return () => ipcRenderer.removeListener("pengu:state", wrapped);
  },
});
