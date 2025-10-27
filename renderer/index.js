import { ChatPanel } from "./chat.js";
import { FileManager } from "./fileManager.js";
import { ContextManager } from "./contextManager.js";
import { AIAutocomplete } from "./aiAutocomplete.js";
import { DiffViewer } from "./diffViewer.js";

require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs" } });

let editor = null;
let contextManager = null;
let chat = null;
let fileManager = null;
let aiAutocomplete = null;
let diffViewer = null;

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
    window.chat = chat; // Global erişim için

    console.log("[index.js] Creating DiffViewer...");
    if (editor) {
      diffViewer = new DiffViewer(editor);
      chat.setDiffViewer(diffViewer);
      console.log("[index.js] DiffViewer initialized and connected to chat");
    } else {
      console.warn("[index.js] Editor not ready, DiffViewer will be initialized later");
    }

    // UI event listeners are now handled via onclick in HTML

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
        
        // AI Autocomplete'e dosya yolunu bildir
        if (window.aiAutocomplete) {
          window.aiAutocomplete.setCurrentFile(filePath);
        }
      } catch (error) {
        console.error("[index.js] Error updating editor:", error);
      }
    });

    // Setup editor change listener
    fileManager.setupEditorChangeListener();
    
    // Global erişim için
    window.fileManager = fileManager;
    window.contextManager = contextManager;
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
          value: "// Select a file to open\n// Press Ctrl+K for AI autocomplete",
          language: "javascript",
          theme: "vs-dark",
          automaticLayout: true,
        });
        window.monacoEditor = editor;
        window.editor = editor; // Global erişim için
        
        // Initialize DiffViewer
        console.log("[index.js] Initializing DiffViewer with editor...");
        import('./diffViewer.js').then(module => {
          const DiffViewer = module.DiffViewer;
          diffViewer = new DiffViewer(editor);
          window.diffViewer = diffViewer;
          
          // Chat'e DiffViewer'ı bağla
          if (chat) {
            chat.setDiffViewer(diffViewer);
            console.log("[index.js] DiffViewer connected to chat");
          }
        });
        
        // Initialize AI Autocomplete after a short delay to ensure everything is ready
        setTimeout(() => {
          import('./aiAutocomplete.js').then(module => {
            const AIAutocomplete = module.AIAutocomplete;
            aiAutocomplete = new AIAutocomplete(editor, null);
            window.aiAutocomplete = aiAutocomplete; // Global erişim için
            console.log("[index.js] AI Autocomplete initialized");
          });
        }, 100);
        
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

// Global fonksiyonlar - Butonlar için (HTML onclick'lerden çağrılıyor)
window.handleChatSend = function() {
  console.log("[Global] handleChatSend called");
  if (chat) {
    chat.handleSend();
  } else {
    console.error("[Global] Chat not initialized");
  }
};

window.handleClearCache = function() {
  console.log("[Global] handleClearCache called");
  if (chat) {
    chat.clearCache();
  } else {
    console.error("[Global] Chat not initialized");
  }
};

window.handleAnalyzeFile = function() {
  console.log("[Global] handleAnalyzeFile called");
  if (chat) {
    chat.analyzeCurrentFile();
  } else {
    console.error("[Global] Chat not initialized");
  }
};

window.handleCloseChat = function() {
  console.log("[Global] handleCloseChat called");
  if (chat) {
    chat.closeChat();
  } else {
    console.error("[Global] Chat not initialized");
  }
};

window.handleToggleFiles = function() {
  console.log("[Global] handleToggleFiles called");
  const filePanel = document.getElementById("file-panel");
  if (filePanel) {
    filePanel.classList.toggle("hidden");
  }
};

window.handleOpenProject = async function() {
  console.log("[Global] handleOpenProject called");
  try {
    const result = await window.api.openFolder();
    if (result && result.filePaths && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      console.log("[Global] Folder selected:", folderPath);
      if (fileManager) {
        fileManager.baseDir = folderPath;
        await fileManager.loadFiles();
      }
    }
  } catch (error) {
    console.error("[Global] Error opening folder:", error);
  }
};

// Sayfa yüklendiğinde başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
