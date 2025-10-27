const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile("./renderer/index.html");
}

app.whenReady().then(createWindow);
// Docs klasörü yolunu sağlayan handler
ipcMain.handle("get-docs-dir", async () => {
  try {
    const docsPath = path.join(process.cwd(), "docs");
    await fs.promises.mkdir(docsPath, { recursive: true });
    return docsPath.replace(/\\/g, "/");
  } catch (error) {
    console.error("[main] Error ensuring docs dir:", error);
    throw error;
  }
});

// Klasör seçme isteği
ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

// Dosya listeleme isteği
ipcMain.handle("list-files", async (event, dirPath) => {
  try {
    // Input validation
    if (!dirPath || typeof dirPath !== "string") {
      console.error("[main] Invalid directory path received:", dirPath);
      throw new Error("Invalid directory path");
    }

    // Clean up and normalize path
    try {
      dirPath = path.normalize(dirPath.trim());
    } catch (err) {
      console.error("[main] Path normalization failed:", err);
      throw new Error("Invalid path format");
    }

    console.log("[main] Attempting to list files in directory:", dirPath);

    // Validate directory exists and is accessible
    try {
      const stats = await fs.promises.stat(dirPath);
      if (!stats.isDirectory()) {
        throw new Error("Path is not a directory");
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        throw new Error(`Directory does not exist: ${dirPath}`);
      } else if (err.code === "EACCES") {
        throw new Error(`Access denied to directory: ${dirPath}`);
      } else {
        console.error("[main] Directory validation error:", err);
        throw new Error(`Cannot access directory: ${err.message}`);
      }
    }

    // Read directory contents
    let files;
    try {
      files = await fs.promises.readdir(dirPath);
      console.log(
        `[main] Successfully read ${files.length} entries from ${dirPath}`
      );
    } catch (err) {
      console.error("[main] Failed to read directory:", err);
      throw new Error(`Failed to read directory: ${err.message}`);
    }

    // Process each file
    const filePromises = files.map(async (name) => {
      const fullPath = path.join(dirPath, name);
      try {
        const stats = await fs.promises.stat(fullPath);
        return {
          name,
          path: fullPath.replace(/\\/g, "/"), // Normalize to forward slashes
          isDir: stats.isDirectory(),
        };
      } catch (err) {
        console.warn(`[main] Could not stat file ${fullPath}:`, err);
        return null;
      }
    });

    // Wait for all file processing to complete
    const results = await Promise.all(filePromises);
    const validResults = results.filter((f) => f !== null);
    console.log(`[main] Returning ${validResults.length} valid entries`);
    return validResults;
  } catch (error) {
    console.error("[main] Error listing files:", error);
    throw error;
  }
});

// Çalışma dizini alma isteği
ipcMain.handle("get-cwd", () => {
  try {
    const cwd = process.cwd();
    console.log("[main] Current working directory:", cwd);
    return cwd.replace(/\\/g, "/"); // Normalize to forward slashes
  } catch (error) {
    console.error("[main] Error getting current directory:", error);
    // Fallback to a safe default
    return process.platform === "win32" ? "C:/" : "/";
  }
});

// Dosya okuma isteği
ipcMain.handle("read-file", async (event, filePath) => {
  try {
    return await fs.promises.readFile(filePath, "utf8");
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
});

// Dosya bilgisi alma isteği
ipcMain.handle("get-file-stats", async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      mtime: stats.mtime.toISOString(),
    };
  } catch (error) {
    console.error("Error getting file stats:", error);
    throw error;
  }
});

// Dosya kaydetme isteği
ipcMain.handle("save-file", async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, "utf8");
    console.log("[main] File saved:", filePath);
    return { success: true };
  } catch (error) {
    console.error("Error saving file:", error);
    throw error;
  }
});

// AI isteği
ipcMain.handle("ask-ai", async (event, prompt) => {
  console.log("[ask-ai] Received request, connecting to Ollama...");

  // First, check if Ollama is running
  try {
    await new Promise((resolve, reject) => {
      const req = http.get("http://localhost:11434/", (res) => {
        console.log("[ask-ai] Ollama health check:", res.statusCode);
        // Drain and end
        res.resume();
        resolve();
      });
      req.on("error", reject);
      req.end();
    });
  } catch (err) {
    console.error("[ask-ai] Ollama not responding:", err.message);
    throw new Error(
      "Cannot connect to Ollama. Make sure it's running: ollama serve"
    );
  }

  return new Promise((resolve, reject) => {
  const MODEL_NAME = process.env.AI_MODEL || "llama3"; // Centralized model config
  const postData = JSON.stringify({ model: MODEL_NAME, prompt });

    console.log(
      "[ask-ai] Sending request to Ollama, prompt length:",
      prompt.length
    );

    const options = {
      hostname: "localhost",
      port: 11434,
      path: "/api/generate",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      console.log(
        "[ask-ai] Response received, status:",
        res.statusCode,
        "headers:",
        res.headers
      );

      if (res.statusCode !== 200) {
        let errorData = "";
        res.on("data", (chunk) => (errorData += chunk));
        res.on("end", () => {
          clearTimeout(timeout);
          console.error("[ask-ai] Error response body:", errorData);
          reject(
            new Error(`Ollama returned status ${res.statusCode}: ${errorData}`)
          );
        });
        return;
      }

      console.log("[ask-ai] Starting to read stream...");
      let text = "";
      let chunkCount = 0;

      res.on("data", (chunk) => {
        chunkCount++;
        text += chunk.toString();
        if (chunkCount % 10 === 0 || chunkCount === 1) {
          console.log(
            "[ask-ai] Chunk #" + chunkCount + ", total length:",
            text.length
          );
        }
      });

      res.on("end", () => {
        clearTimeout(timeout);
        console.log(
          "[ask-ai] Stream complete, total text length:",
          text.length
        );

        // Parse all JSON lines
        const lines = text.split("\n").filter((l) => l.trim().startsWith("{"));
        console.log("[ask-ai] Found", lines.length, "JSON lines");

        if (lines.length === 0) {
          console.error(
            "[ask-ai] No JSON lines found. Raw text:",
            text.substring(0, 500)
          );
          reject(new Error("No valid JSON lines in response"));
          return;
        }

        try {
          // Collect all responses from streaming
          let fullResponse = "";

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);

              // Extract response content (can be incremental)
              if (parsed.response) {
                fullResponse += parsed.response;
              } else if (parsed.text) {
                fullResponse += parsed.text;
              } else if (parsed.content) {
                fullResponse += parsed.content;
              }

              // Check if this is the final response
              if (parsed.done) {
                console.log("[ask-ai] Final response flag detected");
                break;
              }
            } catch (e) {
              console.warn("[ask-ai] Failed to parse line:", line);
            }
          }

          console.log(
            "[ask-ai] Combined response length:",
            fullResponse.length
          );

          if (!fullResponse.trim()) {
            console.error(
              "[ask-ai] Response is empty. First parsed line:",
              JSON.stringify(JSON.parse(lines[0]), null, 2)
            );
            reject(new Error("AI returned empty response"));
            return;
          }

          resolve(fullResponse.trim());
        } catch (err) {
          console.error("[ask-ai] Error processing response:", err);
          console.error("[ask-ai] Sample text:", text.substring(0, 300));
          reject(err);
        }
      });
    });

    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error("Request timeout after 2 minutes"));
    }, 120000);

    req.on("error", (err) => {
      clearTimeout(timeout);
      console.error("[ask-ai] Request error:", err);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
});


// Dosya oluşturma isteği
ipcMain.handle("create-file", async (event, filePath, content = '') => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    console.log("[main] File created:", filePath);
    return { success: true, path: filePath };
  } catch (error) {
    console.error("Error creating file:", error);
    throw error;
  }
});

// Dosya silme isteği
ipcMain.handle("delete-file", async (event, filePath) => {
  try {
    await fs.promises.unlink(filePath);
    console.log("[main] File deleted:", filePath);
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
});

// Klasör oluşturma isteği
ipcMain.handle("create-directory", async (event, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    console.log("[main] Directory created:", dirPath);
    return { success: true, path: dirPath };
  } catch (error) {
    console.error("Error creating directory:", error);
    throw error;
  }
});

// Sistem komutu çalıştırma isteği
ipcMain.handle("execute-command", async (event, command) => {
  try {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          console.error("[main] Command error:", error);
          resolve({ 
            success: false, 
            error: error.message,
            stdout: stdout, 
            stderr: stderr 
          });
          return;
        }
        console.log("[main] Command executed:", command);
        resolve({ 
          success: true, 
          stdout: stdout, 
          stderr: stderr 
        });
      });
    });
  } catch (error) {
    console.error("Error executing command:", error);
    throw error;
  }
});
