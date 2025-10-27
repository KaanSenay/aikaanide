# 📝 Diff Viewer - Kod Değişikliği Önerileri

## Yeni Özellik: GitHub Copilot Tarzı Diff View!

AI'dan kod değişikliği istediğinizde, değişiklikler **highlight** ile gösterilir ve siz **kabul** veya **red** edebilirsiniz!

## 🎯 Nasıl Çalışır?

### 1. Chat'ten Kod Değişikliği İste
```
Kullanıcı: "Bu fonksiyonu async yap"
Kullanıcı: "Hataları düzelt"
Kullanıcı: "Kodu optimize et"
Kullanıcı: "Yorum ekle"
```

### 2. AI Değişiklikleri Analiz Eder
- Mevcut kodu okur
- Değişiklikleri yapar
- Satır satır karşılaştırır

### 3. Diff Panel Açılır
- **Sağda** bir panel belirir
- Değişiklikler **highlight** ile gösterilir
- İstatistikler gösterilir (ekleme, silme, değişiklik)

### 4. Kabul veya Reddet
- ✅ **Kabul Et**: Değişiklikler uygulanır
- ❌ **Reddet**: Hiçbir şey değişmez

## 🎨 Görsel Özellikler

### Diff Panel
```
┌─────────────────────────────────────┐
│ 📝 AI Kod Değişikliği Önerisi    ✕ │
├─────────────────────────────────────┤
│ + 5 ekleme  - 2 silme  ~ 3 değişik │
├─────────────────────────────────────┤
│  1  - const x = 0;                  │ ← Kırmızı (silindi)
│  1  + const x = 10;                 │ ← Yeşil (eklendi)
│  2  ~ function calc() {             │ ← Sarı (değişti)
│  3  + // Yeni yorum                 │ ← Yeşil (eklendi)
├─────────────────────────────────────┤
│  ❌ Reddet        ✅ Kabul Et       │
└─────────────────────────────────────┘
```

### Editor Highlights
- 🔴 **Kırmızı arka plan**: Silinecek satırlar
- 🟢 **Yeşil arka plan**: Eklenecek satırlar
- 🟡 **Sarı arka plan**: Değiştirilecek satırlar
- **Glyph margin**: Satır numaralarının yanında +, -, ~ işaretleri

## 📊 Özellikler

### 1. Otomatik Algılama
AI şu kelimeleri algılar:
- Türkçe: değiştir, düzenle, düzelt, ekle, sil, güncelle
- İngilizce: change, modify, edit, fix, add, remove, update, refactor, optimize

### 2. Satır Satır Karşılaştırma
```javascript
// Önce:
function calculate(a, b) {
  return a + b;
}

// Sonra:
async function calculate(a, b) {
  await delay(100);
  return a + b;
}

// Diff:
- function calculate(a, b) {
+ async function calculate(a, b) {
+   await delay(100);
    return a + b;
```

### 3. İstatistikler
- ➕ **Ekleme**: Yeni satırlar
- ➖ **Silme**: Kaldırılan satırlar
- 🔄 **Değişiklik**: Düzenlenen satırlar

### 4. Bildirimler
- ✅ "Değişiklikler kabul edildi!"
- ❌ "Değişiklikler reddedildi"

## 🧪 Test Senaryoları

### Test 1: Basit Değişiklik
```
Chat: "x değişkenini 10 yap"

Önce:
const x = 0;

Sonra:
const x = 10;

Diff:
- const x = 0;
+ const x = 10;
```

### Test 2: Fonksiyon Ekleme
```
Chat: "calculateTotal fonksiyonu ekle"

Önce:
const items = [];

Sonra:
const items = [];

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

Diff:
  const items = [];
+ 
+ function calculateTotal(items) {
+   return items.reduce((sum, item) => sum + item.price, 0);
+ }
```

### Test 3: Async Dönüşüm
```
Chat: "fetchData fonksiyonunu async yap"

Önce:
function fetchData() {
  return fetch('/api/data');
}

Sonra:
async function fetchData() {
  return await fetch('/api/data');
}

Diff:
- function fetchData() {
-   return fetch('/api/data');
+ async function fetchData() {
+   return await fetch('/api/data');
  }
```

### Test 4: Yorum Ekleme
```
Chat: "Kodlara yorum ekle"

Önce:
function calculate(a, b) {
  return a + b;
}

Sonra:
// Calculates the sum of two numbers
function calculate(a, b) {
  return a + b;
}

Diff:
+ // Calculates the sum of two numbers
  function calculate(a, b) {
    return a + b;
  }
```

## 🎮 Kullanım

### Adım 1: Dosya Aç
```
1. Bir .js dosyası aç
2. Kodu gör
```

### Adım 2: Chat'te İste
```
Sağdaki chat panelinde:
"Bu fonksiyonu async yap"
```

### Adım 3: Diff'i İncele
```
1. Sağda diff panel açılır
2. Değişiklikleri gör
3. Editor'de highlight'lar görünür
```

### Adım 4: Karar Ver
```
✅ Kabul Et → Kod değişir
❌ Reddet → Hiçbir şey olmaz
```

## 🔧 Teknik Detaylar

### DiffViewer Sınıfı
```javascript
class DiffViewer {
  showDiff(originalCode, newCode, filePath, changes)
  acceptDiff()
  rejectDiff()
  highlightChanges(changes)
  parseAIResponse(aiResponse, currentCode)
  detectChanges(oldCode, newCode)
}
```

### Değişiklik Tipleri
```javascript
{
  type: 'add',      // Yeni satır
  lineNumber: 5,
  content: 'const x = 10;'
}

{
  type: 'delete',   // Silinen satır
  lineNumber: 3,
  content: 'const y = 0;'
}

{
  type: 'modify',   // Değiştirilen satır
  lineNumber: 7,
  oldContent: 'function calc() {',
  newContent: 'async function calc() {'
}
```

### Monaco Editor Decorations
```javascript
{
  range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
  options: {
    isWholeLine: true,
    className: 'diff-highlight-add',
    glyphMarginClassName: 'diff-glyph-add'
  }
}
```

## 🎨 CSS Sınıfları

### Diff Panel
- `.diff-panel` - Ana panel
- `.diff-header` - Başlık
- `.diff-content` - İçerik
- `.diff-stats` - İstatistikler
- `.diff-preview` - Önizleme
- `.diff-actions` - Butonlar

### Diff Lines
- `.diff-line.deleted` - Silinen satır (kırmızı)
- `.diff-line.added` - Eklenen satır (yeşil)
- `.line-number` - Satır numarası
- `.line-marker` - +, -, ~ işareti
- `.line-content` - Satır içeriği

### Editor Highlights
- `.diff-highlight-delete` - Kırmızı arka plan
- `.diff-highlight-add` - Yeşil arka plan
- `.diff-highlight-modify` - Sarı arka plan

## 🐛 Sorun Giderme

### Diff panel açılmıyor
1. Chat'te değişiklik kelimesi kullandınız mı?
2. Dosya açık mı?
3. Console'da hata var mı?

### Highlight'lar görünmüyor
1. Monaco editor yüklü mü?
2. Decorations oluşturuldu mu?
3. CSS yüklü mü?

### Kabul Et çalışmıyor
1. Editor instance'ı var mı?
2. Yeni kod geçerli mi?
3. Console'da hata var mı?

## 💡 İpuçları

1. **Net talimatlar verin:**
   - İyi: "calculateTotal fonksiyonunu async yap"
   - Kötü: "Kodu düzelt"

2. **Küçük değişiklikler isteyin:**
   - Tek seferde 5-10 satır değişiklik ideal
   - Büyük değişiklikler için adım adım ilerleyin

3. **Önce inceleyin, sonra kabul edin:**
   - Diff'i dikkatlice okuyun
   - Mantıklı mı kontrol edin
   - Sonra kabul edin

4. **Test edin:**
   - Değişiklikten sonra kodu test edin
   - Hata varsa geri alın (Ctrl+Z)

---

Artık kod değişiklikleri güvenli ve görsel! 🎉
