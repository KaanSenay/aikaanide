# 🌍 Project Context Awareness

## Yeni Özellik: Tüm Projeyi Anlayan AI!

AI artık sadece mevcut dosyaya bakmıyor, **tüm projedeki dosyaları analiz ediyor** ve diğer dosyalardaki fonksiyonları, class'ları, değişkenleri kullanarak öneri yapıyor!

## 🎯 Nasıl Çalışır?

### 1. Otomatik Proje Taraması
AI her öneri istediğinizde:
- Mevcut dizindeki tüm `.js`, `.jsx`, `.ts`, `.tsx` dosyalarını tarar
- Fonksiyonları, class'ları, değişkenleri çıkarır
- Import/export statement'larını analiz eder
- 30 saniye cache'ler (performans için)

### 2. Akıllı Öneri
AI şunları bilir:
- ✅ Diğer dosyalardaki fonksiyon isimleri ve parametreleri
- ✅ Class isimleri ve parent class'ları
- ✅ Global değişkenler
- ✅ Import edilen modüller
- ✅ Export edilen öğeler

### 3. Bağlamsal Tamamlama
AI önerileri yaparken:
- Mevcut dosyadaki kodu analiz eder
- Diğer dosyalardaki ilgili fonksiyonları bulur
- En mantıklı öneriyi yapar

## 📊 Örnek Senaryo

### Dosya 1: `api.js`
```javascript
export function getUserById(userId) {
  return fetch(`/api/users/${userId}`);
}

export function createUser(userData) {
  return fetch('/api/users', { method: 'POST', body: JSON.stringify(userData) });
}

export class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}
```

### Dosya 2: `app.js` (Şu an açık)
```javascript
// AI getUserById fonksiyonunu bilir!
async function loadUser() {
  const user = await get
  // AI önerir: getUserById(123)
  // Çünkü api.js'de getUserById fonksiyonunu gördü
}

// AI User class'ını bilir!
const newUser = new U
// AI önerir: User('John', 'john@example.com')
// Çünkü api.js'de User class'ını gördü
```

## 🧪 Test Etme

### Adım 1: Test Dosyalarını Aç
```bash
# IDE'de bu dosyaları aç:
1. test-project-context.js  (fonksiyonlar ve class'lar tanımlı)
2. test-use-context.js      (bu fonksiyonları kullanacak)
```

### Adım 2: test-use-context.js'de Test Et
```javascript
// Şunu yaz ve bekle:
const user = await get

// AI şunu önermeli:
getUserById(123)

// Çünkü test-project-context.js'de getUserById fonksiyonunu gördü!
```

### Adım 3: Console'u İzle
```
[ProjectAnalyzer] Scanning project...
[ProjectAnalyzer] Found 10 code files
[ProjectAnalyzer] Project scan complete
[AIAutocomplete] PROJECT CONTEXT:
Available functions: getUserById(userId), createUser(userData), calculateTotal(items)...
Available classes: Product, ShoppingCart...
Available variables: API_BASE_URL, DEFAULT_CURRENCY...
```

## 🎨 Özellikler

### 1. Fonksiyon Önerileri
```javascript
// AI diğer dosyalardaki fonksiyonları önerir
async function loadData() {
  const result = await fetch
  // AI: fetchUserData(userId) [api.js]
}
```

### 2. Class Önerileri
```javascript
// AI diğer dosyalardaki class'ları önerir
const cart = new Shop
// AI: ShoppingCart() [cart.js]
```

### 3. Method Önerileri
```javascript
// AI class metodlarını bilir
const cart = new ShoppingCart();
cart.add
// AI: addItem(product, quantity) [cart.js]
```

### 4. Variable Önerileri
```javascript
// AI global değişkenleri bilir
const url = API
// AI: _BASE_URL [config.js]
```

## 📈 Performans

### Cache Sistemi
- İlk tarama: ~500ms (10 dosya için)
- Sonraki öneriler: ~0ms (cache'den)
- Cache süresi: 30 saniye
- Otomatik yenileme: Evet

### Limitler
- Maksimum dosya: 10 (performans için)
- Maksimum fonksiyon: 15 (prompt boyutu için)
- Maksimum class: 10
- Maksimum değişken: 20

## 🔧 Ayarlar

### Cache Süresini Değiştir
```javascript
// renderer/projectAnalyzer.js
this.scanInterval = 30000; // 30 saniye (değiştirilebilir)
```

### Dosya Limitini Değiştir
```javascript
// renderer/projectAnalyzer.js
for (const file of codeFiles.slice(0, 10)) { // 10 -> istediğiniz sayı
```

### Cache'i Manuel Temizle
```javascript
// Console'da:
window.aiAutocomplete.projectAnalyzer.clearCache();
```

## 🐛 Sorun Giderme

### AI diğer dosyaları görmüyor
1. Console'da şunu kontrol et:
   ```
   [ProjectAnalyzer] Found X code files
   ```
2. Eğer 0 ise, dosya yolu yanlış olabilir
3. Dosya uzantısı `.js`, `.jsx`, `.ts`, `.tsx` olmalı

### Öneriler yavaş geliyor
1. Cache süresini artır (30 saniye → 60 saniye)
2. Dosya limitini azalt (10 → 5)
3. Daha az fonksiyon göster (15 → 10)

### Cache güncellenmiyor
1. 30 saniye bekleyin
2. Veya manuel temizleyin:
   ```javascript
   window.aiAutocomplete.projectAnalyzer.clearCache();
   ```

## 💡 İpuçları

1. **Açıklayıcı isimler kullanın:**
   - İyi: `getUserById`, `calculateTotal`
   - Kötü: `get`, `calc`

2. **Export kullanın:**
   ```javascript
   export function myFunction() { ... }
   // AI bunu daha kolay bulur
   ```

3. **JSDoc ekleyin:**
   ```javascript
   /**
    * Gets user by ID
    * @param {number} userId
    */
   function getUserById(userId) { ... }
   // AI daha iyi anlar
   ```

4. **Tutarlı yapı:**
   - Benzer dosyaları aynı dizinde tutun
   - Mantıklı isimlendirme kullanın

## 🚀 Gelecek Özellikler

- [ ] TypeScript type definitions desteği
- [ ] JSDoc parsing
- [ ] Recursive directory scanning
- [ ] Import path resolution
- [ ] Semantic code search
- [ ] Function signature matching

---

Artık AI tüm projenizi biliyor! 🎉
