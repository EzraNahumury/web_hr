# Catatan Revisi — Web HR (AvA / AYRES)

Dokumen ini mencatat revisi/perubahan penting aplikasi HR beserta aturan bisnis yang
memengaruhi absensi & payroll (sensitif uang). Urut dari terbaru.

> Build deploy memakai **webpack** (`next build --webpack`) — lihat revisi 28 Sep 2026.
> Semua aturan absensi/payroll yang menyebut "berlaku mulai tanggal X" hanya memengaruhi
> data **sejak** tanggal itu; periode lama tidak dihitung ulang.

---

## 9 Oktober 2026

### Keterangan telat wajib diisi sebelum absen terkirim
- Jika karyawan datang **terlambat** dan **tidak mengisi keterangan (alasan)**, presensi
  masuk **ditolak** (tidak bisa dikirim) — harus isi keterangan dulu.
- Berlaku untuk **semua** kasus telat (apa pun role & tanggal), sebagai guard tegas di
  samping aturan approval telat yang sudah ada.
- File: `app/api/employee/attendance/check-in/route.ts`.

---

## 8 Oktober 2026

### 1. Auto-Alfa — pengecualian & guard resign
- Karyawan **dikecualikan** dari Auto-Alfa (by NIP): **EZRA KRISTANTO NAHUMURY**
  (`EKS.MM.2026.0001`) dan **RIMANSYAH RAHADHYAN** (`FC.FC.2026.0001`) — owner & gaji
  per kedatangan, tidak wajib hadir harian.
- Tambah guard **tanggal resign** (`tanggal_nonaktif`): hari pada/sesudah tanggal nonaktif
  tidak dihitung Alfa (menutup kasus karyawan resign / masuk 1 hari di bulan berjalan).
- Daftar NIP dikecualikan ada di `lib/auto-alfa.ts` (`AUTO_ALFA_EXCLUDED_NIPS`). Jika NIP
  berubah, perbarui daftar ini.
- File: `lib/auto-alfa.ts`, `lib/hris.ts`, `lib/payroll-summary.ts`.

### 2. Keterangan telat tidak lagi terhapus saat presensi pulang
- **Bug:** saat check-out, kolom `keterangan` ditimpa nilai kosong → alasan telat yang
  diisi saat check-in hilang (setelah pulang jadi "-").
- **Fix:** `keterangan = COALESCE(NULLIF(?, ''), keterangan)` — hanya ditimpa bila ada
  alasan baru, kalau tidak dipertahankan.
- **Catatan:** keterangan yang sudah terlanjur terhapus (record lama yang sudah pulang)
  **tidak bisa dipulihkan**; fix hanya mencegah ke depan.
- File: `app/api/employee/attendance/check-out/route.ts`.

### 3. Catatan atasan tampil di akun staff
- Halaman **Riwayat Absensi** karyawan menambah kolom **Keterangan** (alasan sendiri) &
  **Catatan Atasan** (note dari approver; bila kosong tampil "Disetujui"/"Ditolak" sesuai
  status approval).
- File: `lib/hris.ts` (`getEmployeeAttendanceHistory`), `app/employee/attendance-history/page.tsx`.

### 4. Summary Payroll dikelompokkan per DIVISI
- Baris dikelompokkan **per divisi** (tidak dibedakan unit ava/ayres). Tiap grup diawali
  header nama divisi, staff diurutkan nama.
- File: `components/AdminPayrollSummaryManager.tsx`.

### 5. Distribusi slip menyebut Periode
- Judul & dialog konfirmasi distribusi slip kini menyebut **Periode** (mis. "Distribusikan
  slip gaji Periode September?") agar tidak salah bulan saat klik "Ya".
- File: `components/AdminPayslipDistribution.tsx`.

### 6. Penjahit mingguan — Finance & THP tampil SISA (minggu4)
- Penjahit mingguan dicairkan per minggu: **minggu 1-3 sudah dibayar mingguan**, sisanya
  (**minggu4**) dibayar Finance di akhir bulan.
- **Download Finance (Excel)**, **THP/PDF (Download Gaji)**, dan rekap Finance kini
  menampilkan **minggu4 (sisa)** untuk penjahit mingguan — bukan penerimaan bersih sebulan
  penuh (dulu dobel dengan yang sudah dicairkan).
- **Summary Penjahit** sendiri tetap menampilkan rincian penuh (tidak diubah).
- File: `app/api/admin/payroll-summary/finance-export/route.ts`, `lib/finance-rows.ts`.

---

## 3 Oktober 2026 — Revisi per tanggal 1

### Auto-Alfa (kode A otomatis)
- Hari **kerja yang sudah lewat** tapi tidak terisi absensi otomatis dihitung **Alfa (A)**
  di rekap & payroll (uang kerajinan hangus; gaji pokok hari kosong memang sudah 0).
- **Guard (hanya dialfa jika):** tanggal `< hari ini` dan `>= 2026-10-01`, bukan Minggu /
  libur terjadwal / LN / LP / cuti, dalam masa kerja (>= tgl masuk, < tgl resign).
- **Dikecualikan role:** freelance, sales nasional, partime (tidak presensi harian).
  Tambahan pengecualian per-NIP ditambahkan 8 Okt (lihat di atas).
- Logika dipusatkan di `lib/auto-alfa.ts`, dipakai konsisten di rekap (`lib/hris.ts`) &
  payroll (`lib/payroll-summary.ts`).
- **Belum tercakup:** perhitungan payroll Summary Penjahit (sheet terpisah) — rekap
  penjahit sudah ikut, perhitungan payroll penjahit belum.

### Apply lembur anti-overlap
- Pengajuan lembur yang **bertumpuk waktunya** dengan lembur lain (non-rejected) di tanggal
  sama **ditolak** (409). Lembur lanjutan yang tidak overlap (mis. 17:00-23:00 lalu
  23:00-24:00) tetap boleh.
- File: `app/api/employee/overtime/route.ts`.

---

## 28 September 2026

- **Build pakai webpack:** script build jadi `next build --webpack` untuk menghindari panic
  Turbopack saat memproses CSS di environment deploy. (`package.json`)
- **Sales Nasional THP/Finance pakai gross penuh:** `totalSalaryBeforeDeduction` sales
  nasional = `salesNasionalGross` (gaji pokok + transport + BPJS + kendaraan + bonus), bukan
  hanya komponen berbasis absensi (dulu hanya kendaraan karena presentDays=0).
  (`lib/payroll-summary.ts`)

## 24 September 2026
- **Toleransi keterlambatan = 0 menit** untuk semua shift (telat begitu masuk lewat jam
  mulai shift). (`lib/attendance.ts`)

## 23 September 2026
- **Check-in bisa melengkapi baris "hadir" placeholder** (jam_masuk NULL dari dinas /
  "Ubah Kode → O") via UPDATE, bukan menolak 409 — menutup kondisi karyawan terkunci
  (tak bisa check-in maupun check-out). (`app/api/employee/attendance/check-in/route.ts`)

## 21 September 2026
- **Chip shift di Master Set Jadwal tampilkan jam LIVE** dari definisi shift (bukan hanya
  label), agar perubahan jam langsung terlihat & shift custom vs bawaan jelas bedanya.
  (`lib/shift-defs.ts`, `components/AdminShiftGroups.tsx`)

## 18 September 2026
- **Toleransi telat awalnya** hanya shift pagi (2 menit), shift lain 0. (lalu diubah jadi
  0 semua pada 24 Sep). (`lib/attendance.ts`)
- **Telat belum di-approve tidak dihitung masuk** di rekap: kolom "Masuk" mengecualikan
  hari `needsApproval`; deteksi "belum approve" pakai `approval_status` sebagai sumber
  kebenaran. (`components/AdminAttendanceSheet.tsx`, `lib/hris.ts`, `lib/payroll-*.ts`)

## 13 September 2026
- **Payroll bonus berlaku untuk semua karyawan aktif** + divisi baru "Umum"; menu "Slip
  Payroll Bonus" di akun karyawan. (`lib/payroll-bonus.ts`, `lib/bonus-slip.ts`, dll)

---

## Aturan bisnis kunci (ringkas)

| Aturan | Nilai / Perilaku | Berlaku sejak |
|---|---|---|
| Periode payroll | 26 bulan sebelumnya s/d 25 bulan terpilih | — |
| Toleransi telat | 0 menit (semua shift) | 24 Sep 2026 |
| Telat/pulang-awal | wajib approval atasan; belum approve = tidak dihitung bekerja | 5 Jul 2026 |
| Keterangan telat | wajib diisi; tanpa keterangan, absen telat tidak bisa dikirim | 9 Okt 2026 |
| Setengah hari | dihapus (tanggal lama dibiarkan) | 5 Jul 2026 |
| Auto-Alfa | hari kerja lewat tanpa absensi = Alfa (dgn pengecualian) | 1 Okt 2026 |
| Penjahit mingguan di Finance | minggu4 (sisa), minggu 1-3 dicairkan mingguan | 8 Okt 2026 |

## Catatan penting
- **Data lama tidak dihitung ulang** oleh perubahan aturan (hanya forward).
- **Pengecualian Auto-Alfa by NIP** hardcoded di `lib/auto-alfa.ts` — perbarui jika NIP
  berubah atau ada karyawan per-kedatangan baru.
- Verifikasi payroll sebaiknya dilakukan dengan data produksi (DB lokal tidak selalu aktif).
