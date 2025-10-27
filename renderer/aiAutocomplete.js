import { ProjectAnalyzer } from './projectAnalyzer.js';

export class AIAutocomplete {
  constructor(editor, currentFilePath = null) {
    this.editor = editor;
    this.isProcessing = false;
    this.currentSuggestion = null;
    this.debounceTimer = null;
    this.lastPosition = null;
    this.currentFilePath = currentFilePath;
    this.projectAnalyzer = new ProjectAnalyzer();
    this.justAccepted = false; // Tab'a basıldığında tekrar öneri gelmemesi için
    this.setupListeners();
  }

  setCurrentFile(filePath) {
    this.currentFilePath = filePath;
    console.log("[AIAutocomplete] Current file set to:", filePath);
  }

  setupListeners() {
    // Tab tuşu ile öneriyi kabul et
    this.editor.addCommand(
      monaco.KeyCode.Tab,
      () => {
        if (this.currentSuggestion) {
          this.acceptSuggestion();
          return true; // Prevent default tab behavior
        }
        return false; // Allow default tab
      },
      "!suggestWidgetVisible && !inSnippetMode"
    );

    // Escape ile öneriyi reddet
    this.editor.addCommand(monaco.KeyCode.Escape, () => {
      if (this.currentSuggestion) {
        this.clearSuggestion();
        return true;
      }
      return false;
    });

    // Ctrl+K ile manuel tetikleme
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      this.triggerAutocomplete(true);
    });

    // Kod değişikliklerini dinle
    this.editor.onDidChangeModelContent(() => {
      this.onContentChange();
    });

    // Cursor pozisyonu değişince
    this.editor.onDidChangeCursorPosition(() => {
      const position = this.editor.getPosition();
      if (
        this.lastPosition &&
        (position.lineNumber !== this.lastPosition.lineNumber ||
          position.column !== this.lastPosition.column)
      ) {
        this.clearSuggestion();
      }
      this.lastPosition = position;
    });
  }

  onContentChange() {
    // Debounce: Kullanıcı yazmayı bıraktıktan 1 saniye sonra öneri getir
    clearTimeout(this.debounceTimer);
    this.clearSuggestion();

    // Eğer suggestion kabul edildiyse, hemen yeni öneri getirme
    if (this.justAccepted) {
      this.justAccepted = false;
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.triggerAutocomplete(false);
    }, 1000);
  }

  analyzeContext(textBeforeCursor, contextBefore, contextAfter, language) {
    const analysis = [];
    let task = "Complete the code logically";

    // Fonksiyon tanımı mı?
    if (/function\s+\w*$/.test(textBeforeCursor)) {
      analysis.push("- User is defining a function");
      task = "Complete the function name and parameters";
    }
    // Arrow function mu?
    else if (/const\s+\w+\s*=\s*\(?\w*$/.test(textBeforeCursor)) {
      analysis.push("- User is creating a variable or arrow function");
      task = "Complete the variable assignment or function parameters";
    }
    // If statement mı?
    else if (/if\s*\(\s*\w*\.?\w*\s*[><=!]*\s*$/.test(textBeforeCursor)) {
      analysis.push("- User is writing a conditional statement");
      task = "Complete the condition logically";
    }
    // Return statement mı?
    else if (/return\s+$/.test(textBeforeCursor)) {
      analysis.push("- User is returning a value");
      task = "Suggest an appropriate return value based on function context";
    }
    // Object property mı?
    else if (/\{\s*\w+\s*:\s*$/.test(textBeforeCursor)) {
      analysis.push("- User is defining an object property");
      task = "Suggest an appropriate value for the property";
    }
    // Array element mı?
    else if (/\[\s*$/.test(textBeforeCursor)) {
      analysis.push("- User is creating an array");
      task = "Suggest array elements based on context";
    }
    // Method call mı?
    else if (/\.\w*$/.test(textBeforeCursor)) {
      analysis.push("- User is calling a method or accessing a property");
      task = "Suggest appropriate method or property name";
    }
    // Variable assignment mı?
    else if (/=\s*$/.test(textBeforeCursor)) {
      analysis.push("- User is assigning a value");
      task = "Suggest an appropriate value based on variable name and context";
    }
    // Import statement mı?
    else if (/import\s+.*from\s+['"]$/.test(textBeforeCursor)) {
      analysis.push("- User is importing a module");
      task = "Suggest the module path";
    }
    // Console.log mı?
    else if (/console\.(log|error|warn)\($/.test(textBeforeCursor)) {
      analysis.push("- User is logging to console");
      task = "Suggest what to log based on context";
    }

    // Bağlamdan değişken isimlerini çıkar
    const variables = contextBefore.match(/(?:const|let|var)\s+(\w+)/g);
    if (variables && variables.length > 0) {
      const varNames = variables.map((v) => v.split(/\s+/)[1]).slice(-5);
      analysis.push(`- Available variables: ${varNames.join(", ")}`);
    }

    // Fonksiyon isimlerini çıkar
    const functions = contextBefore.match(/function\s+(\w+)/g);
    if (functions && functions.length > 0) {
      const funcNames = functions.map((f) => f.split(/\s+/)[1]).slice(-3);
      analysis.push(`- Available functions: ${funcNames.join(", ")}`);
    }

    // Class/Object pattern kontrolü
    if (contextBefore.includes("class ")) {
      analysis.push("- Inside a class definition");
    }

    // Async/await pattern
    if (contextBefore.includes("async ") || contextBefore.includes("await ")) {
      analysis.push("- Async context detected");
      if (textBeforeCursor.includes("await ")) {
        task = "Complete with a Promise-returning expression";
      }
    }

    // Loop içinde mi?
    if (/for\s*\(/.test(contextBefore) || /while\s*\(/.test(contextBefore)) {
      analysis.push("- Inside a loop");
    }

    return {
      analysis:
        analysis.length > 0 ? analysis.join("\n") : "- General code completion",
      task: task,
    };
  }

  async triggerAutocomplete(isManual = false) {
    if (this.isProcessing) {
      console.log("[AIAutocomplete] Already processing...");
      return;
    }

    const model = this.editor.getModel();
    const position = this.editor.getPosition();

    if (!model || !position) {
      console.log("[AIAutocomplete] No model or position");
      return;
    }

    // Mevcut satırı kontrol et - boşsa veya çok kısa ise öneri getirme (manuel değilse)
    const currentLine = model.getLineContent(position.lineNumber);
    const textBeforeCursor = currentLine
      .substring(0, position.column - 1)
      .trim();

    if (!isManual) {
      // Otomatik modda daha seçici ol
      if (textBeforeCursor.length < 5) {
        return; // En az 5 karakter olmalı
      }

      // Sadece boşluk veya noktalama varsa öneri getirme
      if (/^[\s\.\,\;\:\(\)\[\]\{\}]*$/.test(textBeforeCursor)) {
        return;
      }
    }

    this.isProcessing = true;

    try {
      const linesBefore = [];
      const linesAfter = [];

      // Get 15 lines before for better context
      for (
        let i = Math.max(1, position.lineNumber - 15);
        i < position.lineNumber;
        i++
      ) {
        linesBefore.push(model.getLineContent(i));
      }

      // Get 5 lines after
      for (
        let i = position.lineNumber + 1;
        i <= Math.min(model.getLineCount(), position.lineNumber + 5);
        i++
      ) {
        linesAfter.push(model.getLineContent(i));
      }

      const contextBefore = linesBefore.join("\n");
      const contextAfter = linesAfter.join("\n");
      const language = model.getLanguageId();

      // Show subtle loading indicator only for manual trigger
      let decorations = [];
      if (isManual) {
        decorations = this.editor.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
              ),
              options: {
                after: {
                  content: " ⏳",
                  inlineClassName: "ai-autocomplete-loading-inline",
                },
              },
            },
          ]
        );
      }

      // Cursor'dan önceki ve sonraki metni ayır
      const textBeforeCursor = currentLine.substring(0, position.column - 1);
      const textAfterCursor = currentLine.substring(position.column - 1);

      // Akıllı bağlam analizi
      const context = this.analyzeContext(
        textBeforeCursor,
        contextBefore,
        contextAfter,
        language
      );

      // Proje analizi - diğer dosyalardan bilgi al
      let projectContext = "";
      if (this.currentFilePath) {
        try {
          projectContext = await this.projectAnalyzer.analyzeProject(this.currentFilePath);
        } catch (err) {
          console.warn("[AIAutocomplete] Project analysis failed:", err);
        }
      }

      const prompt = `You are an expert ${language} programmer. Complete the code intelligently based on the entire project context.

CODE CONTEXT:
${contextBefore}

CURRENT LINE: ${textBeforeCursor}█${textAfterCursor}
(Complete from █ cursor position)

${contextAfter ? `NEXT LINES:\n${contextAfter}\n` : ""}

ANALYSIS:
${context.analysis}

PROJECT CONTEXT (from other files):
${projectContext || 'No project context available'}

TASK: ${context.task}

RULES:
1. Return ONLY the completion code (no quotes, markdown, or explanations)
2. Be contextually aware - understand what the code is trying to do
3. Match the coding style (indentation, naming conventions)
4. Keep it SHORT (1-2 lines max)
5. Be smart about variable names, function names, and logic
6. COMMENT FORMATTING: Use proper spacing (// Comment with space after //)

EXAMPLES:
Context: "function calculateTotal(items) {"
Input: "  let sum = "
Output: 0;

Context: "const users = ["
Input: "  { name: 'John', age: "
Output: 25 },

Context: "if (user.isAdmin) {"
Input: "  return "
Output: true;

Context: "app.get('/api/users', async (req, res) => {"
Input: "  const users = await "
Output: User.find();

YOUR COMPLETION:`;

      console.log("[AIAutocomplete] Requesting completion...");
      console.log("[AIAutocomplete] Prompt:", prompt.substring(0, 200) + "...");

      const completion = await window.api.askAI(prompt);

      // Remove loading decoration
      if (decorations.length > 0) {
        this.editor.deltaDecorations(decorations, []);
      }

      console.log("[AIAutocomplete] Raw completion received:", completion);

      if (!completion || completion.trim() === "") {
        console.log("[AIAutocomplete] Empty completion received");
        return;
      }

      // Clean up the completion aggressively
      let cleanedCompletion = this.cleanCompletion(
        completion,
        textBeforeCursor
      );

      console.log("[AIAutocomplete] Cleaned completion:", cleanedCompletion);

      if (!cleanedCompletion || cleanedCompletion.length === 0) {
        console.log("[AIAutocomplete] Completion is empty after cleaning");
        return;
      }

      // Validate completion
      if (!this.isValidCompletion(cleanedCompletion, textBeforeCursor)) {
        console.log("[AIAutocomplete] Completion failed validation");
        return;
      }

      // Eğer manuel tetikleme ise direkt ekle
      if (isManual) {
        console.log("[AIAutocomplete] Manual mode - inserting directly");
        this.insertCompletion(cleanedCompletion, position);
      } else {
        // Otomatik ise ghost text olarak göster
        console.log("[AIAutocomplete] Auto mode - showing ghost text");
        this.showGhostText(cleanedCompletion, position);
      }

      console.log("[AIAutocomplete] Completion ready");
    } catch (error) {
      console.error("[AIAutocomplete] Error:", error);

      if (isManual) {
        // Show error only for manual trigger
        const errorDecorations = this.editor.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
              ),
              options: {
                after: {
                  content: " ❌",
                  inlineClassName: "ai-autocomplete-error",
                },
              },
            },
          ]
        );

        setTimeout(() => {
          this.editor.deltaDecorations(errorDecorations, []);
        }, 2000);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  showGhostText(text, position) {
    this.clearSuggestion();

    if (!text || text.trim() === "") {
      console.log("[AIAutocomplete] Empty text, skipping ghost text");
      return;
    }

    const lines = text.split("\n");
    const firstLine = lines[0];

    console.log("[AIAutocomplete] Showing ghost text:", firstLine);
    console.log("[AIAutocomplete] Position:", position);

    // Monaco Editor için decoration oluştur
    const decorationOptions = {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      options: {
        description: "ai-suggestion",
        after: {
          content: firstLine,
          inlineClassName: "ai-ghost-text",
          inlineClassNameAffectsLetterSpacing: true,
        },
        showIfCollapsed: true,
        stickiness:
          monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    };

    console.log(
      "[AIAutocomplete] Creating decoration with options:",
      decorationOptions
    );

    // Decoration'ı uygula
    const decorationIds = this.editor.deltaDecorations([], [decorationOptions]);

    console.log("[AIAutocomplete] Decoration IDs:", decorationIds);

    this.currentSuggestion = {
      text: text,
      position: position,
      decorations: decorationIds,
    };

    console.log("[AIAutocomplete] Ghost text shown (press Tab to accept)");
    console.log(
      "[AIAutocomplete] Current suggestion stored:",
      this.currentSuggestion
    );
  }

  acceptSuggestion() {
    if (!this.currentSuggestion) return;

    console.log("[AIAutocomplete] Accepting suggestion");
    const { text, position } = this.currentSuggestion;
    
    // Önce suggestion'ı temizle (tekrar tetiklenmemesi için)
    this.clearSuggestion();
    
    // Sonra metni ekle
    this.insertCompletion(text, position);
    
    // Debounce timer'ı iptal et (yeni öneri gelmesin)
    clearTimeout(this.debounceTimer);
    
    console.log("[AIAutocomplete] Suggestion accepted and inserted");
  }

  insertCompletion(text, position) {
    const range = new monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );

    // Flag'i set et (yeni öneri gelmesin)
    this.justAccepted = true;

    this.editor.executeEdits("ai-autocomplete", [
      {
        range: range,
        text: text,
        forceMoveMarkers: true,
      },
    ]);

    // Move cursor to end of inserted text
    const lines = text.split("\n");
    const lastLine = lines[lines.length - 1];
    const newPosition = {
      lineNumber: position.lineNumber + lines.length - 1,
      column:
        lines.length === 1
          ? position.column + lastLine.length
          : lastLine.length + 1,
    };
    this.editor.setPosition(newPosition);

    // 500ms sonra flag'i kaldır
    setTimeout(() => {
      this.justAccepted = false;
    }, 500);
  }

  clearSuggestion() {
    if (this.currentSuggestion) {
      this.editor.deltaDecorations(this.currentSuggestion.decorations, []);
      this.currentSuggestion = null;
    }
  }

  cleanCompletion(completion, textBeforeCursor) {
    let cleaned = completion.trim();

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\w]*\n?/g, "");
    cleaned = cleaned.replace(/```/g, "");

    // Remove common AI response patterns
    cleaned = cleaned.replace(
      /^(Here's|Here is|The completion is|Completion:|Your completion:|Output:|Result:)/i,
      ""
    );

    // Remove ALL types of quotes (başta ve sonda)
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, "");

    // Remove quotes from entire response if wrapped
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
      cleaned = cleaned.slice(1, -1);
    }
    if (cleaned.startsWith("`") && cleaned.endsWith("`")) {
      cleaned = cleaned.slice(1, -1);
    }

    // If AI repeated the current line, remove it
    if (cleaned.startsWith(textBeforeCursor)) {
      cleaned = cleaned.substring(textBeforeCursor.length);
    }

    // Remove explanatory text after the code
    const lines = cleaned.split("\n");
    const codeLines = [];
    for (const line of lines) {
      // Stop at explanatory comments or text
      if (line.trim().startsWith("//") && line.toLowerCase().includes("this")) {
        break;
      }
      if (line.trim().startsWith("/*")) {
        break;
      }
      // Stop at sentences (explanations)
      if (/^[A-Z].*\.$/.test(line.trim())) {
        break;
      }
      codeLines.push(line);
    }

    cleaned = codeLines.join("\n").trim();

    // Limit to 2 lines max
    if (codeLines.length > 2) {
      cleaned = codeLines.slice(0, 2).join("\n");
    }

    return cleaned;
  }

  isValidCompletion(completion, textBeforeCursor) {
    // Çok kısa veya çok uzun mu?
    if (completion.length < 1 || completion.length > 200) {
      return false;
    }

    // Sadece boşluk/noktalama mı?
    if (/^[\s\.\,\;\:\(\)\[\]\{\}]*$/.test(completion)) {
      return false;
    }

    // AI açıklama mı yapmış? (cümle gibi)
    if (/^(This|The|It|You|We|I)\s+\w+/.test(completion)) {
      return false;
    }

    // Tırnak içinde mi hala?
    if (
      (completion.startsWith('"') && completion.endsWith('"')) ||
      (completion.startsWith("'") && completion.endsWith("'"))
    ) {
      return false;
    }

    // Mantıksız tekrar var mı?
    if (completion === textBeforeCursor) {
      return false;
    }

    return true;
  }
}
