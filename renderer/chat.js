import { CommentFormatter } from "./commentFormatter.js";

export class ChatPanel {
  constructor(contextManager) {
    console.log("[ChatPanel] Initializing...");
    this.contextManager = contextManager;
    this.diffViewer = null;

    // Get DOM elements
    this.messagesEl = document.getElementById("chat-messages");
    this.inputEl = document.getElementById("chat-input");
    this.sendBtn = document.getElementById("chat-send");
    this.clearCacheBtn = document.getElementById("chat-clear-cache");
    this.analyzeBtn = document.getElementById("chat-analyze-file");
    this.closeBtn = document.getElementById("chat-close");

    // Debug: Check if elements exist
    console.log("[ChatPanel] DOM Elements:", {
      messages: !!this.messagesEl,
      input: !!this.inputEl,
      send: !!this.sendBtn,
      clearCache: !!this.clearCacheBtn,
      analyze: !!this.analyzeBtn,
      close: !!this.closeBtn,
    });

    this.currentFile = null;
    this.currentCode = "";
    this.conversationId = Date.now();

    console.log(
      "[ChatPanel] Initialized successfully - Using global onclick handlers"
    );
  }

  clearCache() {
    if (
      confirm(
        "Clear AI memory cache? All previously analyzed files will be forgotten."
      )
    ) {
      this.contextManager.clearCache();
      this.addMessage(
        "ai",
        "🗑️ Cache cleared! AI will start with a fresh memory."
      );
    }
  }

  closeChat() {
    if (confirm("Close this conversation? The chat history will be cleared.")) {
      this.contextManager.clearChatContext();
      this.messagesEl.innerHTML = "";
      this.addMessage("ai", "👋 Chat closed. Starting a new conversation.");
    }
  }

  setActiveFile(filePath, code) {
    this.currentFile = filePath;
    this.currentCode = code;
  }

  setDiffViewer(diffViewer) {
    this.diffViewer = diffViewer;
    console.log("[ChatPanel] DiffViewer set");
  }

  async handleSend() {
    const msg = this.inputEl.value.trim();
    if (!msg) return;

    // Disable UI while processing
    this.inputEl.disabled = true;
    this.sendBtn.disabled = true;

    // Save chat message to context
    const messageContext = {
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
      file: this.currentFile,
    };
    this.contextManager.addMessageToContext(messageContext);

    this.addMessage("user", msg);
    this.inputEl.value = "";

    // Show loading indicator
    const loadingEl = document.createElement("div");
    loadingEl.className = "msg ai";
    loadingEl.innerText = "🤔 Thinking...";
    this.messagesEl.appendChild(loadingEl);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

    try {
      console.log("[Chat] Starting AI request...");

      let context = "";
      if (this.currentFile) {
        console.log("[Chat] Building context for:", this.currentFile);
        const currentCtx = `Active file: ${this.currentFile}\n\n${this.currentCode}`;
        const related = await this.contextManager.buildContext(
          this.currentFile
        );
        context = `${currentCtx}\n\n📂 Context from related files:\n${related}`;
      }

      // Get chat history context - SADECE SON 5 MESAJ
      const chatHistory = this.contextManager.getChatContext();
      const recentHistory = chatHistory.slice(-5); // Son 5 mesaj
      const chatContext = recentHistory
        .map(
          (m) =>
            `${m.role}: ${m.content.substring(0, 500)}${
              m.file ? `\n(File: ${m.file})` : ""
            }`
        )
        .join("\n\n");

      // Determine if this is a code-related question
      const isCodeQuestion =
        msg.toLowerCase().includes("code") ||
        msg.toLowerCase().includes("file") ||
        msg.toLowerCase().includes("implement") ||
        msg.toLowerCase().includes("function") ||
        msg.toLowerCase().includes("bug") ||
        msg.toLowerCase().includes("error");

      let fileContext = "";
      if (isCodeQuestion) {
        fileContext = await this.contextManager.buildContext(
          this.currentFile || ""
        );
      }

      // Akıllı prompt oluştur
      const isWriteRequest =
        /\b(yaz|write|create|oluştur|yap|make|ekle|add)\b/i.test(msg);
      const isModifyRequest =
        /\b(değiştir|düzenle|düzelt|modify|edit|fix|update|change)\b/i.test(
          msg
        );

      let prompt = "";

      if (isWriteRequest && this.currentFile) {
        // Dosyaya kod yazma isteği
        prompt = `You are a professional code writer. The user wants you to write code to their file.

CURRENT FILE: ${this.currentFile}
CURRENT CONTENT (${this.currentCode.split("\n").length} lines):
\`\`\`
${this.currentCode}
\`\`\`

USER REQUEST: ${msg}

INSTRUCTIONS:
1. Write COMPLETE, WORKING code
2. If file is empty, write the full program
3. If file has code, ADD to it or REPLACE it based on request
4. Use proper syntax and formatting
5. Add helpful comments
6. Return ONLY code in a code block, NO explanations

YOUR CODE:`;
      } else if (isModifyRequest && this.currentFile && this.currentCode) {
        // Mevcut kodu değiştirme isteği
        prompt = `You are a code modification expert. Modify the existing code based on user request.

CURRENT FILE: ${this.currentFile}
CURRENT CODE (${this.currentCode.split("\n").length} lines):
\`\`\`
${this.currentCode}
\`\`\`

USER REQUEST: ${msg}

INSTRUCTIONS:
1. Read the ENTIRE current code carefully
2. Make the requested changes
3. Return the COMPLETE modified code
4. Keep existing functionality unless asked to change
5. Maintain code style and formatting
6. Return ONLY code in a code block, NO explanations

MODIFIED CODE:`;
      } else {
        // Genel soru veya yeni kod yazma
        prompt = `You are a helpful coding assistant.

${
  this.currentFile
    ? `Current file: ${
        this.currentFile
      }\n\nCurrent code:\n\`\`\`\n${this.currentCode.substring(
        0,
        2000
      )}\n\`\`\`\n`
    : ""
}

User: ${msg}

${
  isWriteRequest
    ? "Write ONLY code in a code block. NO explanations."
    : "Provide a helpful response."
}`;
      }

      console.log(
        "[Chat] Prompt type:",
        isWriteRequest ? "WRITE" : isModifyRequest ? "MODIFY" : "GENERAL"
      );

      console.log("[Chat] Calling AI with prompt length:", prompt.length);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("AI request timeout")), 180000); // 3 minutes
      });

      const reply = await Promise.race([
        window.api.askAI(prompt),
        timeoutPromise,
      ]);

      console.log("[Chat] AI response received, length:", reply.length);

      // Save AI response to context
      this.contextManager.addMessageToContext({
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
        file: this.currentFile,
      });

      // Remove loading indicator
      loadingEl.remove();

      // AI cevabındaki kod bloklarını formatla
      const formattedReply = this.formatAIResponse(reply);

      // Akıllı yanıt işleme
      const hasCodeBlock = /```[\w]*\n([\s\S]*?)```/.test(formattedReply);

      if (
        hasCodeBlock &&
        (isWriteRequest || isModifyRequest) &&
        this.currentFile
      ) {
        // Kod bloğu var ve dosya açık - direkt dosyaya yaz
        console.log("[ChatPanel] Writing code to file:", this.currentFile);
        await this.writeCodeToFile(formattedReply);
      } else if (hasCodeBlock && isWriteRequest && !this.currentFile) {
        // Kod bloğu var ama dosya açık değil - dosya oluştur
        console.log("[ChatPanel] Creating new file");
        await this.handleFileCreation(formattedReply);
      } else {
        // Normal mesaj
        this.addMessage("ai", formattedReply);
      }
    } catch (error) {
      console.error("[Chat] Error:", error);
      loadingEl.remove();

      let errorMsg = error.message;

      // Better error messages
      if (errorMsg.includes("timed out")) {
        errorMsg =
          "⏱️ Request timed out. Try:\n" +
          "1. Run: ollama serve\n" +
          "2. Run: ollama pull deepseek-r1:latest\n" +
          "3. Check if Ollama is running on port 11434";
      } else if (
        errorMsg.includes("ECONNREFUSED") ||
        errorMsg.includes("fetch")
      ) {
        errorMsg =
          "❌ Cannot connect to Ollama.\n\n" +
          "Make sure Ollama is running:\n" +
          "1. Open terminal\n" +
          "2. Run: ollama serve\n" +
          "3. If deepseek-r1 model is missing, run: ollama pull deepseek-r1:latest";
      } else if (errorMsg.includes("404")) {
        errorMsg =
          "❌ Model not found!\n\n" +
          "Available models:\n" +
          "Run: ollama list\n\n" +
          "To install deepseek-r1:\n" +
          "Run: ollama pull deepseek-r1:latest\n\n" +
          "Or use a different model by updating main.js";
      }

      this.addMessage("ai", errorMsg);
    } finally {
      // Re-enable UI
      this.inputEl.disabled = false;
      this.sendBtn.disabled = false;
      this.inputEl.focus();
    }
  }

  addMessage(role, content) {
    const el = document.createElement("div");
    el.className = `msg ${role}`;
    el.innerText = content;
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  async analyzeCurrentFile() {
    if (!this.currentFile || !this.currentCode) {
      this.addMessage(
        "ai",
        "⚠️ No file is currently open. Please open a file first."
      );
      return;
    }

    this.inputEl.disabled = true;
    this.sendBtn.disabled = true;
    this.analyzeBtn.disabled = true;

    const loadingEl = document.createElement("div");
    loadingEl.className = "msg ai";
    loadingEl.innerText = "🔍 Analyzing file...";
    this.messagesEl.appendChild(loadingEl);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

    try {
      const prompt = `You are a code analysis assistant. Analyze this file and provide:
1. A brief summary of what the code does
2. Key functions/classes and their purposes
3. Potential improvements or issues
4. Suggestions for better code quality

File: ${this.currentFile}

Code:
${this.currentCode}`;

      const reply = await window.api.askAI(prompt);
      loadingEl.remove();
      this.addMessage(
        "ai",
        `📊 Analysis of ${this.currentFile.split(/[\\/]/).pop()}:\n\n${reply}`
      );
    } catch (error) {
      console.error("[Chat] Analysis error:", error);
      loadingEl.remove();
      this.addMessage("ai", `❌ Analysis failed: ${error.message}`);
    } finally {
      this.inputEl.disabled = false;
      this.sendBtn.disabled = false;
      this.analyzeBtn.disabled = false;
    }
  }

  isCodeChangeRequest(message) {
    const keywords = [
      "değiştir",
      "düzenle",
      "düzelt",
      "ekle",
      "sil",
      "güncelle",
      "change",
      "modify",
      "edit",
      "fix",
      "add",
      "remove",
      "update",
      "refactor",
      "optimize",
      "improve",
      "rewrite",
    ];

    const lowerMsg = message.toLowerCase();
    return keywords.some((keyword) => lowerMsg.includes(keyword));
  }

  handleCodeChange(aiResponse) {
    console.log("[ChatPanel] Handling code change");

    // AI'ın cevabını parse et
    const parsed = this.diffViewer.parseAIResponse(
      aiResponse,
      this.currentCode
    );

    if (parsed.changes.length === 0) {
      console.log("[ChatPanel] No changes detected, showing as normal message");
      this.addMessage("ai", aiResponse);
      return;
    }

    // Diff viewer'ı göster
    this.diffViewer.showDiff(
      this.currentCode,
      parsed.newCode,
      this.currentFile,
      parsed.changes
    );

    // Chat'e bilgi mesajı ekle
    this.addMessage(
      "ai",
      `📝 ${parsed.changes.length} değişiklik önerisi hazır. Sağdaki panelden kabul veya reddedebilirsiniz.`
    );
  }

  async executeSystemCommand(command) {
    console.log("[ChatPanel] Executing system command:", command);

    try {
      const result = await window.api.executeCommand(command);

      if (result.success) {
        return `✅ Komut başarıyla çalıştırıldı:\n\n${
          result.stdout || "Çıktı yok"
        }${result.stderr ? "\n\nHatalar:\n" + result.stderr : ""}`;
      } else {
        return `❌ Komut hatası:\n\n${result.error}\n\n${result.stderr || ""}`;
      }
    } catch (error) {
      return `❌ Komut çalıştırılamadı: ${error.message}`;
    }
  }

  async createNewFile(filePath, content = "") {
    console.log("[ChatPanel] Creating file:", filePath);

    try {
      await window.api.createFile(filePath, content);
      return `✅ Dosya oluşturuldu: ${filePath}`;
    } catch (error) {
      return `❌ Dosya oluşturulamadı: ${error.message}`;
    }
  }

  async deleteExistingFile(filePath) {
    console.log("[ChatPanel] Deleting file:", filePath);

    try {
      await window.api.deleteFile(filePath);
      return `✅ Dosya silindi: ${filePath}`;
    } catch (error) {
      return `❌ Dosya silinemedi: ${error.message}`;
    }
  }

  async createNewDirectory(dirPath) {
    console.log("[ChatPanel] Creating directory:", dirPath);

    try {
      await window.api.createDirectory(dirPath);
      return `✅ Klasör oluşturuldu: ${dirPath}`;
    } catch (error) {
      return `❌ Klasör oluşturulamadı: ${error.message}`;
    }
  }

  formatAIResponse(response) {
    console.log("[ChatPanel] Formatting AI response");

    // Kod bloklarını bul ve formatla
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    let formatted = response;

    const matches = [...response.matchAll(codeBlockRegex)];
    matches.forEach((match) => {
      const originalCode = match[1];
      const formattedCode = CommentFormatter.formatComments(originalCode);
      formatted = formatted.replace(match[0], "```\n" + formattedCode + "```");
    });

    return formatted;
  }

  isFileCreationRequest(message) {
    const keywords = [
      "oluştur",
      "yap",
      "yaz",
      "ekle",
      "kur",
      "create",
      "make",
      "write",
      "build",
      "generate",
    ];

    const fileKeywords = [
      "dosya",
      "file",
      "program",
      "uygulama",
      "app",
      "proje",
      "project",
      ".js",
      ".html",
      ".css",
      ".py",
    ];

    const lowerMsg = message.toLowerCase();
    const hasAction = keywords.some((k) => lowerMsg.includes(k));
    const hasTarget = fileKeywords.some((k) => lowerMsg.includes(k));

    return hasAction && hasTarget;
  }

  async writeCodeToFile(aiResponse) {
    console.log("[ChatPanel] Writing code to current file");

    // Kod bloğunu çıkar
    const codeBlockMatch = aiResponse.match(/```[\w]*\n([\s\S]*?)```/);

    if (!codeBlockMatch) {
      this.addMessage("ai", "❌ Kod bloğu bulunamadı.\n\n" + aiResponse);
      return;
    }

    const fileContent = codeBlockMatch[1].trim();

    try {
      // Dosyayı kaydet
      await window.api.saveFile(this.currentFile, fileContent);

      // Editor'ı güncelle
      this.currentCode = fileContent;
      if (window.editor) {
        const model = window.editor.getModel();
        if (model) {
          model.setValue(fileContent);
        }
      }

      // Başarı mesajı
      const fileName = this.currentFile.split(/[\\/]/).pop();
      const lineCount = fileContent.split("\n").length;
      this.addMessage(
        "ai",
        `✅ **${fileName}** dosyasına ${lineCount} satır kod yazıldı!\n\n\`\`\`\n${fileContent.substring(
          0,
          200
        )}${fileContent.length > 200 ? "..." : ""}\n\`\`\``
      );
    } catch (error) {
      this.addMessage(
        "ai",
        `❌ Dosyaya yazılamadı: ${error.message}\n\n${aiResponse}`
      );
    }
  }

  async handleFileCreation(aiResponse) {
    console.log("[ChatPanel] Processing file creation");

    // Kod bloğunu çıkar
    const codeBlockMatch = aiResponse.match(/```[\w]*\n([\s\S]*?)```/);

    if (!codeBlockMatch) {
      this.addMessage("ai", aiResponse);
      return;
    }

    const fileContent = codeBlockMatch[1].trim();

    // Dosya adı sor
    const fileName = prompt("Dosya adı girin (örn: program.js):");

    if (fileName) {
      try {
        await window.api.createFile(fileName, fileContent);

        const lineCount = fileContent.split("\n").length;
        this.addMessage(
          "ai",
          `✅ **${fileName}** dosyası oluşturuldu! (${lineCount} satır)\n\n\`\`\`\n${fileContent.substring(
            0,
            200
          )}${fileContent.length > 200 ? "..." : ""}\n\`\`\``
        );
      } catch (error) {
        this.addMessage(
          "ai",
          `❌ Dosya oluşturulamadı: ${error.message}\n\n${aiResponse}`
        );
      }
    } else {
      this.addMessage(
        "ai",
        "❌ Dosya oluşturma iptal edildi.\n\n" + aiResponse
      );
    }
  }
}
