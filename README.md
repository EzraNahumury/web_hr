# Panduan Penggunaan Sistem Web HR — AvA Group

> **Versi Dokumen:** 2.0 | **Berlaku untuk:** Seluruh Karyawan, Supervisor, Admin
> Dokumen ini mencakup seluruh alur penggunaan sistem, aturan yang berlaku, dan panduan lengkap per peran (role).

---

## Daftar Isi

1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Peran & Hak Akses](#2-peran--hak-akses)
3. [Alur Karyawan (Staff)](#3-alur-karyawan-staff)
   - [Login](#31-login)
   - [Presensi Masuk (Check-In)](#32-presensi-masuk-check-in)
   - [Presensi Pulang (Check-Out)](#33-presensi-pulang-check-out)
   - [Pengajuan Lembur](#34-pengajuan-lembur)
   - [Pengajuan Pinjaman](#35-pengajuan-pinjaman)
   - [Slip Gaji & Slip Bonus](#36-slip-gaji--slip-bonus)
   - [Reimburse & Perjalanan Dinas](#37-reimburse--perjalanan-dinas)
   - [Riwayat Absensi](#38-riwayat-absensi)
   - [Informasi Kontrak](#39-informasi-kontrak)
4. [Alur Supervisor (SPV) & Manager](#4-alur-supervisor-spv--manager)
   - [Set Jadwal](#41-set-jadwal)
   - [Approval Lembur](#42-approval-lembur)
5. [Alur Admin](#5-alur-admin)
   - [Manajemen Karyawan](#51-manajemen-karyawan)
   - [Kelola Absensi](#52-kelola-absensi)
   - [Set Jadwal (Admin)](#53-set-jadwal-admin)
   - [Manajemen Lembur](#54-manajemen-lembur)
   - [Manajemen Pinjaman](#55-manajemen-pinjaman)
   - [Summary Payroll](#56-summary-payroll)
   - [Summary Payroll Solo](#57-summary-payroll-solo)
   - [Payroll Penjahit](#58-payroll-penjahit)
   - [Payroll Sales Nasional](#59-payroll-sales-nasional)
   - [Slip Gaji & Distribusi](#510-slip-gaji--distribusi)
   - [Finance](#511-finance)
   - [Manajemen Role (Admin & SPV)](#512-manajemen-role-admin--spv)
6. [Aturan & Ketentuan Sistem](#6-aturan--ketentuan-sistem)
   - [Aturan Presensi](#61-aturan-presensi)
   - [Shift & Jam Kerja](#62-shift--jam-kerja)
   - [Geofence (Batas Lokasi)](#63-geofence-batas-lokasi)
   - [Aturan Lembur](#64-aturan-lembur)
   - [Aturan Pinjaman](#65-aturan-pinjaman)
   - [Aturan Periode Payroll](#66-aturan-periode-payroll)
7. [Kode Status Presensi](#7-kode-status-presensi)
8. [Tabel Ringkasan Hak Akses](#8-tabel-ringkasan-hak-akses)
9. [FAQ & Catatan Penting](#9-faq--catatan-penting)

---

## 1. Gambaran Umum Sistem

**Web HR AvA Group** adalah sistem manajemen sumber daya manusia berbasis web yang mencakup:

- **Presensi digital** — check-in & check-out berbasis selfie + GPS
- **Manajemen jadwal shift** — pengaturan jadwal harian oleh SPV/Admin
- **Pengajuan & approval lembur** — alur 1x atau 2x approve sesuai pengajuan
- **Pinjaman karyawan** — pengajuan, cicilan otomatis terintegrasi payroll
- **Payroll & slip gaji** — perhitungan gaji otomatis dari data presensi real-time
- **Reimburse & perjalanan dinas** — pengajuan penggantian biaya
- **Laporan kunjungan** — untuk staf sales

Sistem ini **menggunakan zona waktu Asia/Jakarta (WIB)** untuk seluruh pencatatan waktu.

---

## 2. Peran & Hak Akses

Terdapat **3 jenis akun** dalam sistem:

| Peran | Keterangan | Login Via |
|-------|------------|-----------|
| **Karyawan (Staff)** | Presensi, lembur, pinjaman, slip gaji | Halaman utama (login karyawan) |
| **Supervisor / Manager** | Set jadwal + approval lembur tim | Login SPV (link khusus) atau otomatis muncul di menu karyawan |
| **Admin** | Akses penuh ke seluruh sistem | Login admin (link khusus) |

> **Catatan:** Supervisor dan Manager yang statusnya karyawan aktif tetap bisa login sebagai karyawan untuk presensi pribadi. Menu Set Jadwal dan Approval Lembur akan muncul otomatis di menu karyawan mereka.

---

## 3. Alur Karyawan (Staff)

### 3.1 Login

1. Buka alamat sistem Web HR AvA Group di browser.
2. Masukkan **email** dan **password** akun karyawan.
3. Jika berhasil, akan diarahkan ke dashboard karyawan.

> **Lupa password?** Hubungi Admin HR untuk reset password.

---

### 3.2 Presensi Masuk (Check-In)

**Menu:** Presensi → Presensi Masuk

#### Langkah-langkah:

1. Buka halaman **Presensi Masuk**.
2. Pilih **jenis presensi**:

   | Pilihan | Kode | Syarat |
   |---------|------|--------|
   | **Masuk (Hadir)** | O | Selfie + Lokasi GPS |
   | **Izin / Off** | I | Wajib isi keterangan |
   | **Sakit + Surat** | S | Upload bukti surat sakit |
   | **Sakit (tanpa surat)** | SX | Wajib isi keterangan alasan sakit |
   | **Setengah Hari** | H | Selfie + Lokasi GPS |

3. Untuk **Masuk / Setengah Hari**:
   - Izinkan akses **kamera** dan **lokasi GPS** di browser.
   - Tunggu sampai lokasi terdeteksi (akurasi muncul).
   - Ambil **selfie** (bisa pilih filter kamera).
   - Klik **Kirim Presensi Masuk**.

4. Untuk **Izin / Sakit tanpa surat**:
   - Isi kolom **keterangan** dengan alasan yang jelas.
   - Klik **Kirim**.

5. Untuk **Sakit + Surat**:
   - Upload file surat sakit (JPG, PNG, PDF).
   - Klik **Kirim**.

#### Aturan Check-In:
- **Hanya bisa 1x sehari** — tidak bisa mengubah atau mengulang setelah terkirim.
- Jika sudah presensi sakit/izin, tidak bisa check-in lagi di hari yang sama.
- Jika karyawan Toko/Gudang/Media/JNE, sistem akan memvalidasi jam check-in sesuai shift terjadwal.
- Jika jadwal hari itu adalah **libur**, sistem akan menolak presensi masuk.

#### Karyawan Terlambat:
- Sistem otomatis menghitung keterlambatan (menit) dari jam mulai shift.
- Keterlambatan tercatat di rekap absensi dan dapat mempengaruhi potongan gaji.

---

### 3.3 Presensi Pulang (Check-Out)

**Menu:** Presensi → Presensi Pulang

#### Langkah-langkah:

1. Buka halaman **Presensi Pulang**.
2. Izinkan akses **kamera** dan **lokasi GPS**.
3. Ambil **selfie** check-out.
4. Klik **Kirim Presensi Pulang**.

#### Aturan Check-Out:
- Harus sudah melakukan check-in terlebih dahulu di hari yang sama.
- Tidak bisa check-out jika status hari ini adalah sakit atau izin (tidak diperlukan).
- **Pulang Awal (PA):** Jika pulang sebelum jam checkout shift, sistem **wajib meminta keterangan alasan**. Tanpa keterangan, presensi pulang tidak bisa dikirim.
- Lokasi saat check-out juga divalidasi dengan geofence (harus dalam radius kantor/penempatan).
- Untuk karyawan Toko/Gudang/Media/JNE, sistem otomatis mendeteksi dan menyimpan shift berdasarkan jam masuk dan jam pulang.

---

### 3.4 Pengajuan Lembur

**Menu:** Data Lembur

#### Field Wajib (untuk Semua Karyawan):

1. **Tanggal Lembur**
2. **Jam Mulai** dan **Jam Selesai**
3. **Diajukan Ke** (Atasan Penyetuju)
4. **Jenis Pekerjaan** (text — contoh: packing order, finishing produk)
5. **Deadline** (tanggal target penyelesaian)
6. **Catatan / Alasan Lembur** (opsional)
7. **Bukti Lembur** (file opsional)

#### Field Tambahan Khusus Divisi Produksi:

Jika karyawan dari divisi **Produksi**, akan muncul section tambahan dengan field wajib:

| Field | Tipe | Keterangan |
|-------|------|------------|
| **Nama Order** | Text | Contoh: Order #1234 — Pesanan PT XYZ |
| **Jumlah QTY** | Angka | Total kuantitas order |
| **Target Sebelum Lembur** | Angka | Target yang sudah dicapai sebelum lembur |
| **Target Setelah Lembur** | Angka | Target yang akan dicapai dengan lembur |

> Field produksi hanya muncul untuk karyawan dengan `divisi = Produksi`. Untuk divisi lain, field ini disembunyikan.

#### Dropdown "Diajukan Ke" Berdasarkan Jabatan Pengaju:

| Pengaju | Pilihan Atasan |
|---------|----------------|
| **Staff** | Supervisor individu + SPV individu + 1 opsi generic **ADMIN** |
| **Supervisor** | Manager individu + 1 opsi generic **ADMIN** |
| **Manager** | Otomatis **ADMIN** (tanpa dropdown) |

> Opsi **ADMIN** generic artinya pengajuan masuk ke pool semua admin — admin manapun bisa approve. Tidak perlu pilih admin spesifik.

#### Status Pengajuan Lembur:

| Status | Keterangan |
|--------|-----------|
| **Pending** | Menunggu persetujuan atasan/admin |
| **Approved** | Disetujui — jam lembur masuk ke payroll |
| **Rejected** | Ditolak |

#### Alur Approval Berdasarkan Pengajuan:

**1x Approval (Langsung Admin):**
- Pengaju memilih opsi **ADMIN** sebagai penyetuju
- Manager submit (otomatis ke admin)
- Admin approve → langsung selesai

**2x Approval (Via Atasan):**
- Staff submit ke Supervisor/SPV → Supervisor/SPV approve → kemudian admin approve → selesai
- Supervisor submit ke Manager → Manager approve → kemudian admin approve → selesai

> Status di riwayat akan menampilkan:
> - **"Menunggu approval atasan"** — atasan belum putuskan
> - **"Disetujui atasan, menunggu admin"** — atasan sudah approve, admin belum
> - **"Approved"** — final, semua approval selesai
> - **"Rejected"** — ditolak di salah satu tahap

#### Aturan Lembur:
- Durasi lembur harus **lebih dari 0 jam**.
- Jenis Pekerjaan dan Deadline **wajib diisi**.
- 4 field tambahan Produksi **wajib diisi** untuk karyawan divisi Produksi.
- Setelah diputuskan (approved/rejected), **tidak bisa diubah**.

---

### 3.5 Pengajuan Pinjaman

**Menu:** Status Pinjaman

#### Syarat Pengajuan:

| No | Syarat | Keterangan |
|----|--------|-----------|
| 1 | **Masa kerja minimal 6 bulan** | Dihitung dari tanggal masuk pertama |
| 2 | **Tidak ada pinjaman aktif** | Tidak bisa mengajukan jika masih ada pinjaman berjalan atau pending |
| 3 | **Cooldown 3 bulan setelah lunas** | Contoh: Pinjaman lunas Januari → bisa ajukan kembali mulai April |
| 4 | **Maksimal Rp 3.000.000** | Batas pengajuan mandiri karyawan |

> **Butuh pinjaman lebih dari Rp 3.000.000 atau situasi darurat?** Admin dapat langsung memberikan pinjaman tanpa batas nominal untuk kondisi khusus (misalnya kecelakaan, kedaruratan). Hubungi Admin HR.

#### Langkah-langkah:

1. Buka halaman **Status Pinjaman**.
2. Isi form:
   - **Jumlah Pinjaman** (maks Rp 3.000.000)
   - **Jumlah Angsuran** (berapa bulan cicilan)
   - **Tanggal Pengajuan**
3. Sistem otomatis menampilkan **Preview Potongan per Bulan**.
4. Klik **Ajukan Pinjaman**.

#### Alur Setelah Pengajuan:

```
Pengajuan Karyawan
       ↓
   [Pending]  ← Menunggu Admin
       ↓
   [Approved] ← Admin setujui, jadwal cicilan dibuat otomatis
       ↓
   [Berjalan] ← Cicilan pertama dipotong bulan berikutnya
       ↓
   [Lunas]    ← Semua cicilan selesai terbayar
```

#### Cara Membaca Jadwal Cicilan:
- Setiap bulan cicilan tampil sebagai badge (hijau = sudah dipotong, abu-abu = belum).
- Potongan otomatis masuk ke payroll sesuai jadwal.
- Karyawan bisa memantau sisa pinjaman di halaman Status Pinjaman.

---

### 3.6 Slip Gaji & Slip Bonus

**Menu:** Slip Gaji / Slip Bonus

- Karyawan dapat **melihat dan mengunduh** slip gaji per periode.
- Slip bonus tersedia terpisah jika ada pembayaran bonus.
- Slip hanya tersedia setelah Admin mendistribusikannya.
- Format slip dapat dicetak atau disimpan sebagai PDF.
- Header slip resmi: **AvA Group**.

---

### 3.7 Reimburse & Perjalanan Dinas

**Menu:** Pengajuan Reimburse / Perjalanan Dinas

#### Reimburse:
1. Buka **Pengajuan Reimburse**.
2. Isi detail pengeluaran dan upload bukti (struk/nota).
3. Kirim — menunggu persetujuan Admin.

#### Perjalanan Dinas:
1. Buka **Perjalanan Dinas**.
2. Isi tujuan, tanggal, dan keperluan.
3. Kirim — menunggu persetujuan Admin.

---

### 3.8 Riwayat Absensi

**Menu:** Riwayat Absensi

- Karyawan dapat melihat rekap presensi pribadi per periode.
- Tampil: tanggal, jam masuk, jam pulang, status, kode, keterangan.
- **PA (Pulang Awal)** ditampilkan beserta keterangan yang diisi karyawan.

---

### 3.9 Informasi Kontrak

**Menu:** Informasi Kontrak

- Menampilkan detail kontrak kerja dan potongan kontrak yang berlaku.
- Data ini diisi oleh Admin dan bersifat read-only bagi karyawan.

---

## 4. Alur Supervisor (SPV) & Manager

Supervisor dan Manager memiliki **dua fungsi utama** yang berbeda dari staf biasa:

> Jika login sebagai karyawan, menu **Set Jadwal** dan **Approval Lembur** akan muncul otomatis di menu karyawan untuk Supervisor dan Manager.
> Jika login sebagai SPV (link login khusus SPV), hanya tersedia 2 menu ini.

---

### 4.1 Set Jadwal

**Menu:** Set Jadwal

**Siapa yang bisa set jadwal:**
- Supervisor (jabatan mengandung kata "supervisor")
- Manager (jabatan mengandung kata "manager")
- Admin
- Karyawan tertentu yang di-whitelist oleh sistem

#### Langkah-langkah:

1. Pilih **bulan dan tahun** periode jadwal.
2. Jadwal ditampilkan dalam format tabel kalender.
3. Klik sel pada tabel (baris = karyawan, kolom = tanggal) untuk mengisi shift.
4. Pilih shift yang sesuai dari dropdown.
5. Simpan perubahan.

#### Daftar Shift yang Tersedia:

| Kode Shift | Window Check-In | Window Check-Out |
|-----------|----------------|-----------------|
| **pagi** | 08:00 – 08:30 | 16:30 – 17:30 |
| **siang** | 11:45 – 12:00 | 20:00 – 21:00 |
| **lembur** | 09:45 – 10:00 | 20:00 – 21:00 |
| **setengah_1** | 10:30 – 13:00 | 16:30 – 17:30 |
| **setengah_2** | 08:00 – 08:30 | 12:00 – 13:00 |
| **pagi_full** | 08:00 – 08:30 | 16:30 – 17:30 |
| **pagi_short** | 08:00 – 08:30 | 14:30 – 15:30 |
| **siang_sore** | 11:45 – 12:00 | 16:30 – 17:30 |
| **jne_pagi** | 07:30 – 11:00 | 15:30 – 16:30 |
| **jne_siang** | 13:30 – 17:00 | 20:30 – 21:30 |
| **jne_minggu** | 12:30 – 14:00 | 19:30 – 20:30 |
| **libur** | — | — |

#### Aturan Shift per Penempatan:

| Penempatan | Shift yang Diperbolehkan |
|-----------|--------------------------|
| **Toko Solo** | pagi, libur |
| **JNE** | jne_pagi, jne_siang, jne_minggu, libur |
| **Media** (sub divisi) | pagi, siang, libur |
| **Lainnya** | pagi, siang, lembur, setengah_1, setengah_2, libur |

---

### 4.2 Approval Lembur

**Menu:** Approval Lembur

#### Langkah-langkah:

1. Buka halaman **Approval Lembur**.
2. Lihat daftar pengajuan lembur yang ditujukan kepada Anda.
3. Klik detail pengajuan untuk melihat informasi lengkap.
4. Pilih **Approve** atau **Reject**.
5. Isi **catatan atasan** (opsional, tapi disarankan saat menolak).
6. Konfirmasi keputusan.

#### Sistem 2x Approval untuk SPV / Manager:

Atasan (SPV, Supervisor, Manager) yang menerima pengajuan dari bawahan **adalah tahap pertama approval**. Setelah Anda approve:

- Pengajuan **belum final** — masih masuk ke admin untuk approval kedua
- Status di sisi atasan: **"Anda sudah approve, menunggu admin"**
- Setelah admin approve → final, jam lembur masuk ke payroll
- Setelah admin reject → pengajuan rejected meskipun Anda sudah approve

> Jika atasan **reject**, pengajuan langsung final di status rejected (skip admin).

#### Aturan:
- Hanya bisa approve/reject pengajuan yang **ditujukan kepada Anda**.
- Keputusan bersifat **final** untuk tahap atasan — tidak bisa diubah.
- Sistem mencatat siapa atasan yang approve di stage 1.

---

## 5. Alur Admin

Admin memiliki akses penuh ke seluruh modul sistem. Berikut panduan per modul:

---

### 5.1 Manajemen Karyawan

**Menu:** Data Karyawan

**Yang bisa dilakukan Admin:**
- Tambah karyawan baru
- Edit data karyawan (nama, jabatan, divisi, penempatan, tanggal masuk, dll.)
- Nonaktifkan karyawan (status: nonaktif)
- Upload & **download** foto KTP karyawan (tombol Buka Dokumen / Download)
- Atur bank & nomor rekening untuk transfer gaji

> **Karyawan nonaktif** tidak akan muncul di summary payroll periode berikutnya setelah dinonaktifkan.

---

### 5.2 Kelola Absensi

**Menu:** Absensi

**Yang bisa dilakukan Admin:**
- Melihat rekap absensi seluruh karyawan
- Filter berdasarkan periode, unit, penempatan, nama
- Klik sel berisi data → modal **Detail Absensi**: lihat jam masuk/pulang, foto selfie, latitude/longitude, peta lokasi
- Klik sel kosong (`-`) → modal Detail Absensi dengan mode **Set Kode** untuk input absensi manual
- **Ubah kode absensi** lewat dropdown di modal (untuk koreksi data)
- Melihat keterangan **Pulang Awal (PA)** yang diisi karyawan

**Kode di Lembar Absensi:**

| Kode | Arti |
|------|------|
| **O** | Hadir tepat waktu |
| **T** | Terlambat |
| **I** | Izin / Off |
| **S** | Sakit (dengan surat) |
| **SX** | Sakit (tanpa surat) |
| **H** | Setengah Hari |
| **PA** | Pulang Awal |
| **L** | Libur |
| **A** | Alfa (tidak hadir tanpa keterangan) |

---

### 5.3 Set Jadwal (Admin)

**Menu:** Set Jadwal

- Admin dapat mengatur jadwal shift untuk **semua karyawan** tanpa batasan.
- Prosedur sama dengan SPV (lihat [4.1 Set Jadwal](#41-set-jadwal)).
- Admin juga dapat menghapus jadwal yang sudah diset.

---

### 5.4 Manajemen Lembur

**Menu:** Lembur

#### Tampilan Halaman Admin Overtime:

Admin disediakan **2 tab filter** untuk membedakan jenis pengajuan:

| Tab | Berisi | Catatan |
|-----|--------|---------|
| **Langsung ke Admin** | Pengajuan single-approve — admin satu-satunya yang putuskan | Pengajuan dari Manager ATAU pengajuan yang dipilih "ADMIN" generic |
| **Via Atasan (2x Approve)** | Pengajuan dengan alur 2 tahap — sudah/sedang di atasan | Kolom tambahan: **Approval Atasan** (Disetujui/Ditolak/Menunggu) |

Setiap tab punya **count badge** menampilkan jumlah pengajuan.

#### Action di Setiap Baris Pengajuan:

| Tombol | Fungsi |
|--------|--------|
| **Icon Detail (i)** | Buka modal popup berisi seluruh field pengajuan |
| **Approve** | Setujui pengajuan |
| **Reject** | Tolak pengajuan |

#### Modal Detail Pengajuan:

Klik tombol **Detail (i)** → modal menampilkan:
- Tanggal lembur, jam mulai-selesai, total jam
- **Jenis pekerjaan** & **deadline**
- **Detail Produksi** (jika ada): Nama Order, Jumlah QTY, Target Sebelum/Setelah Lembur
- **Stage 1 — Approval Atasan** (jika via atasan): siapa, kapan, status
- Catatan karyawan & catatan atasan

#### Aturan Approve Admin:

- **Single approve**: Admin bisa langsung approve/reject pengajuan
- **Via atasan (2x approve)**:
  - Admin **TIDAK BISA approve** jika atasan belum approve (tombol disabled, tooltip "Atasan belum menyetujui")
  - Setelah atasan approve, admin baru bisa approve untuk finalisasi

#### Setelah Diputuskan:

- Lembur **Approved** otomatis masuk ke rekap jam lembur karyawan dan payroll
- Lembur **Rejected** tidak dihitung di payroll
- Keputusan **final** — tidak bisa diubah

---

### 5.5 Manajemen Pinjaman

**Menu:** Pinjaman

#### A. Membuat Pinjaman untuk Karyawan (Tanpa Batas Nominal)

Admin dapat langsung membuat pinjaman untuk kondisi darurat tanpa batas Rp 3 juta:

1. Klik **Tambah Pinjaman**.
2. Pilih karyawan dari dropdown.
3. Isi nominal pinjaman, jumlah angsuran, dan tanggal pengajuan.
4. Klik **Simpan**.

> Pinjaman yang dibuat Admin langsung masuk dalam status **pending** dan perlu di-approve.

#### B. Approve / Reject Pinjaman

1. Klik pinjaman dengan status **Pending**.
2. Pilih **Approve** → sistem otomatis membuat jadwal cicilan mulai bulan depan.
3. Pilih **Reject** untuk menolak.

#### C. Pelunasan Awal

1. Klik pinjaman aktif (approved/berjalan).
2. Pilih **Lunasi Sekarang**.
3. Pilih bulan target pelunasan.
4. Sisa pinjaman dikonsolidasi ke bulan tersebut; bulan lain diset 0.

#### D. Melihat Progress Cicilan

- Setiap baris pinjaman menampilkan badge per bulan (hijau = sudah dipotong, abu-abu = belum).
- Admin dapat memonitor sisa pinjaman dan total yang sudah dibayar.

---

### 5.6 Summary Payroll

**Menu:** Summary Payroll

**Periode Payroll:**
- Dimulai dari tanggal **26 bulan sebelumnya** hingga tanggal **25 bulan berjalan**.
- Contoh: Periode Juni = 26 Mei – 25 Juni.
- Sistem otomatis masuk ke periode bulan berikutnya jika tanggal sudah melewati tanggal 25.

#### Karyawan yang Tampil:
- ✅ Semua karyawan aktif
- ❌ **Karyawan penempatan Toko Solo** — tampil di [Summary Payroll Solo](#57-summary-payroll-solo) (terpisah)
- ❌ **Karyawan sub_divisi Penjahit** — tampil di [Summary Penjahit](#58-payroll-penjahit) (terpisah)

#### Pewarnaan Header Tabel:

Header kolom dikelompokkan dengan **warna** agar mudah dibaca:

| Warna | Kelompok | Kolom |
|-------|----------|-------|
| 🔴 **Merah** | Penerimaan tetap | Nominal Tetap (Insentif Kehadiran, Tunjangan Jabatan, Uang Makan, Subsidi, Uang Kerajinan, BPJS, Bonus Performa) + Gaji Kontrak |
| 🟠 **Orange** | Kehadiran | Hari Kerja, Masuk |
| 🟡 **Kuning** | Absensi/Potongan | Izin, Sakit, Setengah Hari, Telat, Total Potongan |
| 🌐 **Cyan** | Lainnya | Identitas, Total Gaji Pokok, Lembur, Tambahan, Take Home Pay Sebelum Dipotong, Take Home Pay |

#### Urutan Kolom (Bagian Kanan):

```
... → Total Gaji → Tambahan → Total Potongan
    → Gaji Kontrak
    → Take Home Pay Sebelum Dipotong
    → Take Home Pay
    → Aksi
```

#### Penamaan Kolom (Versi Baru):

| Lama | Baru |
|------|------|
| Gaji Pokok | **Gaji Kontrak** |
| Gaji Pokok Perhari / Perjam | **Insentif Kehadiran** |
| Penerimaan Bersih | **Take Home Pay** |
| Total Gaji Sebelum Potongan | **Take Home Pay Sebelum Dipotong** |
| Potongan Uang Kerajinan | **Potongan Absensi** |

#### Fitur Halaman:

##### A. Melihat & Mengedit Data Payroll
- Lihat summary gaji seluruh karyawan per periode.
- Filter berdasarkan nama, unit, jabatan, status.
- Data **real-time** — otomatis update setiap karyawan presensi atau lembur diapprove.

##### B. Input Manual / Override
Admin dapat mengisi atau mengoverride nilai berikut per karyawan:

| Field Override | Keterangan |
|---------------|-----------|
| Jumlah masuk | Koreksi hari hadir |
| Jam lembur | Koreksi jam lembur |
| Setengah hari | Koreksi setengah hari |
| Gaji pokok | Koreksi nominal gaji |

##### C. Konfigurasi Gaji per Karyawan

Admin mengatur komponen gaji masing-masing karyawan:

| Komponen | Keterangan |
|----------|-----------|
| Gaji pokok per hari | Dasar perhitungan gaji harian |
| Uang makan per hari | Tunjangan makan harian |
| Uang kerajinan | Bonus kerajinan bulanan |
| BPJS | Potongan BPJS |
| Bonus performa | Bonus kinerja |
| Insentif | Insentif bulanan |
| Kendaraan | Tunjangan kendaraan |

##### D. Komponen Otomatis (Dihitung Sistem)

| Komponen | Sumber Data |
|----------|------------|
| Jumlah masuk | Data absensi real-time |
| Terlambat | Rekap menit telat dari absensi |
| Potongan keterlambatan | Tarif × menit telat |
| Jam lembur | Dari lembur yang diapprove |
| Upah lembur | Dihitung dari jam lembur |
| Potongan pinjaman | Dari jadwal cicilan bulan ini |
| Total potongan | Penjumlahan semua potongan |
| Take Home Pay | Total pendapatan – total potongan |

##### E. Hari Kerja

- Dihitung otomatis dari range tanggal periode (Senin–Sabtu, tidak termasuk Minggu).
- Nilai konsisten untuk semua karyawan dalam satu periode.

##### F. Input Omzet Bulanan

- Admin input omzet bulanan untuk unit **AVA+Ayres** (× 0.7% otomatis untuk bonus) dan **JNE** (manual / custom bonus).
- Bonus omzet didistribusikan ke karyawan sales sesuai aturan unit.

---

### 5.7 Summary Payroll Solo

**Menu:** Summary Payroll Solo

Halaman ini **mirror** dari Summary Payroll utama, tapi:

| Aspek | Bedanya |
|-------|---------|
| **Karyawan yang tampil** | Hanya yang `penempatan = Toko Solo` |
| **Karyawan di Summary utama** | Karyawan Toko Solo **TIDAK** tampil di Summary Payroll utama |
| **Pewarnaan header & layout** | Identik dengan Summary Payroll utama |
| **Input Omzet Bulanan** | Hanya 1 unit: **Toko Solo** — input manual, **tidak pakai rumus persentase** (nominal yang di-input = bonus langsung) |
| **Form input gaji per karyawan** | Sama persis dengan Summary Payroll utama |

#### Cara Pakai:

1. Buka menu **Summary Payroll Solo** di sidebar admin.
2. Pilih periode (default: periode aktif).
3. Tabel menampilkan karyawan Toko Solo dengan komponen gaji lengkap.
4. Input **Total Omzet Toko Solo** di section omzet — nominal langsung dipakai sebagai bonus (tanpa multiplier).
5. Edit komponen gaji per karyawan jika perlu.
6. Simpan perubahan.

> Semua aturan lain (override, real-time attendance, perhitungan gaji) **sama persis** dengan Summary Payroll utama.

---

### 5.8 Payroll Penjahit

**Menu:** Summary Penjahit

- Khusus untuk karyawan dengan jabatan **penjahit**.
- Tersedia dua tipe:
  - **Mingguan** — dibayar per minggu
  - **Bulanan** — dibayar per bulan
- Komponen gaji sama dengan payroll umum, disesuaikan tipe penjahit.

---

### 5.9 Payroll Sales Nasional

**Menu:** Summary Sales Nasional

- Khusus untuk karyawan dengan jabatan **Sales Nasional**.
- Perhitungan melibatkan komponen komisi dan omzet.
- Terpisah dari summary payroll umum.

---

### 5.10 Slip Gaji & Distribusi

**Menu:** Slip Gaji / Distribusi Slip

#### Proses Distribusi Slip:
1. Admin buka **Slip Gaji** dan pilih periode.
2. Verifikasi data payroll sudah benar.
3. Distribusikan slip → karyawan bisa melihat slip di akun masing-masing.
4. **Log Distribusi** mencatat waktu pengiriman per karyawan.

#### Slip Bonus:
- Terpisah dari slip gaji.
- Dikelola dari menu **Slip Bonus** dan **Distribusi Slip Bonus**.

#### Branding Slip:
Header slip gaji & slip bonus menampilkan brand **AvA Group** (sebelumnya "Ayres").

---

### 5.11 Finance

**Menu:** Finance

- Rekap keuangan per unit (AVA Sportivo, Ayres Apparel, JNE).
- Menampilkan total beban gaji, kontrak, hutang perusahaan per unit.
- Tersedia ringkasan total gabungan seluruh unit.

---

### 5.12 Manajemen Role (Admin & SPV)

**Menu:** Role

**Yang bisa dilakukan Admin:**
- Membuat akun **Admin** baru.
- Membuat akun **SPV** baru untuk supervisor yang perlu akses terpisah.
- Menonaktifkan akun admin/SPV.

> SPV yang jabatannya Supervisor/Manager tidak perlu akun SPV terpisah — menu SPV muncul otomatis saat login karyawan.

---

## 6. Aturan & Ketentuan Sistem

### 6.1 Aturan Presensi

| Aturan | Detail |
|--------|--------|
| **Satu presensi per hari** | Tidak bisa check-in dua kali di hari yang sama |
| **Tidak bisa diubah setelah submit** | Presensi yang sudah dikirim tidak dapat diedit karyawan |
| **Admin bisa koreksi** | Admin dapat ubah kode absensi atau input absensi manual di sel kosong |
| **Selfie wajib untuk hadir** | Status hadir dan setengah hari memerlukan foto selfie |
| **Lokasi wajib untuk hadir** | GPS harus aktif dan dalam radius lokasi penempatan |
| **Keterangan wajib untuk izin/sakit** | Status izin dan sakit tanpa surat wajib isi keterangan |
| **Surat wajib untuk sakit resmi** | Status sakit dengan surat wajib upload dokumen |
| **Pulang awal wajib keterangan** | Jika pulang sebelum jam checkout shift, wajib isi alasan |

---

### 6.2 Shift & Jam Kerja

Shift presensi ditentukan oleh **jam check-in**. Sistem otomatis mendeteksi shift berdasarkan jam masuk:

| Shift | Window Check-In | Window Check-Out | Pulang Awal Jika Sebelum |
|-------|----------------|-----------------|--------------------------|
| pagi | 08:00 – 08:30 | 16:30 – 17:30 | 16:30 |
| siang | 11:45 – 12:00 | 20:00 – 21:00 | 20:00 |
| lembur | 09:45 – 10:00 | 20:00 – 21:00 | 20:00 |
| setengah_1 | 10:30 – 13:00 | 16:30 – 17:30 | 16:30 |
| setengah_2 | 08:00 – 08:30 | 12:00 – 13:00 | 12:00 |
| pagi_full | 08:00 – 08:30 | 16:30 – 17:30 | 16:30 |
| pagi_short | 08:00 – 08:30 | 14:30 – 15:30 | 14:30 |
| siang_sore | 11:45 – 12:00 | 16:30 – 17:30 | 16:30 |
| jne_pagi | 07:30 – 11:00 | 15:30 – 16:30 | 15:30 |
| jne_siang | 13:30 – 17:00 | 20:30 – 21:30 | 20:30 |
| jne_minggu | 12:30 – 14:00 | 19:30 – 20:30 | 19:30 |

**Toleransi keterlambatan:**
- JNE: 10 menit toleransi sebelum dihitung terlambat
- Shift lain: tidak ada toleransi

---

### 6.3 Geofence (Batas Lokasi)

Presensi selfie hanya bisa dilakukan dalam radius lokasi yang ditentukan:

| Lokasi | Radius |
|--------|--------|
| Kantor (Jl. Wonocatur) | 50 meter |
| Toko (AVA Sport Store) | 50 meter |
| Toko Solo | 50 meter |
| Ayres Apparel | 50 meter |
| JNE Ambarrukmo | 50 meter |
| Bank BCA | 100 meter |
| Gudang | 25 meter |

**Jika presensi ditolak karena lokasi:**
1. Pastikan GPS aktif dan izin lokasi sudah diberikan ke browser.
2. Tunggu beberapa detik agar GPS mendapat sinyal yang akurat.
3. Gunakan tombol **Refresh** lokasi untuk memperbarui GPS.
4. Jika masih ditolak, hubungi Admin HR.

> **WFA (Work From Anywhere):** Karyawan dengan penempatan WFA tidak terkena validasi geofence.

---

### 6.4 Aturan Lembur

#### Field Wajib:

| Field | Berlaku Untuk |
|-------|---------------|
| Tanggal, Jam Mulai, Jam Selesai | Semua karyawan |
| Atasan Penyetuju | Semua karyawan (Manager auto ke Admin) |
| **Jenis Pekerjaan** | Semua karyawan |
| **Deadline** | Semua karyawan |
| **Nama Order** | Hanya divisi **Produksi** |
| **Jumlah QTY** | Hanya divisi **Produksi** |
| **Target Sebelum Lembur** | Hanya divisi **Produksi** |
| **Target Setelah Lembur** | Hanya divisi **Produksi** |

#### Alur Approval:

| Jenis Pengajuan | Alur |
|-----------------|------|
| Pengajuan ke **ADMIN** (generic) | **1x approve** oleh admin |
| Pengajuan Manager | **1x approve** oleh admin (otomatis routing) |
| Pengajuan ke **SPV/Supervisor/Manager** spesifik | **2x approve**: atasan dulu → kemudian admin |

#### Aturan Tambahan:
- Durasi lembur harus **lebih dari 0 jam**.
- Approver yang dipilih **harus berstatus aktif**.
- Setelah diputuskan **approved/rejected** → final, tidak bisa diubah.
- Lembur **approved** otomatis masuk ke payroll periode tersebut.
- Admin **tidak bisa approve** pengajuan via atasan jika atasan belum approve.

---

### 6.5 Aturan Pinjaman

| Aturan | Detail |
|--------|--------|
| **Masa kerja minimal** | 6 bulan dari tanggal masuk pertama |
| **Batas maksimal (karyawan)** | Rp 3.000.000 per pengajuan mandiri |
| **Batas admin** | Tidak ada batas (untuk kondisi darurat) |
| **Satu pinjaman aktif** | Tidak bisa mengajukan jika masih ada pinjaman pending/approved/berjalan |
| **Cooldown setelah lunas** | 3 bulan setelah pinjaman selesai baru bisa ajukan lagi |
| **Contoh cooldown** | Lunas Januari → Bisa ajukan kembali mulai 1 April |
| **Cicilan otomatis** | Dipotong dari gaji setiap bulan sesuai jadwal |
| **Pelunasan awal** | Hanya bisa dilakukan oleh Admin |

---

### 6.6 Aturan Periode Payroll

| Aturan | Detail |
|--------|--------|
| **Rentang periode** | Tanggal 26 bulan sebelumnya s.d. tanggal 25 bulan berjalan |
| **Contoh** | Periode Juni = 26 Mei – 25 Juni |
| **Default tampil** | Jika tanggal sudah > 25, otomatis masuk ke periode bulan berikutnya |
| **Hari kerja** | Dihitung otomatis (Senin–Sabtu), tidak termasuk Minggu |
| **Hari kerja konsisten** | Semua karyawan dalam satu periode dapat nilai hari kerja yang sama |
| **Real-time** | Summary payroll selalu update dari data absensi terbaru |
| **Karyawan nonaktif** | Tidak muncul di periode berikutnya setelah tanggal nonaktif |
| **Pemisahan halaman** | Karyawan Toko Solo di Summary Payroll Solo (terpisah dari utama) |

---

## 7. Kode Status Presensi

| Kode | Nama | Keterangan |
|------|------|-----------|
| **O** | Hadir | Masuk tepat waktu |
| **T** | Terlambat | Masuk setelah jam shift |
| **I** | Izin | Izin / Off (dengan keterangan) |
| **S** | Sakit | Sakit dengan surat dokter |
| **SX** | Sakit Tanpa Surat | Sakit tanpa dokumen pendukung |
| **H** | Setengah Hari | Hadir setengah hari |
| **PA** | Pulang Awal | Pulang sebelum jam checkout shift — wajib keterangan. Di UI tampil PA, di DB tersimpan hadir + keterangan |
| **L** | Libur | Hari libur terjadwal |
| **A** | Alfa | Tidak hadir tanpa keterangan |
| **C** | Cuti | Cuti resmi |

---

## 8. Tabel Ringkasan Hak Akses

| Fitur | Karyawan | Supervisor / Manager | Admin |
|-------|:--------:|:--------------------:|:-----:|
| Check-in / Check-out | ✅ | ✅ | — |
| Lihat absensi sendiri | ✅ | ✅ | ✅ |
| Lihat absensi semua karyawan | — | — | ✅ |
| Edit / input absensi manual | — | — | ✅ |
| Ajukan lembur (+ field produksi jika Produksi) | ✅ | ✅ | — |
| Approve lembur (stage 1 — atasan) | — | ✅ (jika ditunjuk) | — |
| Approve lembur (stage 2 — admin / final) | — | — | ✅ |
| Lihat detail pengajuan lembur (modal) | — | ✅ | ✅ |
| Set jadwal shift | — (kecuali SPV/Manager) | ✅ | ✅ |
| Ajukan pinjaman mandiri (maks Rp 3 jt) | ✅ | ✅ | — |
| Buat pinjaman tanpa batas (darurat) | — | — | ✅ |
| Approve / reject pinjaman | — | — | ✅ |
| Lihat slip gaji sendiri | ✅ | ✅ | ✅ |
| Lihat & distribusi slip gaji semua | — | — | ✅ |
| Kelola & edit Summary Payroll | — | — | ✅ |
| Kelola Summary Payroll Solo (Toko Solo) | — | — | ✅ |
| Kelola data karyawan | — | — | ✅ |
| Download foto KTP karyawan | — | — | ✅ |
| Approval reimburse & perjalanan dinas | — | — | ✅ |
| Manajemen akun admin / SPV | — | — | ✅ |
| Laporan kunjungan (sales) | ✅ (khusus sales) | — | ✅ |

---

## 9. FAQ & Catatan Penting

**Q: GPS saya tidak akurat, apa yang harus dilakukan?**
Tutup aplikasi browser lain, pastikan koneksi internet stabil, dan buka pengaturan lokasi ponsel untuk memastikan GPS aktif. Gunakan tombol **Refresh** di halaman presensi. Jika akurasi masih di atas 50 meter, coba pindah ke area terbuka tanpa penghalang atap atau gedung.

---

**Q: Saya lupa check-out kemarin, bagaimana?**
Hubungi Admin HR untuk mencatat check-out secara manual. Karyawan tidak bisa mengisi check-out hari sebelumnya sendiri.

---

**Q: Saya sudah check-in tapi salah status. Bisa diubah?**
Tidak bisa diubah sendiri. Hubungi Admin HR untuk koreksi data absensi — admin punya akses untuk mengubah kode absensi via modal detail.

---

**Q: Saya divisi Produksi, kenapa form lembur saya beda dari teman lain?**
Field tambahan (Nama Order, Jumlah QTY, Target Sebelum/Setelah Lembur) memang khusus muncul untuk karyawan divisi Produksi. Ini untuk memudahkan admin tracking target produksi dari lembur yang diajukan.

---

**Q: Kenapa atasan saya sudah approve lembur tapi statusnya masih "menunggu admin"?**
Karena Anda mengajukan lembur ke atasan (bukan langsung admin), sistem menerapkan **2x approval**. Setelah atasan approve, masih perlu admin approve untuk finalisasi. Tunggu admin proses, atau hubungi admin jika urgent.

---

**Q: Kalau saya mau lembur cepat selesai approve-nya, bagaimana?**
Pilih opsi **ADMIN** generic di dropdown atasan saat submit. Pengajuan akan langsung 1x approve oleh admin (tidak perlu lewat atasan). Tapi pastikan urgensi memang membutuhkan ini — alur normal lewat atasan tetap direkomendasikan untuk hierarki yang baik.

---

**Q: Saya baru kerja 4 bulan, kapan bisa mengajukan pinjaman?**
Pengajuan baru bisa dilakukan setelah masa kerja mencapai **6 bulan** dari tanggal pertama masuk.

---

**Q: Cicilan pinjaman tidak dipotong bulan ini, kenapa?**
Cicilan dipotong otomatis saat Admin memproses payroll. Jika payroll bulan ini belum diproses, cicilan belum terpotong. Hubungi Admin untuk konfirmasi.

---

**Q: Pulang Awal (PA) itu apa bedanya dengan Izin?**
PA adalah kondisi di mana karyawan **sudah check-in hadir** tapi **pulang sebelum jam checkout** shift-nya. Statusnya tetap tercatat hadir, namun ditandai PA dan wajib ada keterangan alasan. Berbeda dengan Izin yang artinya tidak masuk sama sekali sejak awal hari.

---

**Q: Saya karyawan Toko Solo, kenapa saya tidak muncul di Summary Payroll utama?**
Karyawan dengan penempatan **Toko Solo** sengaja dipisah ke halaman **Summary Payroll Solo** agar tidak campur dengan unit lain. Admin akan melihat data Anda di menu Summary Payroll Solo. Slip gaji Anda tetap normal tampil di akun Anda.

---

**Q: Siapa yang bisa melihat keterangan PA saya?**
Hanya Admin yang bisa melihat keterangan PA di detail rekap absensi.

---

**Q: Slip gaji saya tidak muncul. Kenapa?**
Slip baru tersedia setelah Admin mendistribusikannya. Jika periode sudah selesai tapi slip belum muncul, hubungi Admin HR.

---

**Q: Apa itu status Freelance di payroll?**
Karyawan dengan status kepegawaian Freelance memiliki perhitungan gaji berbeda (per hari atau per jam, tanpa tunjangan tetap dan BPJS). Diatur oleh Admin di konfigurasi payroll masing-masing karyawan.

---

**Q: Saya Supervisor, bagaimana cara approve lembur tim saya?**
Login dengan akun karyawan Anda, lalu pilih menu **Approval Lembur** di sidebar. Hanya pengajuan yang ditujukan kepada Anda yang akan muncul. Setelah Anda approve, pengajuan masuk ke admin untuk approval kedua (2x approve).

---

**Q: Bisa tidak check-in di luar jam shift?**
Untuk karyawan dengan jadwal shift (Toko/Gudang/Media/JNE), check-in di luar window jam shift akan ditolak sistem. Untuk karyawan lain, sistem menerima check-in namun keterlambatan tetap dicatat.

---

**Q: Saya lihat tampilan login rusak (teks polos tanpa style). Bug?**
Bukan bug — ini biasanya karena CSS gagal di-load di browser. Coba **hard refresh** (Ctrl+Shift+R), buka di **incognito**, atau hubungi tim IT jika masalah persisten.

---

> **Untuk pertanyaan atau kendala teknis lainnya, hubungi Admin HR AvA Group.**

---

*Dokumen ini diterbitkan oleh HR AvA Group. Berlaku untuk seluruh karyawan yang menggunakan sistem Web HR.*
