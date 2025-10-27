export class DiffViewer {
  constructor(editor) {
    this.editor = editor;
    this.currentDiff = null;
    this.decorations = [];
    this.createDiffPanel();
  }

  createDiffPanel() {
    // Diff panel HTML'i oluştur
    const panel = document.createElement('div');
    panel.id = 'diff-panel';
    panel.className = 'diff-panel hidden';
    panel.innerHTML = `
      <div class="diff-header">
        <span class="diff-title">📝 AI Kod Değişikliği Önerisi</span>
        <button class="diff-close" title="Kapat">✕</button>
      </div>
      <div class="diff-content">
        <div class="diff-stats"></div>
        <div class="diff-preview"></div>
      </div>
      <div class="diff-actions">
        <button class="diff-reject">❌ Reddet</button>
        <button class="diff-accept">✅ Kabul Et</button>
      </div>
    `;

    document.body.appendChild(panel);

    // Event listeners
    panel.querySelector('.diff-close').addEventListener('click', () => this.hideDiff());
    panel.querySelector('.diff-reject').addEventListener('click', () => this.rejectDiff());
    panel.querySelector('.diff-accept').addEventListener('click', () => this.acceptDiff());
  }

  showDiff(originalCode, newCode, filePath, changes) {
    console.log("[DiffViewer] Showing inline diff for:", filePath);
    
    this.currentDiff = {
      originalCode,
      newCode,
      filePath,
      changes
    };

    // Editor'de inline diff göster
    this.showInlineDiff(changes);
    
    // Floating action buttons göster
    this.showActionButtons();
  }

  showInlineDiff(changes) {
    console.log("[DiffViewer] Showing inline diff with", changes.length, "changes");
    
    // Mevcut decorations'ları temizle
    this.clearHighlights();

    // Değişiklikleri satır numarasına göre sırala (tersten - sondan başa)
    const sortedChanges = [...changes].sort((a, b) => b.lineNumber - a.lineNumber);

    // Her değişiklik için yeni satır ekle
    this.pendingChanges = new Map();
    this.insertedLines = [];

    sortedChanges.forEach((change, index) => {
      change.id = `change-${index}`;
      change.status = 'pending';
      this.pendingChanges.set(change.id, change);
      
      // Yeni satır ekleyerek diff göster
      this.insertDiffLines(change);
    });

    console.log("[DiffViewer] Inserted", this.insertedLines.length, "diff lines");
    this.updateActionBar();
  }

  insertDiffLines(change) {
    const model = this.editor.getModel();
    if (!model) return;

    const lineCount = model.getLineCount();
    const lineNumber = Math.min(Math.max(1, change.lineNumber), lineCount);
    
    // Satır numarası geçerli mi kontrol et
    if (lineNumber < 1 || lineNumber > lineCount) {
      console.warn("[DiffViewer] Invalid line number:", lineNumber);
      return;
    }

    const lineContent = model.getLineContent(lineNumber);

    if (change.type === 'delete') {
      // Silme: Mevcut satırı kırmızı yap, altına marker ekle
      const insertPosition = new monaco.Range(lineNumber + 1, 1, lineNumber + 1, 1);
      
      model.pushEditOperations([], [{
        range: insertPosition,
        text: `// [DELETED] ${lineContent}\n`,
        forceMoveMarkers: true
      }], () => null);

      this.insertedLines.push({
        lineNumber: lineNumber + 1,
        changeId: change.id,
        type: 'delete-marker'
      });

    } else if (change.type === 'add') {
      // Ekleme: Yeni satırı yeşil olarak ekle
      const insertPosition = new monaco.Range(lineNumber, 1, lineNumber, 1);
      
      model.pushEditOperations([], [{
        range: insertPosition,
        text: `${change.content}\n`,
        forceMoveMarkers: true
      }], () => null);

      this.insertedLines.push({
        lineNumber: lineNumber,
        changeId: change.id,
        type: 'add-marker'
      });

    } else if (change.type === 'modify') {
      // Değiştirme: Eski satırı kırmızı, altına yeni satırı yeşil ekle
      const insertPosition = new monaco.Range(lineNumber + 1, 1, lineNumber + 1, 1);
      
      model.pushEditOperations([], [{
        range: insertPosition,
        text: `${change.newContent}\n`,
        forceMoveMarkers: true
      }], () => null);

      this.insertedLines.push({
        lineNumber: lineNumber,
        changeId: change.id,
        type: 'modify-old'
      });
      this.insertedLines.push({
        lineNumber: lineNumber + 1,
        changeId: change.id,
        type: 'modify-new'
      });
    }

    // Decoration ekle
    this.addDiffDecoration(change);
  }

  addDiffDecoration(change) {
    const model = this.editor.getModel();
    if (!model) return;

    const lineCount = model.getLineCount();
    const lineNumber = Math.min(Math.max(1, change.lineNumber), lineCount);
    
    // Satır numarası geçerli mi kontrol et
    if (lineNumber < 1 || lineNumber > lineCount) {
      console.warn("[DiffViewer] Invalid line number for decoration:", lineNumber);
      return;
    }
    
    if (change.type === 'delete') {
      // Kırmızı satır + butonlar
      const decoration = {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
        options: {
          isWholeLine: true,
          className: 'diff-line-delete-bg',
          glyphMarginClassName: 'diff-glyph-delete',
          after: {
            content: '  ✓  ✕',
            inlineClassName: `diff-inline-actions diff-actions-${change.id}`
          }
        }
      };
      
      const ids = this.editor.deltaDecorations([], [decoration]);
      this.decorations.push(...ids);

    } else if (change.type === 'add') {
      // Yeşil satır + butonlar
      const decoration = {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
        options: {
          isWholeLine: true,
          className: 'diff-line-add-bg',
          glyphMarginClassName: 'diff-glyph-add',
          after: {
            content: '  ✓  ✕',
            inlineClassName: `diff-inline-actions diff-actions-${change.id}`
          }
        }
      };
      
      const ids = this.editor.deltaDecorations([], [decoration]);
      this.decorations.push(...ids);

    } else if (change.type === 'modify') {
      // Yeni satır ekledikten sonra lineCount arttı, kontrol et
      const newLineCount = model.getLineCount();
      if (lineNumber + 1 > newLineCount) {
        console.warn("[DiffViewer] Cannot add decoration for line:", lineNumber + 1);
        return;
      }

      // Eski satır (kırmızı)
      const oldDecoration = {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
        options: {
          isWholeLine: true,
          className: 'diff-line-delete-bg',
          glyphMarginClassName: 'diff-glyph-modify'
        }
      };
      
      // Yeni satır (yeşil) + butonlar
      const newDecoration = {
        range: new monaco.Range(lineNumber + 1, 1, lineNumber + 1, 1000),
        options: {
          isWholeLine: true,
          className: 'diff-line-add-bg',
          glyphMarginClassName: 'diff-glyph-add',
          after: {
            content: '  ✓  ✕',
            inlineClassName: `diff-inline-actions diff-actions-${change.id}`
          }
        }
      };
      
      const ids = this.editor.deltaDecorations([], [oldDecoration, newDecoration]);
      this.decorations.push(...ids);
    }

    // Butonlara event ekle
    setTimeout(() => {
      this.attachButtonEvents(change.id);
    }, 100);
  }

  createInlineDecoration(change) {
    const lineNumber = change.lineNumber;
    
    let decoration = {
      range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
      options: {
        isWholeLine: true,
        linesDecorationsClassName: 'diff-line-gutter',
        className: change.type === 'delete' ? 'diff-line-delete-bg' :
                   change.type === 'add' ? 'diff-line-add-bg' :
                   'diff-line-modify-bg',
        glyphMarginClassName: change.type === 'delete' ? 'diff-glyph-delete' :
                             change.type === 'add' ? 'diff-glyph-add' :
                             'diff-glyph-modify',
        after: {
          content: `  ✓  ✕`,
          inlineClassName: `diff-inline-actions diff-actions-${change.id}`,
          cursorStops: monaco.editor.InjectedTextCursorStops.None
        }
      }
    };

    const decorationIds = this.editor.deltaDecorations([], [decoration]);
    this.decorations.push(...decorationIds);

    // Butonlara click event ekle
    setTimeout(() => {
      this.attachButtonEvents(change.id);
    }, 100);
  }

  attachButtonEvents(changeId) {
    // Monaco editor'deki after content'e direkt event ekleyemiyoruz
    // Bunun yerine editor'e click listener ekleyelim
    const editorDom = this.editor.getDomNode();
    if (!editorDom) return;

    // Tüm diff-inline-actions elementlerini bul
    const actionElements = editorDom.querySelectorAll(`.diff-actions-${changeId}`);
    actionElements.forEach(element => {
      element.style.cursor = 'pointer';
      
      element.addEventListener('click', (e) => {
        const rect = element.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        
        // Sol yarı: Kabul (✓)
        // Sağ yarı: Reddet (✕)
        if (clickX < width / 2) {
          this.acceptSingleChange(changeId);
        } else {
          this.rejectSingleChange(changeId);
        }
      });
    });
  }



  acceptSingleChange(changeId) {
    const change = this.pendingChanges.get(changeId);
    if (!change || change.status !== 'pending') return;

    console.log("[DiffViewer] Accepting single change:", changeId);
    change.status = 'accepted';

    // Değişikliği uygula
    this.applySingleChange(change);

    // Decoration'ı kaldır
    this.removeChangeDecoration(changeId);

    // Action bar'ı güncelle
    this.updateActionBar();

    // Bildirim göster
    this.showNotification('✅ Kabul edildi', 'success');
  }

  rejectSingleChange(changeId) {
    const change = this.pendingChanges.get(changeId);
    if (!change || change.status !== 'pending') return;

    console.log("[DiffViewer] Rejecting single change:", changeId);
    change.status = 'rejected';

    // Decoration'ı kaldır
    this.removeChangeDecoration(changeId);

    // Action bar'ı güncelle
    this.updateActionBar();

    // Bildirim göster
    this.showNotification('❌ Reddedildi', 'info');
  }

  removeChangeDecoration(changeId) {
    // Decoration'ı kaldır ve yeniden render et
    const remainingChanges = Array.from(this.pendingChanges.values())
      .filter(c => c.status === 'pending' && c.id !== changeId);
    
    this.clearHighlights();
    
    remainingChanges.forEach(change => {
      this.createInlineDecoration(change);
    });
  }

  applySingleChange(change) {
    const model = this.editor.getModel();
    if (!model) return;

    if (change.type === 'delete') {
      // Satırı sil
      const range = new monaco.Range(change.lineNumber, 1, change.lineNumber + 1, 1);
      model.pushEditOperations([], [{
        range: range,
        text: ''
      }], () => null);
    } else if (change.type === 'add') {
      // Satır ekle
      const range = new monaco.Range(change.lineNumber, 1, change.lineNumber, 1);
      model.pushEditOperations([], [{
        range: range,
        text: change.content + '\n'
      }], () => null);
    } else if (change.type === 'modify') {
      // Satırı değiştir
      const lineContent = model.getLineContent(change.lineNumber);
      const range = new monaco.Range(change.lineNumber, 1, change.lineNumber, lineContent.length + 1);
      model.pushEditOperations([], [{
        range: range,
        text: change.newContent
      }], () => null);
    }
  }

  updateActionBar() {
    const pending = Array.from(this.pendingChanges.values()).filter(c => c.status === 'pending');
    const accepted = Array.from(this.pendingChanges.values()).filter(c => c.status === 'accepted');
    const rejected = Array.from(this.pendingChanges.values()).filter(c => c.status === 'rejected');

    let actionBar = document.getElementById('diff-action-bar');
    if (!actionBar) {
      actionBar = document.createElement('div');
      actionBar.id = 'diff-action-bar';
      actionBar.className = 'diff-action-bar';
      document.body.appendChild(actionBar);
    }

    if (pending.length === 0) {
      // Tüm değişiklikler işlendi
      actionBar.innerHTML = `
        <div class="diff-action-title">
          ✅ ${accepted.length} kabul edildi, ❌ ${rejected.length} reddedildi
        </div>
        <button class="diff-action-btn diff-action-done">Tamam</button>
      `;
      
      actionBar.querySelector('.diff-action-done').addEventListener('click', () => {
        this.hideDiff();
      });
    } else {
      // Hala bekleyen değişiklikler var
      actionBar.innerHTML = `
        <div class="diff-action-title">
          📝 ${pending.length} değişiklik bekliyor
        </div>
        <button class="diff-action-btn diff-action-reject-all">❌ Hepsini Reddet</button>
        <button class="diff-action-btn diff-action-accept-all">✅ Hepsini Kabul Et</button>
      `;

      actionBar.querySelector('.diff-action-reject-all').addEventListener('click', () => {
        this.rejectAllChanges();
      });

      actionBar.querySelector('.diff-action-accept-all').addEventListener('click', () => {
        this.acceptAllChanges();
      });
    }

    actionBar.classList.add('show');
  }

  acceptAllChanges() {
    console.log("[DiffViewer] Accepting all changes");
    const pending = Array.from(this.pendingChanges.values()).filter(c => c.status === 'pending');
    pending.forEach(change => {
      this.acceptSingleChange(change.id);
    });
  }

  rejectAllChanges() {
    console.log("[DiffViewer] Rejecting all changes");
    const pending = Array.from(this.pendingChanges.values()).filter(c => c.status === 'pending');
    pending.forEach(change => {
      this.rejectSingleChange(change.id);
    });
  }

  showActionButtons() {
    // Floating action buttons oluştur
    let actionBar = document.getElementById('diff-action-bar');
    if (!actionBar) {
      actionBar = document.createElement('div');
      actionBar.id = 'diff-action-bar';
      actionBar.className = 'diff-action-bar';
      actionBar.innerHTML = `
        <div class="diff-action-title">📝 AI Değişiklik Önerisi</div>
        <button class="diff-action-btn diff-action-reject">❌ Reddet</button>
        <button class="diff-action-btn diff-action-accept">✅ Kabul Et</button>
      `;
      document.body.appendChild(actionBar);

      // Event listeners
      actionBar.querySelector('.diff-action-reject').addEventListener('click', () => this.rejectDiff());
      actionBar.querySelector('.diff-action-accept').addEventListener('click', () => this.acceptDiff());
    }
    
    actionBar.classList.add('show');
  }

  hideActionButtons() {
    const actionBar = document.getElementById('diff-action-bar');
    if (actionBar) {
      actionBar.classList.remove('show');
    }
  }

  generateDiffHTML(changes) {
    let html = '<div class="diff-lines">';
    
    for (const change of changes) {
      if (change.type === 'delete') {
        html += `
          <div class="diff-line deleted">
            <span class="line-number">${change.lineNumber}</span>
            <span class="line-marker">-</span>
            <span class="line-content">${this.escapeHtml(change.content)}</span>
          </div>
        `;
      } else if (change.type === 'add') {
        html += `
          <div class="diff-line added">
            <span class="line-number">${change.lineNumber}</span>
            <span class="line-marker">+</span>
            <span class="line-content">${this.escapeHtml(change.content)}</span>
          </div>
        `;
      } else if (change.type === 'modify') {
        html += `
          <div class="diff-line deleted">
            <span class="line-number">${change.lineNumber}</span>
            <span class="line-marker">-</span>
            <span class="line-content">${this.escapeHtml(change.oldContent)}</span>
          </div>
          <div class="diff-line added">
            <span class="line-number">${change.lineNumber}</span>
            <span class="line-marker">+</span>
            <span class="line-content">${this.escapeHtml(change.newContent)}</span>
          </div>
        `;
      }
    }
    
    html += '</div>';
    return html;
  }

  highlightChanges(changes) {
    // Mevcut decorations'ları temizle
    this.clearHighlights();

    const decorations = [];

    for (const change of changes) {
      let className = '';
      if (change.type === 'delete') {
        className = 'diff-highlight-delete';
      } else if (change.type === 'add') {
        className = 'diff-highlight-add';
      } else if (change.type === 'modify') {
        className = 'diff-highlight-modify';
      }

      decorations.push({
        range: new monaco.Range(
          change.lineNumber,
          1,
          change.lineNumber,
          1000
        ),
        options: {
          isWholeLine: true,
          className: className,
          glyphMarginClassName: change.type === 'delete' ? 'diff-glyph-delete' : 
                               change.type === 'add' ? 'diff-glyph-add' : 
                               'diff-glyph-modify'
        }
      });
    }

    this.decorations = this.editor.deltaDecorations([], decorations);
    console.log("[DiffViewer] Highlighted", decorations.length, "changes");
  }

  clearHighlights() {
    if (this.decorations && this.decorations.length > 0) {
      this.editor.deltaDecorations(this.decorations, []);
      this.decorations = [];
    }

    // Eklenen diff satırlarını temizle
    if (this.insertedLines && this.insertedLines.length > 0) {
      const model = this.editor.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        // Eklenen satırları tersten sil (satır numaraları değişmesin)
        const sortedLines = [...this.insertedLines].sort((a, b) => b.lineNumber - a.lineNumber);
        
        sortedLines.forEach(line => {
          // Satır numarası geçerli mi kontrol et
          if (line.lineNumber < 1 || line.lineNumber > lineCount) {
            return;
          }
          
          const lineContent = model.getLineContent(line.lineNumber);
          if (lineContent.startsWith('// [DELETED]') || 
              line.type === 'add-marker' || 
              line.type === 'modify-new') {
            const range = new monaco.Range(line.lineNumber, 1, line.lineNumber + 1, 1);
            model.pushEditOperations([], [{
              range: range,
              text: '',
              forceMoveMarkers: true
            }], () => null);
          }
        });
      }
      this.insertedLines = [];
    }
  }



  acceptDiff() {
    if (!this.currentDiff) return;
    
    console.log("[DiffViewer] Accepting all changes");
    
    // Tüm değişiklikleri uygula
    const model = this.editor.getModel();
    if (!model) return;
    
    // Yeni kodu direkt yaz
    model.setValue(this.currentDiff.newCode);
    
    // Dosyayı kaydet
    if (this.currentDiff.filePath) {
      window.api.saveFile(this.currentDiff.filePath, this.currentDiff.newCode)
        .then(() => {
          this.showNotification('✅ Değişiklikler kaydedildi', 'success');
        })
        .catch(err => {
          this.showNotification('❌ Kaydetme hatası: ' + err.message, 'error');
        });
    }
    
    this.hideDiff();
  }

  rejectDiff() {
    console.log("[DiffViewer] Rejecting all changes");
    this.showNotification('❌ Değişiklikler reddedildi', 'info');
    this.hideDiff();
  }

  hideDiff() {
    // Highlights'ları temizle
    this.clearHighlights();
    
    // Action buttons'ları gizle
    this.hideActionButtons();
    
    this.currentDiff = null;
    this.pendingChanges = null;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `diff-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // AI'dan gelen kod değişikliğini parse et
  parseAIResponse(aiResponse, currentCode) {
    console.log("[DiffViewer] Parsing AI response");
    
    // AI'ın verdiği yeni kodu çıkar
    let newCode = aiResponse;
    
    // Markdown code block'ları temizle
    newCode = newCode.replace(/```[\w]*\n?/g, '');
    newCode = newCode.replace(/```/g, '');
    newCode = newCode.trim();
    
    // Eğer AI açıklama yapmışsa, sadece kodu al
    const codeBlockMatch = newCode.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      newCode = codeBlockMatch[1].trim();
    }
    
    // Değişiklikleri tespit et
    const changes = this.detectChanges(currentCode, newCode);
    
    return {
      newCode,
      changes
    };
  }

  detectChanges(oldCode, newCode) {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const changes = [];
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      
      if (oldLine === undefined && newLine !== undefined) {
        // Yeni satır eklendi
        changes.push({
          type: 'add',
          lineNumber: i + 1,
          content: newLine
        });
      } else if (oldLine !== undefined && newLine === undefined) {
        // Satır silindi
        changes.push({
          type: 'delete',
          lineNumber: i + 1,
          content: oldLine
        });
      } else if (oldLine !== newLine) {
        // Satır değiştirildi
        changes.push({
          type: 'modify',
          lineNumber: i + 1,
          oldContent: oldLine,
          newContent: newLine
        });
      }
    }
    
    return changes;
  }
}
