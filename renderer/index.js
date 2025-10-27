import { ChatPanel } from "./chat.js";
import { FileManager } from "./fileManager.js";
import { ContextManager } from "./contextManager.js";

require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs" } });

let editor = null;
let contextManager = null;
let chat = null;
let fileManager = null;

async function initializeApp() {
  try {
    console.log("[index.js] Getting working directory...");
    const baseDir = await window.api.getCwd();
    console.log("[index.js] Working directory received:", baseDir);

    if (!baseDir || baseDir.trim() === "") {
      console.error("[index.js] baseDir is empty or invalid!");
      document.getElementById("file-list").innerHTML = '<div style="padding: 10px; color: #f44;">Error: Could not determine working directory. Please restart the app.</div>';
      return;
    }

    // Check DOM elements
    const fileList = document.getElementById("file-list");
    const editorTabs = document.getElementById("editor-tabs");
    const container = document.getElementById("container");

    if (!fileList || !editorTabs || !container) {
      throw new Error("Critical DOM elements are missing. Ensure the HTML structure is correct.");
    }

    console.log("[index.js] Creating ContextManager...");
    contextManager = new ContextManager(baseDir);

    console.log("[index.js] Creating ChatPanel...");
    chat = new ChatPanel(contextManager);

    console.log("[index.js] Creating FileManager with baseDir:", baseDir);
    fileManager = new FileManager(baseDir, (filePath, content) => {
      console.log("[index.js] File opened:", filePath);
      if (!editor) {
        console.error("[index.js] Editor not initialized!");
        return;
      }
      const lang = filePath.endsWith(".py") ? "python" :
                  filePath.endsWith(".js") ? "javascript" :
                  filePath.endsWith(".html") ? "html" : "plaintext";
      try {
        editor.setValue(content);
        monaco.editor.setModelLanguage(editor.getModel(), lang);
        chat.setActiveFile(filePath, content);
      } catch (error) {
        console.error("[index.js] Error updating editor:", error);
      }
    });
  } catch (error) {
    console.error("[index.js] Initialization error:", error);
    const container = document.getElementById("container");
    if (container) {
      container.innerHTML = '<div style="padding: 10px; color: #f44;">Error initializing app: ' + error.message + '</div>';
    }
  }
}

// Monaco editor yükleme işlemi
function initMonaco() {
  return new Promise((resolve, reject) => {
    try {
      require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs" } });
      require(["vs/editor/editor.main"], () => {
        const container = document.getElementById("container");
        if (!container) {
          reject(new Error("Editor container not found"));
          return;
        }

        console.log("[index.js] Creating Monaco editor...");
        editor = monaco.editor.create(container, {
          value: "// Select a file to open",
          language: "javascript",
          theme: "vs-dark",
          automaticLayout: true,
        });
        window.monacoEditor = editor;
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Ana başlatma fonksiyonu
async function init() {
  try {
    // Monaco editor'ü yükle
    await initMonaco();
    // Diğer bileşenleri başlat
    await initializeApp();
    console.log("[index.js] Initialization complete!");
  } catch (error) {
    console.error("[index.js] Critical initialization error:", error);
    const container = document.getElementById("container");
    if (container) {
      container.innerHTML = '<div style="padding: 10px; color: #f44;">Critical Error: ' + error.message + '</div>';
    }
  }
}

// Sayfa yüklendiğinde başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
};
