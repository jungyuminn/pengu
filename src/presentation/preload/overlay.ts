import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("penguOverlay", {
  onView: (listener: (view: unknown) => void) => {
    ipcRenderer.on("pengu:overlay", (_event, view) => listener(view));
  },
});
