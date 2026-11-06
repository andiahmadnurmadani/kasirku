# KasirKu POS (Sistem Kasir Modern) & Backend API

Aplikasi Point of Sale (POS) modern & kasir cepat berbasis web untuk restoran, kafe, dan ritel. Dilengkapi antarmuka responsif (React + Vite + Tailwind CSS), generator struk PDF, riwayat transaksi lengkap, dan backend API Express.js dengan database MySQL serta request logging menggunakan **Morgan**.

---

## 🚀 Fitur Utama

- **Katalog Menu Cepat**: Filter kategori dinamis (diambil dari database), pencarian instan, dan label item favorit.
- **Kelola Menu**: Tambah, ubah, dan hapus **produk** serta **kategori** langsung dari aplikasi (tab *Kelola Menu*). Semua konfirmasi & notifikasi memakai pop-up, tanpa `alert()` browser. Kategori yang masih berisi produk tidak bisa dihapus; mengganti slug kategori otomatis memindahkan produknya.
- **Keranjang Belanja POS (Cart)**: Hitung subtotal, pajak PPN/PB1 10%, total belanja, penyesuaian kuantitas cepat.
- **Pembayaran Cepat**: Mendukung metode **Tunai** (dengan kalkulator uang diterima & kembalian), **QRIS**, dan **Debit / Kartu**.
- **Cetak & Unduh Struk**: Generator struk kasir PDF otomatis (58mm/80mm POS slip) serta unduh laporan rekap transaksi.
- **Riwayat & Analitik**: Ringkasan omset total, total transaksi, item terjual, persentase metode pembayaran, dan rata-rata belanja.
- **Backend Express.js + MySQL**:
  - Arsitektur modular (`controllers`, `routes`, `config`, `middleware`).
  - ACID Transaction support untuk integritas penyimpanan pesanan & item belanja.
  - Auto-Migration & Auto-Seed saat pertama kali server dijalankan.
  - **Morgan HTTP Request Logger**: Pencatatan log permintaan HTTP secara terperinci (metode, status code, response time, timestamp, body).
  - Proxy terintegrasi dengan Vite untuk kelancaran koneksi front-end & back-end.

---

## 📁 Struktur Database MySQL (`kasirku_db`)

Format tabel disesuaikan 100% dengan kebutuhan dan antarmuka Front-End:

1. **`categories`**
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `slug`: VARCHAR(50) (makanan, minuman, snack, paket)
   - `name`: VARCHAR(100) (Makanan, Minuman, Cemilan, Paket Hemat)
   - `created_at`: TIMESTAMP

2. **`products`**
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `name`: VARCHAR(255)
   - `category`: VARCHAR(50)
   - `price`: INT
   - `popular`: TINYINT(1) (0 atau 1)
   - `image`: VARCHAR(500)
   - `desc`: TEXT
   - `created_at`, `updated_at`: TIMESTAMP

3. **`transactions`**
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `order_id`: VARCHAR(50) UNIQUE (contoh: `TRX-948102`)
   - `date`: VARCHAR(50) (contoh: `30 Okt 2026`)
   - `time`: VARCHAR(20) (contoh: `18:42`)
   - `customer`: VARCHAR(150)
   - `cashier`: VARCHAR(100)
   - `subtotal`: INT
   - `tax`: INT
   - `total`: INT
   - `method`: ENUM('cash', 'qris', 'debit')
   - `cash_given`: INT (opsional untuk tunai)
   - `change_amount`: INT (opsional untuk tunai)
   - `status`: ENUM('Selesai', 'Dibatalkan')
   - `created_at`: TIMESTAMP

4. **`transaction_items`**
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `transaction_id`: INT (Foreign Key ke `transactions.id`, ON DELETE CASCADE)
   - `product_id`: INT (Foreign Key ke `products.id`, ON DELETE SET NULL)
   - `name`: VARCHAR(255)
   - `price`: INT
   - `qty`: INT
   - `image`: VARCHAR(500)
   - `created_at`: TIMESTAMP

File SQL lengkap juga tersedia di:
- `database/schema.sql` (Struktur tabel)
- `database/seed.sql` (Data awal katalog menu & transaksi sampel)

---

## ⚙️ Konfigurasi Environment (`.env`)

Buat atau sesuaikan file `.env`:

```env
PORT=5000
NODE_ENV=development

# Konfigurasi Database MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kasirku_db

APP_URL=http://localhost:3000
```

---

## 🛠️ Cara Menjalankan

### 1. Pastikan Service MySQL Aktif
Nyalakan MySQL melalui **Laragon**, **XAMPP**, atau service MySQL lokal Anda di port `3306`.

Tanpa aplikasi Laragon, MySQL bawaan Laragon bisa dinyalakan langsung dari folder project (biarkan jendelanya terbuka):
```powershell
cd D:\Webinar\kasirku
.\scripts\start-mysql-laragon.cmd
```
Pastikan `DB_PASSWORD` di `.env` sama dengan password user `root` MySQL Anda.

**phpMyAdmin (opsional)**: untuk melihat/mengelola database lewat browser, jalankan di terminal lain lalu buka **http://localhost:8080** dan login dengan user `root`:
```powershell
cd D:\Webinar\kasirku
.\scripts\start-phpmyadmin.cmd
```
Skrip ini memakai PHP 8.3 dan phpMyAdmin 5.2 bawaan Laragon dengan web server bawaan PHP (tanpa Apache).

### 2. Jalankan Backend Server
```bash
# Menjalankan backend server
npm run server

# Atau mode development (auto-reload saat file berubah)
npm run server:dev
```
> Server akan otomatis membuat database `kasirku_db`, tabel-tabel, dan mengisi data awal (seeding) jika belum ada.  
> Anda juga dapat menjalankan inisialisasi database secara manual dengan: `npm run init-db`.

### 3. Jalankan Front-End
Buka terminal baru lalu jalankan:
```bash
npm run dev
```
Akses aplikasi melalui browser di **http://localhost:3000**.

---

## 📡 Dokumentasi Endpoint REST API

Semua request dicatat oleh **Morgan Logger** di console backend.

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Status server, uptime & koneksi MySQL |
| `GET` | `/api/products` | Mengambil semua produk (filter `category`, `search`, `popular`) |
| `GET` | `/api/products/:id` | Mengambil detail 1 produk berdasarkan ID |
| `POST` | `/api/products` | Menambahkan produk menu baru |
| `PUT` | `/api/products/:id` | Mengupdate data produk menu |
| `DELETE` | `/api/products/:id` | Menghapus produk menu |
| `GET` | `/api/transactions` | Mengambil semua riwayat transaksi beserta detail item |
| `GET` | `/api/transactions/summary/stats` | Mengambil ringkasan statistik (omset, transaksi, item) |
| `GET` | `/api/transactions/:identifier` | Mengambil transaksi berdasarkan ID atau orderId (`TRX-...`) |
| `POST` | `/api/transactions` | Menyimpan transaksi baru dari kasir POS |
| `PATCH`| `/api/transactions/:id/status` | Mengubah status transaksi (`Selesai` / `Dibatalkan`) |
| `GET` | `/api/categories` | Mengambil daftar kategori beserta jumlah produk |
| `GET` | `/api/categories/:id` | Mengambil detail 1 kategori |
| `POST` | `/api/categories` | Menambahkan kategori (`name`, `slug` opsional) |
| `PUT` | `/api/categories/:id` | Mengubah kategori (produk ikut pindah bila slug berubah) |
| `DELETE` | `/api/categories/:id` | Menghapus kategori (ditolak `409` bila masih dipakai produk) |
