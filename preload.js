const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  askAI: (prompt) => ipcRenderer.invoke("ask-ai", prompt),
  listFiles: (dir) => ipcRenderer.invoke("list-files", dir),
  readFile: (path) => ipcRenderer.invoke("read-file", path),
  getFileStats: (path) => ipcRenderer.invoke("get-file-stats", path),
  getCwd: () => ipcRenderer.invoke("get-cwd"),
  selectDirectory: () => ipcRenderer.invoke("select-directory")
});
