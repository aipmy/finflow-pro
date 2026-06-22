#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Memulai Proses Deploy Finflow Pro ==="

# 1. Pull latest code
echo "--> Menarik kode terbaru dari repository..."
git pull origin main || echo "Peringatan: Gagal melakukan git pull, melanjutkan dengan kode lokal."

# 2. Install dependencies backend & jalankan database migration
echo "--> Memasang dependensi Backend..."
cd backend
npm install
echo "--> Menjalankan migrasi database..."
npx prisma db push --accept-data-loss || npx prisma migrate deploy
cd ..

# 3. Install dependencies frontend & build assets
echo "--> Memasang dependensi Frontend..."
cd frontend
npm install
echo "--> Membangun build produksi Frontend..."
npm run build
cd ..

# 4. Restart/Reload aplikasi dengan PM2
echo "--> Merestart proses PM2..."
if command -v pm2 &> /dev/null; then
    pm2 startOrReload ecosystem.config.js
    echo "--> Aplikasi berhasil di-deploy dan dijalankan dengan PM2!"
else
    echo "Peringatan: PM2 tidak ditemukan di server ini. Silakan jalankan backend manual dengan 'npm run dev' di folder backend."
fi

echo "=== Deploy Selesai ==="
