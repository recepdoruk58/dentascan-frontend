# 🦷 DentaScan - Klinik Kullanıcı Arayüzü

![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC.svg?logo=tailwind-css)

DentaScan Frontend, diş hekimleri ve klinikler için tasarlanmış, model çıkarımlarını gerçek zamanlı görselleştiren modern bir SPA (Single Page Application) projesidir.

## 🚀 Öne Çıkan Özellikler

* **Dinamik Bounding-Box Renderlama:** Backend'den gelen piksel bazlı koordinat verilerini, CSS-Grid mimarisine uygun şekilde yüzdelik (`%`) dilimlere çevirerek responsive (her ekrana uyumlu) kutu çizimi.
* **Durum Yönetimi (State Management):** React `useState` ve `useEffect` hook'ları ile geçmiş analizlerin önbelleğe alınması ve bileşenler arası veri aktarımı.
* **Modern UI/UX:** `shadcn/ui` bileşenleri ve `Lucide` ikon seti ile oluşturulmuş, kullanıcı yorgunluğunu azaltan temiz klinik arayüzü tasarımı.
* **Asenkron Veri Akışı:** Fetch API kullanılarak güvenlik başlıkları (`X-API-Key`) ve form-data yapısıyla dosya yükleme operasyonlarının yönetimi.

## ⚙️ Kurulum (Local Development)

```bash
git clone [https://github.com/recepdoruk58/dentascan-frontend.git](https://github.com/recepdoruk58/dentascan-frontend.git)
cd dentascan-frontend

# Paketleri kurun
npm install

# .env ortam değişkenini tanımlayın
echo 'VITE_API_KEY="BACKEND_API_SIFRESI"' > .env

# Vite sunucusunu başlatın
npm run dev
```
## 📂 Proje Yapısı (Component Architecture)
* **src/routes/index.tsx: Ana uygulama mantığı, sürükle-bırak (Drag & Drop) dosya yönetimi ve koordinat hesaplama algoritmaları (Core view).

* **src/components/ui/: Yeniden kullanılabilir, Tailwind tabanlı atomik tasarım bileşenleri (Butonlar, Kartlar vb.).

* **src/lib/: Yardımcı fonksiyonlar (Utility functions).

## 🔗 Bağımlılıklar (Dependencies)
Bu proje arka planda verileri işlemek için DentaScan Backend API servisine ihtiyaç duyar. Arayüzün çalışması için backend sunucusunun ayağa kaldırılmış olması zorunludur.
