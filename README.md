# Keuangan Pribadi PWA

Aplikasi web mobile-first untuk mencatat pemasukan dan pengeluaran langsung ke spreadsheet Google Sheets yang sudah ada.

## Struktur file

- `index.html` — UI utama aplikasi
- `styles.css` — styling mobile-first glassmorphism
- `app.js` — logika aplikasi, filter, summary, dan integrasi frontend
- `manifest.json` — konfigurasi PWA
- `sw.js` — service worker untuk caching shell aplikasi
- `assets/icon.svg` — ikon aplikasi
- `apps-script/Code.gs` — backend Apps Script untuk Google Sheets

## Cara setup

1. Buka Google Apps Script di akun Google Anda.
2. Buat project baru.
3. Salin seluruh isi file `apps-script/Code.gs` ke editor Apps Script.
4. Simpan project dengan nama `KeuanganPribadi`.
5. Klik Deploy > New deployment.
6. Pilih type `Web app`.
7. Atur:
   - Execute as: Me
   - Who has access: Anyone with Google account
8. Klik Deploy. Copy URL hasil deployment.
9. Buka `app.js` dan ganti:
   - `PASTE_DEPLOYED_APPS_SCRIPT_URL_HERE`
   - dengan URL deployment yang sudah didapat.
10. Upload semua file ini (website statis) ke hosting gratis seperti GitHub Pages, Firebase Hosting, atau Netlify.
11. Pastikan `manifest.json` dan `sw.js` tersedia di root hosting.
12. Buka aplikasi dari browser dan tambahkan ke beranda HP.

## Catatan penting

- Pastikan sheet di spreadsheet Anda bernama persis: `Pemasukan` dan `Pengeluaran`.
- Struktur kolom yang didukung: `tanggal`, `kategori`, `nominal`, `catatan`.
- Aplikasi hanya menambahkan baris baru ke sheet yang sesuai. Data lama tidak diubah.
- Untuk keamanan, gunakan akun Google yang punya akses edit ke spreadsheet.

## Pengujian dasar

- Tambahkan transaksi pemasukan dan cek sheet `Pemasukan`.
- Tambahkan transaksi pengeluaran dan cek sheet `Pengeluaran`.
- Pastikan dashboard menampilkan total terbaru.
- Uji filter hari ini, minggu ini, bulan ini, custom.
- Uji riwayat pencarian dan filter kategori.
- Uji konfirmasi hapus.
- Uji install ke layar utama ponsel.

## Catatan deploy

Kalau Anda memilih GitHub Pages, file utama harus dapat diakses dari root repository. Anda bisa menaruh file aplikasi di branch `gh-pages` atau membuat folder publik.

## Mengenai keamanan

Akses yang dipakai adalah akun Google Anda. Apps Script tidak membagikan spreadsheet ke publik, hanya mengizinkan orang yang punya akun Google dan akses ke Web App untuk mengirim request.
