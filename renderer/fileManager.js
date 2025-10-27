export class FileManager {
  constructor(baseDir, onFileOpen) {
    this.baseDir = baseDir;
    this.onFileOpen = onFileOpen;

    // DOM elementlerini bul
    const fileList = document.getElementById("file-list");
    const editorTabs = document.getElementById("editor-tabs");
    const openProjectBtn = document.getElementById('open-project');
    const toggleFilesBtn = document.getElementById('toggle-files');

    // Element kontrolü
    if (!fileList) throw new Error("File list container not found");
    if (!editorTabs) throw new Error("Editor tabs container not found");
    if (!openProjectBtn) throw new Error("Open project button not found");
    if (!toggleFilesBtn) throw new Error("Toggle files button not found");

    // Element referanslarını sakla
    this.container = fileList;
    this.tabsContainer = editorTabs;
    
    // State yönetimi
    this.expandedDirs = new Set();
    this.treeCache = new Map();
    this.openTabs = new Map(); // path -> {title, element}
    this.activeTab = null;

    // Event listener'ları bağla
    openProjectBtn.addEventListener('click', this.handleProjectOpen.bind(this));
    toggleFilesBtn.addEventListener('click', this.handlePanelToggle.bind(this));
    this.setupKeyboardShortcuts();
    
    console.log("[FileManager] Constructor completed, initializing...");
    // Initialize
    this.init();
  }

  showError(message) {
    console.error("[FileManager]", message);
    this.container.innerHTML = `<div style="padding: 10px; color: #f44;">${message}</div>`;
  }

  showLoading() {
    this.container.innerHTML = '<div style="padding: 10px;">Loading...</div>';
  }

  async handleProjectOpen() {
    try {
      const dir = await window.api.selectDirectory();
      if (dir) {
        console.log("[FileManager] New directory selected:", dir);
        this.baseDir = dir;
        this.treeCache.clear();
        this.expandedDirs.clear();
        await this.init();
      }
    } catch (error) {
      console.error("[FileManager] Error selecting directory:", error);
      this.showError(`Error selecting directory: ${error.message}`);
    }
  }

  handlePanelToggle() {
    const panel = document.getElementById('file-panel');
    if (!panel) {
      console.error('[FileManager] file-panel element not found');
      return;
    }
    panel.classList.toggle('hidden');
  }

  createTab(filePath) {
    const fileName = filePath.split(/[\\/]/).pop();
    const tab = document.createElement('div');
    tab.className = 'editor-tab';
    tab.innerHTML = `
      <span class="editor-tab-unsaved"></span>
      <span class="editor-tab-title">${fileName}</span>
      <span class="editor-tab-close">✕</span>
    `;

    // Handle tab click
    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('editor-tab-close')) {
        this.closeTab(filePath);
      } else {
        this.activateTab(filePath);
      }
    });

    return tab;
  }

  markTabAsModified(filePath, isModified) {
    const tab = this.openTabs.get(filePath);
    if (tab) {
      const indicator = tab.element.querySelector('.editor-tab-unsaved');
      if (indicator) {
        indicator.classList.toggle('visible', isModified);
      }
    }
  }

  openTab(filePath) {
    if (!this.openTabs.has(filePath)) {
      const tab = this.createTab(filePath);
      if (!this.tabsContainer) {
        console.error('[FileManager] editor-tabs container not found');
        return;
      }
      this.tabsContainer.appendChild(tab);
      this.openTabs.set(filePath, {
        title: filePath.split(/[\\/]/).pop(),
        element: tab,
        content: null,
        originalContent: null,
        isModified: false
      });
    }
    this.activateTab(filePath);
  }

  activateTab(filePath) {
    console.log("[FileManager] Activating tab:", filePath);
    
    try {
      // Deactivate current tab
      if (this.activeTab) {
        const currentTab = this.openTabs.get(this.activeTab);
        if (currentTab) {
          currentTab.element.classList.remove('active');
          // Store current content if editor exists
          if (window.monacoEditor) {
            currentTab.content = window.monacoEditor.getValue();
          }
        }
      }
      
      // Activate new tab
      const tab = this.openTabs.get(filePath);
      if (tab) {
        tab.element.classList.add('active');
        this.activeTab = filePath;
        
        // Ensure editor exists before setting content
        if (window.monacoEditor) {
          if (tab.content !== null) {
            window.monacoEditor.setValue(tab.content);
          } else {
            this.loadFileContent(filePath);
          }
        } else {
          console.error("[FileManager] Monaco editor not initialized");
        }
      }
    } catch (error) {
      console.error("[FileManager] Error activating tab:", error);
    }
  }

  async loadFileContent(filePath) {
    try {
      const content = await window.api.readFile(filePath);
      const tab = this.openTabs.get(filePath);
      if (tab) {
        tab.content = content;
        tab.originalContent = content;
        tab.isModified = false;
        this.markTabAsModified(filePath, false);
        if (this.activeTab === filePath && window.monacoEditor) {
          try {
            window.monacoEditor.setValue(content);
          } catch (editorError) {
            console.error("[FileManager] Error setting editor content:", editorError);
          }
        }
      }
    } catch (error) {
      console.error("[FileManager] Failed to load file content:", error);
      this.showError(`Error loading file: ${error.message}`);
    }
  }

  setupEditorChangeListener() {
    if (!window.monacoEditor) return;
    
    window.monacoEditor.onDidChangeModelContent(() => {
      if (this.activeTab) {
        const tab = this.openTabs.get(this.activeTab);
        if (tab && tab.originalContent !== null) {
          const currentContent = window.monacoEditor.getValue();
          const isModified = currentContent !== tab.originalContent;
          tab.isModified = isModified;
          this.markTabAsModified(this.activeTab, isModified);
        }
      }
    });
  }

  async saveCurrentFile() {
    if (!this.activeTab) {
      console.log("[FileManager] No active file to save");
      return;
    }

    const tab = this.openTabs.get(this.activeTab);
    if (!tab || !tab.isModified) {
      console.log("[FileManager] File not modified");
      return;
    }

    try {
      const content = window.monacoEditor.getValue();
      await window.api.saveFile(this.activeTab, content);
      tab.originalContent = content;
      tab.isModified = false;
      this.markTabAsModified(this.activeTab, false);
      console.log("[FileManager] File saved:", this.activeTab);
    } catch (error) {
      console.error("[FileManager] Failed to save file:", error);
      alert(`Error saving file: ${error.message}`);
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+S veya Cmd+S ile kaydet
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentFile();
      }
    });
  }

  closeTab(filePath) {
    console.log("[FileManager] Closing tab:", filePath);
    const tab = this.openTabs.get(filePath);
    if (tab) {
      tab.element.remove();
      this.openTabs.delete(filePath);
      
      // If closing active tab, activate the last remaining tab
      if (this.activeTab === filePath) {
        const tabs = Array.from(this.openTabs.keys());
        if (tabs.length > 0) {
          this.activateTab(tabs[tabs.length - 1]);
        } else {
          this.activeTab = null;
          window.monacoEditor.setValue('// Select a file to open');
        }
      }
    }
  }

  async init() {
    try {
      this.showLoading();
      
      // If no directory is set, try to use current working directory
      if (!this.baseDir || this.baseDir.trim() === "") {
        try {
          this.baseDir = await window.api.getCwd();
          console.log("[FileManager] Using current directory:", this.baseDir);
        } catch (err) {
          console.error("[FileManager] Failed to get current directory:", err);
          this.baseDir = process.platform === 'win32' ? 'C:\\' : '/';
          console.log("[FileManager] Falling back to root directory:", this.baseDir);
        }
      }

      // Clean up the path
      this.baseDir = this.baseDir.replace(/\\/g, '/');
      
      // Try to list files to validate directory access
      try {
        await window.api.listFiles(this.baseDir);
        this.expandedDirs.add(this.baseDir);
        console.log("[FileManager] Successfully validated directory:", this.baseDir);
      } catch (error) {
        console.error("[FileManager] Directory validation failed:", error);
        throw new Error(`Cannot access directory "${this.baseDir}": ${error.message}`);
      }
      
      await this.loadAllTree(this.baseDir);
      await this.render();
      
      console.log("[FileManager] Initialization complete");
    } catch (error) {
      console.error("[FileManager] Init failed:", error);
      this.showError(`Error: ${error.message}`);
    }
  }

  async loadAllTree(dirPath, prefix = "", depth = 0) {
    if (depth > 5) {
      console.log(`[FileManager] Max depth reached for: ${dirPath}`);
      return;
    }
    
    // Clean up and validate path
    try {
      dirPath = dirPath.replace(/\\/g, '/');
      if (!dirPath || typeof dirPath !== 'string' || dirPath.trim() === '') {
        console.error(`[FileManager] Invalid directory path: ${dirPath}`);
        return;
      }
    } catch (err) {
      console.error(`[FileManager] Path validation failed:`, err);
      return;
    }
    
    const key = prefix || dirPath;
    if (this.treeCache.has(key)) {
      console.log(`[FileManager] Using cached data for: ${dirPath}`);
      return;
    }
    
    try {
      console.log(`[FileManager] Loading directory (depth ${depth}):`, dirPath);
      let files = [];
      
      try {
        files = await window.api.listFiles(dirPath);
        console.log(`[FileManager] Successfully listed ${files.length} files in: ${dirPath}`);
      } catch (listError) {
        console.warn(`[FileManager] Failed to list files in ${dirPath}:`, listError);
        this.treeCache.set(key, { entries: [], depth });
        return;
      }
      
      // Filter and sort
      const entries = files
        .filter(f => f && f.name && !f.name.startsWith('.') && 
                     f.name !== 'node_modules' && f.name !== '.git')
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      
      console.log(`[FileManager] Filtered to ${entries.length} entries for: ${dirPath}`);
      this.treeCache.set(key, { entries, depth });
      
      // Recursively load subdirectories
      for (const entry of entries) {
        if (entry.isDir && !entry.name.startsWith('.')) {
          await this.loadAllTree(entry.path, entry.path, depth + 1);
        }
      }
    } catch (error) {
      console.error(`[FileManager] Failed to process directory ${dirPath}:`, error);
      this.treeCache.set(key, { entries: [], depth });
    }
  }
  
  async render() {
    this.container.innerHTML = "";
    await this.renderTree(this.baseDir, "", 0);
  }
  
  async renderTree(dirPath, cacheKey, depth) {
    const cached = this.treeCache.get(cacheKey || dirPath);
    if (!cached) return;
    
    const { entries } = cached;
    
    for (const entry of entries) {
      const el = document.createElement("div");
      el.className = "file-item" + (entry.isDir ? " folder-item" : " file-item-child");
      el.style.paddingLeft = `${depth * 12 + 20}px`;
      
      if (entry.isDir && this.expandedDirs.has(entry.path)) {
        el.classList.add('expanded');
      }
      
      const icon = document.createElement("span");
      icon.className = "file-icon";
      icon.textContent = entry.isDir ? (this.expandedDirs.has(entry.path) ? "📂" : "📁") : "📄";
      
      const name = document.createElement("span");
      name.className = "file-name";
      name.textContent = entry.name;
      
      el.appendChild(icon);
      el.appendChild(name);
      this.container.appendChild(el);
      
      if (entry.isDir) {
        el.addEventListener("click", async (e) => {
          e.stopPropagation();
          await this.toggleDir(entry.path, el);
        });
      } else {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openFile(entry.path);
        });
      }
      
      if (entry.isDir && this.expandedDirs.has(entry.path)) {
        await this.renderTree(entry.path, entry.path, depth + 1);
      }
    }
  }
  
  async toggleDir(dirPath) {
    if (this.expandedDirs.has(dirPath)) {
      this.expandedDirs.delete(dirPath);
    } else {
      this.expandedDirs.add(dirPath);
    }
    await this.render();
  }
  
  async openFile(filePath) {
    try {
      console.log("[FileManager] Opening file:", filePath);
      const content = await window.api.readFile(filePath);
      this.openTab(filePath);
      this.onFileOpen(filePath, content);
    } catch (error) {
      console.error("[FileManager] Failed to open file:", error);
      this.showError(`Error opening file: ${error.message}`);
    }
  }
}