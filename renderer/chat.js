import { ContextManager } from "./contextManager.js";

export class ChatPanel {
  constructor(contextManager) {
    this.contextManager = contextManager;
    this.messagesEl = document.getElementById("chat-messages");
    this.inputEl = document.getElementById("chat-input");
    this.sendBtn = document.getElementById("chat-send");
    this.clearCacheBtn = document.getElementById("chat-clear-cache");
    this.closeBtn = document.createElement("button");
    this.closeBtn.id = "chat-close";
    this.closeBtn.textContent = "❌ Close Chat";
    this.closeBtn.title = "Close conversation and clear context";
    const chatActions = document.querySelector('.chat-actions');
    if (chatActions) {
      chatActions.appendChild(this.closeBtn);
    } else {
      console.error('[ChatPanel] .chat-actions element not found');
    }
    this.currentFile = null;
    this.currentCode = "";

    // Send button
    this.sendBtn.addEventListener("click", () => this.handleSend());

    // Clear cache button
    document.getElementById("chat-clear-cache").addEventListener("click", () => this.clearCache());

    // Close chat button
    document.getElementById("chat-close").addEventListener("click", () => this.closeChat());

    // Enter to send
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
  }

  clearCache() {
    if (confirm("Clear AI memory cache? All previously analyzed files will be forgotten.")) {
      this.contextManager.clearCache();
      this.addMessage("ai", "🗑️ Cache cleared! AI will start with a fresh memory.");
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
      file: this.currentFile
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
        const related = await this.contextManager.buildContext(this.currentFile);
        context = `${currentCtx}\n\n📂 Context from related files:\n${related}`;
      }

      // Get chat history context
      const chatHistory = this.contextManager.getChatContext();
      const chatContext = chatHistory.map(m => 
        `${m.role}: ${m.content}${m.file ? `\n(File: ${m.file})` : ''}`
      ).join('\n\n');

      // Determine if this is a code-related question
      const isCodeQuestion = msg.toLowerCase().includes('code') ||
                           msg.toLowerCase().includes('file') ||
                           msg.toLowerCase().includes('implement') ||
                           msg.toLowerCase().includes('function') ||
                           msg.toLowerCase().includes('bug') ||
                           msg.toLowerCase().includes('error');

      let fileContext = '';
      if (isCodeQuestion) {
        fileContext = await this.contextManager.buildContext(this.currentFile || '');
      }

      const prompt = `You are an AI coding assistant working offline in an IDE.
${chatContext ? '\nPrevious conversation:\n' + chatContext + '\n' : ''}
${fileContext ? '\nProject context:\n' + fileContext + '\n' : ''}
${this.currentFile ? '\nCurrent file: ' + this.currentFile + '\n' + this.currentCode : ''}

User: ${msg}`;

      console.log("[Chat] Calling AI with prompt length:", prompt.length);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("AI request timeout")), 180000); // 3 minutes
      });
      
      const reply = await Promise.race([
        window.api.askAI(prompt),
        timeoutPromise
      ]);
      
      console.log("[Chat] AI response received, length:", reply.length);
      
      // Save AI response to context
      this.contextManager.addMessageToContext({
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
        file: this.currentFile
      });
      
      // Remove loading indicator
      loadingEl.remove();
      this.addMessage("ai", reply);
    } catch (error) {
      console.error("[Chat] Error:", error);
      loadingEl.remove();
      
      let errorMsg = error.message;
      
      // Better error messages
      if (errorMsg.includes("timed out")) {
        errorMsg = "⏱️ Request timed out. Try:\n" +
                   "1. Run: ollama serve\n" +
                   "2. Run: ollama pull deepseek-r1:latest\n" +
                   "3. Check if Ollama is running on port 11434";
      } else if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("fetch")) {
        errorMsg = "❌ Cannot connect to Ollama.\n\n" +
                   "Make sure Ollama is running:\n" +
                   "1. Open terminal\n" +
                   "2. Run: ollama serve\n" +
                   "3. If deepseek-r1 model is missing, run: ollama pull deepseek-r1:latest";
      } else if (errorMsg.includes("404")) {
        errorMsg = "❌ Model not found!\n\n" +
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
}
