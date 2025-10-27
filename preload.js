const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  askAI: (prompt) => ipcRenderer.invoke("ask-ai", prompt),
  listFiles: (dir) => ipcRenderer.invoke("list-files", dir),
  readFile: (path) => ipcRenderer.invoke("read-file", path),
  getFileStats: (path) => ipcRenderer.invoke("get-file-stats", path),
  getCwd: () => ipcRenderer.invoke("get-cwd"),
  getDocsDir: () => ipcRenderer.invoke("get-docs-dir"),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  saveFile: (path, content) => ipcRenderer.invoke("save-file", path, content),
  createFile: (path, content) => ipcRenderer.invoke("create-file", path, content),
  deleteFile: (path) => ipcRenderer.invoke("delete-file", path),
  createDirectory: (path) => ipcRenderer.invoke("create-directory", path),
  executeCommand: (command) => ipcRenderer.invoke("execute-command", command)
});
