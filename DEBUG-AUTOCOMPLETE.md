# 🐛 AI Autocomplete Debug Rehberi

## Yapılan İyileştirmeler

### ✅ Tırnak Sorunu Çözüldü
- AI'ın tırnak içinde cevap vermesi engellendi
- Başta ve sonda tüm tırnak tipleri temizleniyor (`"`, `'`, `` ` ``)
- Tüm cevap tırnak içindeyse otomatik çıkarılıyor

### ✅ Ghost Text İyileştirmeleri
- Monaco Editor decoration sistemi kullanılıyor
- Daha detaylı CSS kuralları eklendi
- Debug logları eklendi

### ✅ Akıllı Prompt
- Daha kısa ve net prompt
- Cursor pozisyonu █ ile gösteriliyor
- Örnekler daha açık

## 🧪 Test Adımları

### 1. Console'u Aç
```
F12 tuşuna bas → Console sekmesi
```

### 2. Bir Dosya Aç ve Kod Yaz
```javascript
function calc
```

### 3. 1 Saniye Bekle

### 4. Console'da Şunları Gör:
```
[AIAutocomplete] Requesting completion...
[AIAutocomplete] Prompt: Complete this javascript code...
[AIAutocomplete] Raw completion received: ulate(a, b) {
[AIAutocomplete] Cleaned completion: ulate(a, b) {
[AIAutocomplete] Auto mode - showing ghost text
[AIAutocomplete] Showing ghost text: ulate(a, b) {
[AIAutocomplete] Position: {lineNumber: 1, column: 14}
[AIAutocomplete] Creating decoration with options: {...}
[AIAutocomplete] Decoration IDs: ["1"]
[AIAutocomplete] Ghost text shown (press Tab to accept)
```

## 🔍 Sorun Tespiti

### Ghost Text Görünmüyor

**1. Decoration ID Kontrolü:**
```javascript
// Console'da şunu ara:
[AIAutocomplete] Decoration IDs: [...]

// Eğer boş array [] ise:
// - Monaco editor decoration oluşturulmamış
// - Editor instance'ı kontrol et

// Eğer ["1"] gibi bir ID varsa:
// - Decoration oluşturulmuş ama CSS çalışmıyor
// - CSS'i kontrol et
```

**2. CSS Kontrolü:**
```javascript
// Console'da şunu çalıştır:
document.querySelector('.monaco-editor .ai-ghost-text')

// Eğer null dönerse:
// - CSS class uygulanmamış
// - Monaco editor decoration sistemi farklı çalışıyor olabilir
```

**3. Manuel Test:**
```javascript
// Console'da şunu çalıştır:
const editor = window.monacoEditor;
const position = editor.getPosition();
editor.deltaDecorations([], [{
  range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
  options: {
    after: {
      content: ' TEST GHOST TEXT',
      inlineClassName: 'ai-ghost-text'
    }
  }
}]);

// Eğer "TEST GHOST TEXT" gri ve italik görünüyorsa:
// - CSS çalışıyor
// - Sorun AI completion'da

// Eğer görünmüyorsa:
// - CSS sorunu var
// - Monaco editor versiyonu farklı olabilir
```

### AI Tırnak İçinde Cevap Veriyor

**Kontrol:**
```javascript
// Console'da şunu ara:
[AIAutocomplete] Raw completion received: "ulate(a, b) {"

// Eğer tırnak içindeyse:
[AIAutocomplete] Cleaned completion: ulate(a, b) {

// Temizleme çalışıyor mu kontrol et
```

**Hala tırnak varsa:**
- `renderer/aiAutocomplete.js` dosyasında temizleme kodunu kontrol et
- Farklı tırnak tipleri olabilir: `"`, `'`, `` ` ``, `„`, `"`

### Hiç Öneri Gelmiyor

**1. Ollama Kontrolü:**
```bash
# Terminal'de:
ollama list
ollama serve
```

**2. Karakter Sayısı:**
- En az 5 karakter yazmalısınız
- Sadece noktalama/boşluk varsa öneri gelmez

**3. Debounce:**
- 1 saniye beklemelisiniz
- Yazmaya devam ederseniz timer sıfırlanır

## 🎨 CSS Alternatifleri

Eğer ghost text hala görünmüyorsa, farklı bir yöntem deneyin:

### Yöntem 1: Content Widget (Şu an kullanılan)
```javascript
options: {
  after: {
    content: 'ghost text',
    inlineClassName: 'ai-ghost-text'
  }
}
```

### Yöntem 2: Inline Decoration
```javascript
// aiAutocomplete.js içinde showGhostText fonksiyonunu değiştir:
const widget = {
  getId: () => 'ai.ghost.text',
  getDomNode: () => {
    const node = document.createElement('span');
    node.textContent = firstLine;
    node.className = 'ai-ghost-text-widget';
    node.style.color = '#666';
    node.style.fontStyle = 'italic';
    node.style.opacity = '0.6';
    return node;
  },
  getPosition: () => ({
    position: position,
    preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
  })
};
this.editor.addContentWidget(widget);
```

### Yöntem 3: Overlay Widget
```javascript
// Ekranın üstüne overlay olarak göster
const widget = {
  getId: () => 'ai.ghost.overlay',
  getDomNode: () => {
    const node = document.createElement('div');
    node.textContent = firstLine;
    node.style.position = 'absolute';
    node.style.color = '#666';
    node.style.fontStyle = 'italic';
    return node;
  },
  getPosition: () => null
};
this.editor.addOverlayWidget(widget);
```

## 📝 Notlar

- Monaco Editor versiyonu: 0.49.0
- Decoration sistemi Monaco'nun resmi yöntemi
- CSS !important kullanılıyor çünkü Monaco kendi stilleri var
- Ghost text sadece ilk satırı gösteriyor (performans için)

## 🚀 Sonraki Adımlar

1. `npm start` ile test et
2. Console'u aç ve logları takip et
3. Decoration ID'leri kontrol et
4. CSS'in uygulandığını doğrula
5. Sorun devam ederse alternatif yöntemleri dene
