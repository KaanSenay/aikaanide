export class ContextManager {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.cache = new Map();
    this.knownFiles = new Set();
    this.chatHistory = [];
    this.loadCache();
  }

  loadCache() {
    try {
      // Load file cache
      const cached = localStorage.getItem("ai_cache");
      if (cached) {
        const data = JSON.parse(cached);
        for (const [file, info] of Object.entries(data)) {
          this.cache.set(file, info);
          this.knownFiles.add(file);
        }
        console.log("🧠 File cache loaded:", this.cache.size, "files");
      }
      
      // Load chat history
      const chatCache = localStorage.getItem("chat_history");
      if (chatCache) {
        this.chatHistory = JSON.parse(chatCache);
        console.log("💬 Chat history loaded:", this.chatHistory.length, "messages");
      }
    } catch (err) {
      console.warn("⚠️ Failed to load cache:", err);
    }
  }

  saveCache() {
    try {
      // Save file cache
      const obj = Object.fromEntries(this.cache);
      localStorage.setItem("ai_cache", JSON.stringify(obj));
      
      // Save chat history
      localStorage.setItem("chat_history", JSON.stringify(this.chatHistory));
      console.log("💾 Cache saved");
    } catch (err) {
      console.warn("⚠️ Failed to save cache:", err);
    }
  }

  clearCache() {
    this.cache.clear();
    this.knownFiles.clear();
    this.chatHistory = [];
    localStorage.removeItem("ai_cache");
    localStorage.removeItem("chat_history");
    console.log("🗑️ Cache cleared!");
  }

  async getFileInfo(filePath) {
    try {
      const stats = await window.api.getFileStats(filePath);
      return { mtime: stats.mtime };
    } catch {
      return { mtime: 0 };
    }
  }

  async summarizeFile(filePath, content) {
    // Hızlı, statik özet (AI çağrısı yok)
    const firstLine = (content.split('\n')[0] || '').trim();
    const fnCount = (content.match(/\bfunction\b|=>/g) || []).length;
    const classCount = (content.match(/\bclass\s+[A-Za-z0-9_]+/g) || []).length;
    const exportCount = (content.match(/\bexport\b/g) || []).length;
    return `${filePath.split(/[\\/]/).pop()}: ${fnCount} func, ${classCount} class, ${exportCount} export | ${firstLine.slice(0, 80)}`;
  }

  async buildContext(currentFile) {
    const dir = currentFile.substring(0, currentFile.lastIndexOf("/"));
    const files = await window.api.listFiles(dir);

    let contextParts = [];
    for (let f of files) {
      if (f.isDir || f.path === currentFile) continue;

      const info = await this.getFileInfo(f.path);
      const cached = this.cache.get(f.path);

      // 🔹 Eğer dosya değişmemişse, cached özetini kullan
      if (cached && cached.mtime === info.mtime && cached.summary) {
        this.knownFiles.add(f.path);
        contextParts.push(`🧩 ${f.name}: ${cached.summary}`);
        continue;
      }

      // 🔹 Dosya değişmişse yeniden oku
      let content = "";
      try {
        content = await window.api.readFile(f.path);
      } catch {
        content = "";
      }

      // 🔹 Dosyanın yeni özetini oluştur
      const summary = await this.summarizeFile(f.path, content);
      this.cache.set(f.path, { content, mtime: info.mtime, summary });
      this.knownFiles.add(f.path);

      contextParts.push(`🧩 ${f.name}: ${summary}`);
    }

    // 🔹 Cache'i diske kaydet
    this.saveCache();

    // 🔹 En sonunda kısa bir özet bloğu oluştur
    const summaryBlock = contextParts.join("\n");
    return `Project summaries:\n${summaryBlock}`;
  }

  addMessageToContext(message) {
    this.chatHistory.push(message);
    this.saveCache();
  }

  getChatContext() {
    return this.chatHistory.slice(-10); // Return last 10 messages for context
  }

  clearChatContext() {
    this.chatHistory = [];
    this.saveCache();
  }
}
