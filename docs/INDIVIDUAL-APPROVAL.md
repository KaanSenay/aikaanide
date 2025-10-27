# ✋ Tek Tek Onaylama - Her Değişikliği Kontrol Edin!

## ✅ Yeni Özellik: Individual Change Approval

**Önce:** Tüm değişiklikler tek seferde kabul/red ediliyordu
**Şimdi:** Her değişikliği **tek tek** onaylayabilirsiniz!

---

## 🎯 Nasıl Çalışır?

### 1. AI Değişiklik Önerir

```
Chat: "Bu fonksiyonu düzenle"
```

### 2. Her Değişiklik İçin Widget Gösterilir

```
┌─────────────────────────────────┐
│ - const x = 0;                  │ ← Kırmızı (silinecek)
│ + const x = 10;                 │ ← Yeşil (eklenecek)
│                          ✓  ✕   │ ← Kabul/Red butonları
└─────────────────────────────────┘
```

### 3. Tek Tek Onaylayın

- ✓ **Kabul Et**: Bu değişiklik uygulanır
- ✕ **Reddet**: Bu değişiklik atlanır

### 4. Floating Bar

```
┌─────────────────────────────────┐
│ 📝 3 değişiklik bekliyor        │
│ ❌ Hepsini Reddet               │
│ ✅ Hepsini Kabul Et             │
└─────────────────────────────────┘
```

---

## 🧪 Test Senaryoları

### Test 1: Basit Değişiklikler

```
Chat: "x, y, z değişkenlerini güncelle"

Widget 1:
┌─────────────────────────────────┐
│ - const x = 0;                  │
│ + const x = 10;                 │
│                          ✓  ✕   │
└─────────────────────────────────┘
✓ Kabul → x = 10 olur

Widget 2:
┌─────────────────────────────────┐
│ - const y = 0;                  │
│ + const y = 20;                 │
│                          ✓  ✕   │
└─────────────────────────────────┘
✕ Reddet → y = 0 kalır

Widget 3:
┌─────────────────────────────────┐
│ - const z = 0;                  │
│ + const z = 30;                 │
│                          ✓  ✕   │
└─────────────────────────────────┘
✓ Kabul → z = 30 olur

Sonuç:
const x = 10; ✅
const y = 0;  ⏭️ (değişmedi)
const z = 30; ✅
```

### Test 2: Fonksiyon Değişiklikleri

```
Chat: "Bu fonksiyona async ekle ve comment ekle"

Widget 1 (Comment):
┌─────────────────────────────────┐
│ + // Fetches user data          │
│                          ✓  ✕   │
└─────────────────────────────────┘
✓ Kabul → Comment eklenir

Widget 2 (Async):
┌─────────────────────────────────┐
│ - function fetchData() {        │
│ + async function fetchData() {  │
│                          ✓  ✕   │
└─────────────────────────────────┘
✓ Kabul → Async olur

Widget 3 (Await):
┌─────────────────────────────────┐
│ - return fetch('/api/data');    │
│ + return await fetch(...);      │
│                          ✓  ✕   │
└─────────────────────────────────┘
✕ Reddet → Await eklenmez

Sonuç:
// Fetches user data        ✅
async function fetchData() { ✅
  return fetch('/api/data'); ⏭️ (await yok)
}
```

### Test 3: Toplu İşlem

```
Chat: "Tüm değişkenleri güncelle"

5 değişiklik önerildi

Floating bar:
📝 5 değişiklik bekliyor
❌ Hepsini Reddet | ✅ Hepsini Kabul Et

Seçenekler:
1. Tek tek onaylayın (✓ veya ✕)
2. Hepsini kabul et (✅ Hepsini Kabul Et)
3. Hepsini reddet (❌ Hepsini Reddet)
```

---

## 🎨 Widget Görünümü

### Silme (Delete)

```
┌─────────────────────────────────┐
│ - const oldCode = 'remove';     │ ← Kırmızı arka plan
│                          ✓  ✕   │
└─────────────────────────────────┘
```

### Ekleme (Add)

```
┌─────────────────────────────────┐
│ + const newCode = 'add';        │ ← Yeşil arka plan
│                          ✓  ✕   │
└─────────────────────────────────┘
```

### Değiştirme (Modify)

```
┌─────────────────────────────────┐
│ - const x = 0;                  │ ← Kırmızı
│ + const x = 10;                 │ ← Yeşil
│                          ✓  ✕   │
└─────────────────────────────────┘
```

---

## 📊 Floating Action Bar Durumları

### Bekleyen Değişiklikler Var

```
┌─────────────────────────────────┐
│ 📝 3 değişiklik bekliyor        │
│ ❌ Hepsini Reddet               │
│ ✅ Hepsini Kabul Et             │
└─────────────────────────────────┘
```

### Tüm Değişiklikler İşlendi

```
┌─────────────────────────────────┐
│ ✅ 2 kabul edildi, ❌ 1 reddedildi │
│           Tamam                  │
└─────────────────────────────────┘
```

---

## 💡 Kullanım İpuçları

### 1. Dikkatli İnceleyin

```
✅ Her değişikliği okuyun
✅ Mantıklı mı kontrol edin
✅ Sonra karar verin
```

### 2. Seçici Olun

```
✅ İyi değişiklikleri kabul edin
❌ Kötü değişiklikleri reddedin
⏭️ Emin değilseniz reddedin
```

### 3. Toplu İşlem

```
Eğer tüm değişiklikler iyi ise:
✅ Hepsini Kabul Et

Eğer hiçbiri iyi değilse:
❌ Hepsini Reddet
```

### 4. Geri Alma

```
Yanlış kabul ettiyseniz:
Ctrl+Z ile geri alın
```

---

## 🔧 Teknik Detaylar

### Change Widget

```javascript
{
  id: 'change-0',
  type: 'add' | 'delete' | 'modify',
  lineNumber: 5,
  content: 'const x = 10;',
  status: 'pending' | 'accepted' | 'rejected'
}
```

### Monaco Content Widget

```javascript
{
  getId: () => 'diff-widget-change-0',
  getDomNode: () => domNode,
  getPosition: () => ({
    position: { lineNumber: 5, column: 1 },
    preference: [ContentWidgetPositionPreference.ABOVE]
  })
}
```

### Single Change Application

```javascript
// Delete
model.pushEditOperations(
  [],
  [
    {
      range: new monaco.Range(lineNumber, 1, lineNumber + 1, 1),
      text: "",
    },
  ],
  () => null
);

// Add
model.pushEditOperations(
  [],
  [
    {
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      text: content + "\n",
    },
  ],
  () => null
);

// Modify
model.pushEditOperations(
  [],
  [
    {
      range: new monaco.Range(lineNumber, 1, lineNumber, length + 1),
      text: newContent,
    },
  ],
  () => null
);
```

---

## 🎓 Örnekler

### Örnek 1: Seçici Onaylama

```javascript
// Önce:
const API_URL = 'http://localhost:3000';
const DEBUG = true;
const VERSION = '1.0.0';

// Chat: "Production ayarlarına çevir"

// Widget 1:
- const API_URL = 'http://localhost:3000';
+ const API_URL = 'https://api.production.com';
✓ Kabul → Production URL

// Widget 2:
- const DEBUG = true;
+ const DEBUG = false;
✓ Kabul → Debug kapalı

// Widget 3:
- const VERSION = '1.0.0';
+ const VERSION = '2.0.0';
✕ Reddet → Versiyon değişmesin

// Sonuç:
const API_URL = 'https://api.production.com'; ✅
const DEBUG = false; ✅
const VERSION = '1.0.0'; ⏭️
```

### Örnek 2: Comment Ekleme

```javascript
// Önce:
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Chat: "Comment ekle"

// Widget 1:
+ // Calculate the total price of all items
✓ Kabul

// Widget 2:
+ // Sum all item prices using reduce
✕ Reddet (çok detaylı)

// Sonuç:
// Calculate the total price of all items ✅
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

---

## 🐛 Sorun Giderme

### Widget'lar görünmüyor

1. Monaco editor yüklü mü?
2. Content widget API çalışıyor mu?
3. CSS yüklü mü?

### Butonlar çalışmıyor

1. Event listener'lar bağlandı mı?
2. Change ID doğru mu?
3. Console'da hata var mı?

### Değişiklik uygulanmıyor

1. Model var mı?
2. Range doğru mu?
3. pushEditOperations çalışıyor mu?

---

Artık her değişikliği kontrol edebilirsiniz! ✋
