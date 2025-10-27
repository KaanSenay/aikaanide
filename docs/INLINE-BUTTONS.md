# 🎯 Inline Butonlar - Satır Üzerinde Onaylama

## ✅ Yeni Tasarım!

**Önce:** Ayrı widget'lar (üst üste biniyordu)
**Şimdi:** Satır üzerinde direkt highlight + satır sonunda butonlar

---

## 🎨 Nasıl Görünüyor?

### Silme (Delete)
```
const x = 0;  ✓  ✕  ← Kırmızı arka plan, satır sonunda butonlar
```

### Ekleme (Add)
```
const x = 10;  ✓  ✕  ← Yeşil arka plan, satır sonunda butonlar
```

### Değiştirme (Modify)
```
function calc() {  ✓  ✕  ← Sarı arka plan, satır sonunda butonlar
```

---

## 🎯 Kullanım

### 1. AI Değişiklik Önerir
```
Chat: "x değişkenini 10 yap"
```

### 2. Satır Highlight Olur
```
const x = 0;  ✓  ✕
     ↑           ↑  ↑
  Kırmızı    Kabul Red
```

### 3. Butona Tıkla
- **✓ (Sol)**: Değişikliği kabul et
- **✕ (Sağ)**: Değişikliği reddet

### 4. Sonuç
```
✓ Kabul → const x = 10;
✕ Reddet → const x = 0; (değişmez)
```

---

## 🎨 Renkler

### Kırmızı (Silinecek)
```css
background: rgba(244, 135, 113, 0.2);
```

### Yeşil (Eklenecek)
```css
background: rgba(78, 201, 176, 0.2);
```

### Sarı (Değiştirilecek)
```css
background: rgba(220, 220, 170, 0.15);
```

---

## 🔧 Teknik Detaylar

### Monaco Decoration
```javascript
{
  range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
  options: {
    isWholeLine: true,
    className: 'diff-line-add-bg',  // Yeşil arka plan
    glyphMarginClassName: 'diff-glyph-add',  // + işareti
    after: {
      content: '  ✓  ✕',  // Satır sonunda butonlar
      inlineClassName: 'diff-inline-actions'
    }
  }
}
```

### Click Detection
```javascript
element.addEventListener('click', (e) => {
  const rect = element.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  
  if (clickX < width / 2) {
    // Sol yarı: Kabul (✓)
    acceptSingleChange(changeId);
  } else {
    // Sağ yarı: Reddet (✕)
    rejectSingleChange(changeId);
  }
});
```

---

## 🧪 Test Senaryoları

### Test 1: Tek Değişiklik
```javascript
// Önce:
const x = 0;

// Chat: "x'i 10 yap"

// Editor'de:
const x = 0;  ✓  ✕  ← Kırmızı

// ✓ tıkla:
const x = 10;  ← Yeşil, butonlar kayboldu
```

### Test 2: Çoklu Değişiklik
```javascript
// Önce:
const x = 0;
const y = 0;
const z = 0;

// Chat: "Hepsini güncelle"

// Editor'de:
const x = 0;  ✓  ✕  ← Kırmızı
const y = 0;  ✓  ✕  ← Kırmızı
const z = 0;  ✓  ✕  ← Kırmızı

// x için ✓, y için ✕, z için ✓:
const x = 10;  ← Değişti
const y = 0;   ← Değişmedi
const z = 30;  ← Değişti
```

### Test 3: Fonksiyon Değişikliği
```javascript
// Önce:
function fetchData() {
  return fetch('/api/data');
}

// Chat: "Async yap"

// Editor'de:
function fetchData() {  ✓  ✕  ← Sarı
  return fetch('/api/data');  ✓  ✕  ← Sarı
}

// İlk satır ✓, ikinci satır ✕:
async function fetchData() {  ← Değişti
  return fetch('/api/data');  ← Değişmedi
}
```

---

## 💡 Avantajlar

### Önce (Widget'lar)
❌ Üst üste biniyordu
❌ Ekran dışına çıkıyordu
❌ Kod görünmüyordu
❌ Karmaşık görünüm

### Şimdi (Inline)
✅ Satır üzerinde
✅ Üst üste binmiyor
✅ Kod net görünüyor
✅ Temiz görünüm
✅ GitHub gibi

---

## 🎨 CSS Detayları

### Satır Arka Planı
```css
.diff-line-delete-bg {
  background: rgba(244, 135, 113, 0.2) !important;
}

.diff-line-add-bg {
  background: rgba(78, 201, 176, 0.2) !important;
}

.diff-line-modify-bg {
  background: rgba(220, 220, 170, 0.15) !important;
}
```

### Inline Butonlar
```css
.diff-inline-actions {
  color: #cccccc !important;
  background: #2d2d2d !important;
  padding: 2px 8px !important;
  border-radius: 3px !important;
  margin-left: 10px !important;
  cursor: pointer !important;
  font-size: 12px !important;
  border: 1px solid #3c3c3c !important;
}

.diff-inline-actions:hover {
  background: #3c3c3c !important;
}
```

### Glyph Margin (Satır Numarası Yanı)
```css
.diff-glyph-delete::before {
  content: '-';
  color: #f48771;
}

.diff-glyph-add::before {
  content: '+';
  color: #4ec9b0;
}

.diff-glyph-modify::before {
  content: '~';
  color: #dcdcaa;
}
```

---

## 🐛 Sorun Giderme

### Butonlar görünmüyor
1. Monaco decoration oluşturuldu mu?
2. `after` content var mı?
3. CSS yüklü mü?

### Butonlar çalışmıyor
1. Event listener bağlandı mı?
2. Click detection çalışıyor mu?
3. changeId doğru mu?

### Renkler yanlış
1. CSS class'ları doğru mu?
2. !important var mı?
3. Monaco theme override ediyor mu?

### Satırlar üst üste biniyor
1. isWholeLine: true mi?
2. Range doğru mu?
3. Decoration ID'leri unique mi?

---

## 📊 Karşılaştırma

### Önce (Widget)
```
┌────────────────────────┐
│ - const x = 0;    ✓  ✕ │ ← Ayrı kutu
└────────────────────────┘
┌────────────────────────┐
│ - const y = 0;    ✓  ✕ │ ← Üst üste biniyor
└────────────────────────┘
```

### Şimdi (Inline)
```
const x = 0;  ✓  ✕  ← Satır üzerinde
const y = 0;  ✓  ✕  ← Temiz, net
const z = 0;  ✓  ✕  ← Üst üste binmiyor
```

---

## 🎓 İpuçları

1. **Satıra tıklayın, butona değil:**
   - Satırın sonundaki butonlara tıklayın
   - Sol yarı: Kabul
   - Sağ yarı: Reddet

2. **Renklere dikkat:**
   - Kırmızı: Silinecek
   - Yeşil: Eklenecek
   - Sarı: Değişecek

3. **Tek tek onaylayın:**
   - Her satır için ayrı karar verin
   - Emin değilseniz reddedin

4. **Floating bar:**
   - "Hepsini Kabul/Reddet" hala var
   - Hızlı işlem için kullanın

---

Artık satır üzerinde, temiz ve net! 🎉
