# Finance Radar — Sistem Kontrol Keuangan Internal

Finance Radar adalah aplikasi web premium untuk mengontrol dan memonitor keuangan internal perusahaan, termasuk pengelolaan pengajuan dana operasional, realisasi, dan Petty Cash (kas kecil).

---

## 🚀 Fitur Baru & Perbaikan Bug (Changelog)

Berikut adalah daftar perbaikan dan peningkatan sistem yang telah diselesaikan:

1. **Fitur Edit Petty Cash Manual**:
   - Menambahkan tombol edit (ikon Pencil) untuk transaksi kas kecil yang dicatat secara manual (tidak melalui alur pengajuan / `refRequestId === null`).
   - Mendukung perubahan nominal, tipe transaksi (IN/OUT), deskripsi, kategori, departemen, penanggung jawab, serta pembaruan bukti nota/invoice.
2. **Rebranding ke Finance Radar**:
   - Mengubah seluruh title aplikasi dan logo menjadi **Finance Radar**.
3. **Visualisasi Petty Cash & Grafik**:
   - Menambahkan visualisasi grafik persentase penggunaan Petty Cash (Tersedia vs Terpakai) yang dinamis.
4. **Penerjemahan Kategori Kosong**:
   - Mengubah label laporan "Uncategorized" menjadi **"Tidak Terkategori"** agar lebih rapi.
5. **Perbaikan Hover Animasi**:
   - Menambahkan animasi transisi halus pada menu sidebar ketika disorot (hover).
6. **Perbaikan Tampilan Dark Mode**:
   - Memperbaiki visibilitas teks kategori saat disorot pada mode gelap.
7. **Sinkronisasi Laporan (Kategori ATK)**:
   - Memperbaiki bug sinkronisasi data transaksi manual agar tercatat secara akurat di Dashboard dan Laporan.

---

## 🛠️ Persyaratan Sistem

- **Node.js**: Versi 18 atau lebih baru.
- **Database**: MariaDB atau MySQL.
- **PM2** (Opsional untuk deployment): `npm install -g pm2`.

---

## 📥 Cara Instalasi & Menghubungkan ke Database

### 1. Kloning & Pengaturan Awal
Kloning repositori dan pastikan Anda berada di direktori proyek:
```bash
cd finflow-pro
```

### 2. Konfigurasi Database & Backend
Masuk ke direktori `backend/` dan pasang dependensi:
```bash
cd backend
npm install
```

Salin file contoh env atau buat file `.env` di folder `backend/`:
```env
PORT=5000
DATABASE_URL="mysql://username:password@localhost:3306/finflow_db"
JWT_SECRET="finflow_jwt_secret_key_2026_xyz"
JWT_REFRESH_SECRET="finflow_jwt_refresh_secret_key_2026_abc"
```
> **Catatan**: Sesuaikan `username`, `password`, dan nama database `finflow_db` dengan server MySQL/MariaDB Anda.

Jalankan push skema database Prisma untuk sinkronisasi tabel:
```bash
npx prisma db push
```

(Opsional) Lakukan seeding data awal (seperti akun admin default):
```bash
npm run db:seed
```

### 3. Konfigurasi Frontend
Masuk ke direktori `frontend/` dan pasang dependensi:
```bash
cd ../frontend
npm install
```

Bangun aset statis frontend untuk produksi:
```bash
npm run build
```

---

## 🚀 Cara Menjalankan Aplikasi

### Mode Pengembangan (Development)
Jalankan backend dan frontend secara bersamaan di terminal terpisah:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### Mode Produksi & Deployment (PM2)
Aplikasi ini sudah dilengkapi berkas `ecosystem.config.js` untuk memudahkan deployment menggunakan PM2 pada port **4002** (atau port lain yang Anda inginkan).

Untuk menjalankan/deploy otomatis menggunakan skrip deploy:
```bash
./deploy.sh
```

Atau jalankan PM2 secara manual:
```bash
pm2 start ecosystem.config.js
```
Aplikasi backend akan berjalan sebagai daemon service dan melayani API pada port yang didefinisikan (contoh: `PORT=4002`).
