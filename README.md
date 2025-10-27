# KaanIDE

Electron tabanlı, yerel yapay zekâ destekli hafif IDE. Dosya gezgini (drawer), dosya işlemleri, proje bağlamı/özetleri ve Ollama üzerinden AI sohbet/yardım özellikleri içerir.

- Platform: Windows (10/11) — Electron
- AI Sağlayıcı: Ollama (localhost:11434)

## İçindekiler

- Özellikler
- Kurulum
- Çalıştırma
- Yapılandırma (AI modeli vb.)
- Kullanım
- Mimari ve klasör yapısı
- IPC/API referansı
- Güvenlik notları
- Sorun giderme
- Yol haritası
- Katkı ve lisans

---

## Özellikler

- Dosya gezgini (drawer)
  - Sol üstteki menü butonuyla paneli aç/kapat.
  - “Open Folder” ile proje klasörü seç ve içinde gez.
- Dosya işlemleri
  - Listeleme, okuma, kaydetme
  - Yeni dosya/klasör oluşturma
  - Dosya silme
- Proje bağlamı ve özetler
  - Kod dosyalarını tarama, basit istatistik/özet üretme
- Yapay zekâ (Ollama)
  - Soruları / talepleri “ask-ai” ile yerel modele gönderir
  - Model adı ortam değişkeniyle seçilebilir (varsayılan: llama3)
- Entegre komut çalıştırma
  - Yerel terminal komutlarını (execute-command) çalıştırma
- Dokümantasyon klasörü
  - Tüm .md dosyaları “docs/” altında toplanır ve koddan erişilebilir

---

## Kurulum

Önkoşullar
- Node.js 18+ (önerilir)
- npm 9+
- Ollama (AI özelliği için): https://ollama.com

Projeyi edinin ve bağımlılıkları yükleyin:
```powershell
# Mevcut klasöre gidin
cd d:\kaanide

# Bağımlılıklar
npm install
```

Ollama’yı hazırlayın (AI kullanacaksanız):
```powershell
# Ollama servis
ollama serve

# Bir model indirin (örnek)
ollama pull llama3
```

---

## Çalıştırma

Uygulamayı başlatın:
```powershell
npm start
```

Varsayılan olarak “llama3” modeli kullanılır. Başka bir model için tek seferlik:
```powershell
$env:AI_MODEL = "qwen2.5-coder"; npm start
```

---

## Yapılandırma

Ortam değişkenleri
- AI_MODEL: Ollama model adı
  - Varsayılan: llama3
  - Örnek: qwen2.5, mistral, codellama vb.

Ollama
- Sunucu: http://localhost:11434
- Endpoint: /api/generate
- İstekler NDJSON (satır başına JSON) akışı döndürür.

Zaman aşımı
- AI istekleri için 120 saniyelik (2 dk) istemci tarafı zaman aşımı bulunur.

---

## Kullanım

- Drawer (Dosya gezgini)
  - Sol üstteki ☰ butonuna tıklayarak paneli aç/kapatın.
  - “Open Folder” ile çalışılacak proje klasörünü seçin.
- Dosya işlemleri
  - Listelenen dosya/klasörlere tıklayarak içeriği görüntüleyin.
  - İçerikte değişiklik yaptıysanız kaydedin.
  - Yeni dosya/klasör oluşturabilir, dosya silebilirsiniz.
- AI (Sohbet/Yardım)
  - Sorularınızı girin; yanıtlar Ollama’daki seçili modelden gelir.
  - Büyük isteklerde ilk yanıt gelene kadar bekleyin (akış tamamlanınca toplanır).

Docs
- Proje kökünde “docs/” klasörü bulunur. Kod, bu klasöre standart bir IPC ile erişir.

---

## Mimari ve klasör yapısı

Klasör yapısı (özet):
```
d:\kaanide
├─ main.js               # Electron ana süreç, IPC handler’lar
├─ preload.js            # Güvenli köprü, window.api
├─ renderer\
│  ├─ index.html         # UI giriş noktası
│  ├─ index.js           # UI başlatma/olaylar
│  ├─ style.css          # Temel stil
│  ├─ fileManager.js     # Dosya gezgini/işlemleri
│  ├─ chat.js            # AI sohbet/istek akışı
│  ├─ projectAnalyzer.js # Proje bağlamı ve tarama
│  └─ contextManager.js  # Dosya özetleri (hızlı, statik)
└─ docs\                 # Markdown dokümantasyonları
```

Ana bileşenler
- main.js
  - Pencere oluşturur, preload’u bağlar.
  - IPC handler’lar: dizin seçme, listeleme/okuma/yazma, AI, komut çalıştırma vb.
- preload.js
  - contextIsolation: true, nodeIntegration: false
  - Sadece ihtiyaç duyulan IPC’leri window.api üzerinde açar.
- renderer/*
  - index.html + index.js: UI yaşam döngüsü
  - fileManager.js: gezgin, panel toggle, dosya işlemleri
  - chat.js: ask-ai çağrısı ve UI bağları
  - projectAnalyzer.js + contextManager.js: hızlı özet/bağlam

---

## IPC / API Referansı

Renderer’dan window.api ile erişilir (preload.js köprüler).

- selectDirectory(): Promise<string|null>
  - Klasör seçme diyalogu açar.
- listFiles(dirPath: string): Promise<Array<{name,path,isDir}>> 
  - Dizin içeriğini listeler.
- getCwd(): Promise<string>
  - Çalışma dizinini döndürür.
- readFile(filePath: string): Promise<string>
  - Dosya içeriğini okur (utf8).
- getFileStats(filePath: string): Promise<{mtime: string}>
  - Dosya metadata (ör. son değişiklik).
- saveFile(filePath: string, content: string): Promise<{success: boolean}>
  - Dosyayı yazar.
- createFile(filePath: string, content?: string): Promise<{success: boolean, path: string}>
  - Yeni dosya oluşturur.
- deleteFile(filePath: string): Promise<{success: boolean}>
  - Dosyayı siler.
- createDirectory(dirPath: string): Promise<{success: boolean, path: string}>
  - Klasör oluşturur.
- executeCommand(command: string): Promise<{success: boolean, stdout: string, stderr: string, error?: string}>
  - Sistem komutu çalıştırır (Windows cmd üzerinden).
- getDocsDir(): Promise<string>
  - docs/ klasör yolunu verir (yoksa oluşturur).
- askAI(prompt: string): Promise<string>
  - Ollama /api/generate ile metin yanıtı üretir.

Örnek kullanım:
```js
const dir = await window.api.selectDirectory();
if (dir) {
  const entries = await window.api.listFiles(dir);
  const readme = entries.find(e => e.name.toLowerCase() === "readme.md");
  if (readme) {
    const text = await window.api.readFile(readme.path);
    console.log(text);
  }
}
```

---

## Güvenlik

- contextIsolation: true, nodeIntegration: false
- Sadece preload üzerinden sınırlı API’ler açılır.
- Yol doğrulama ve normalize etme (list-files vb.) yapılır.
- execute-command güçlü bir yetkidir: Sadece güvendiğiniz projelerde çalıştırın.

---

## Sorun Giderme

Ollama bağlantı hatası
- Hata: “Cannot connect to Ollama. Make sure it's running: ollama serve”
  - Çözüm:
    - Ayrı terminalde “ollama serve” çalıştığından emin olun.
    - http://localhost:11434/ yanıt veriyor mu kontrol edin.
    - Model yüklü mü? “ollama pull llama3”.

Boş AI yanıtı / akış hatası
- Büyük isteklerde akış çok satır döndürebilir; yanıt toplanana kadar bekleyin.
- 120 sn’de zaman aşımı olur; prompt’u küçültün veya modeli değiştirin.

Erişim / izin hataları
- “Access denied to directory…”
  - Yönetici izni gerektirebilir veya korumalı bir klasör olabilir. Kullanıcı alanı klasörleri seçin.

Drawer görünmüyor
- Görünüm menüsünden yenileyin (Ctrl+R).
- Sol üstteki ☰ düğmesini tıklayın; panel genişliği 0 ⇆ sabit genişlik arasında animasyonla değişir.

Open Folder kapanmıyor
- Klasörü seçip “Select Folder” yaptığınızda diyalog kapanır.
- Kapanmıyorsa uygulamayı yeniden başlatın ve tek tıklamayla deneyin.

## Katkı

- Fork → Dal aç → Değişiklik → PR
- Kod stili: Basit, açık, yan etkileri log’layın.
- PR’da ekran görüntüsü veya kısa açıklama ekleyin.

---

## Lisans

ISC lisansı altında dağıtılır. Ayrıntılar için LICENSE dosyasına bakın.
