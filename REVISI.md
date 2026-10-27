# Catatan Revisi — Web HR (AvA / AYRES)

Dokumen ini mencatat revisi/perubahan penting aplikasi HR beserta aturan bisnis yang
memengaruhi absensi & payroll (sensitif uang). Urut dari terbaru.

> Build deploy memakai **webpack** (`next build --webpack`) — lihat revisi 28 Sep 2026.
> Semua aturan absensi/payroll yang menyebut "berlaku mulai tanggal X" hanya memengaruhi
> data **sejak** tanggal itu; periode lama tidak dihitung ulang.

---

## 27 Oktober 2026

### Partime TIDAK kena potongan kontrak (konsistenkan modul dengan Summary Partime)
- **Bug:** karyawan **partime** muncul di modul **Potongan Kontrak** (dan Pengembalian
  Kontrak) dan dibuatkan jadwal potongan, padahal **Summary Partime tidak pernah memotong
  kontrak** (partime hanya potong telat Rp5.000). Jadi modul & summary tidak konsisten.
- **Fix:** partime ditambahkan ke daftar **tidak eligible** potongan kontrak — sejajar
  tetap/freelance/sales nasional/JNE. Berlaku di: `isContractDeductionEligible`, query
  daftar karyawan modul, pembersihan jadwal (`cleanupIneligibleContractSchedules`
  otomatis menghapus jadwal partime yang terlanjur ada saat deploy), dan Pengembalian
  Kontrak.
- Tidak ada uang yang salah terpotong sebelumnya (Summary Partime memang tidak memotong);
  ini memperbaiki tampilan modul agar konsisten.
- File: `lib/contract-deductions.ts`, `lib/contract-returns.ts`.

### Summary Payroll: urutkan Nama (Abjad / Divisi)
- Tombol **"Urut: Divisi | Abjad (A–Z)"** di bar pencarian Summary Payroll utama.
- **Divisi** (default): dikelompokkan per divisi (header per divisi, lalu urut nama) —
  perilaku lama.
- **Abjad (A–Z)**: daftar rata urut nama A–Z tanpa header divisi.
- File: `components/AdminPayrollSummaryManager.tsx`.

### Kenaikan gaji tahunan: anniversary tepat tanggal efektif = baseline
- **Perbaikan aturan:** program kenaikan gaji tahunan (efektif 1 Jun 2026) kini hanya
  menaikkan anniversary yang jatuh **SESUDAH** tanggal efektif. Anniversary **TEPAT** pada
  1 Jun 2026 (mis. VINA AULIA ROZANI, masuk 1 Jun) = **baseline** → 2026 tetap gaji lama,
  naik pertama Jun 2027.
- Sebelumnya anniversary 1 Jun 2026 ikut naik di 2026 (cutoff baseline H-1 / 31 Mei) →
  Vina tampil 3.400.000 padahal harusnya 3.300.000.
- Fix: `raiseBaselineCutoff = RAISE_EFFECTIVE_FROM` (inklusif tanggal efektif). Memengaruhi
  **gaji kontrak & insentif kehadiran** (keduanya kembali ke baseline untuk anniversary
  1 Jun). Hanya karyawan ber-anniversary **tepat 1 Jun** yang terpengaruh; yang lain tetap.
- File: `lib/payroll-summary.ts` (`raiseBaselineCutoff`).

### Uang kerajinan Summary utama = 10% gaji bulanan (otomatis, dipaksa)
- **Aturan baru:** di **Summary Payroll utama**, uang kerajinan dihitung **otomatis =
  10% gaji bulanan** (gaji pokok bulanan), seperti Summary Penjahit.
- **Dipaksa 10%** — input manual uang kerajinan (`pei.uang_kerajinan`) **diabaikan**.
  Berlaku untuk **semua karyawan non-freelance** di summary ini.
- Nominal kerajinan = `round(gaji_bulanan × 0.1)`. Uang kerajinan yang benar-benar
  **dibayar** tetap bisa hangus bila ada masalah kedisiplinan (alfa/izin/sakit>2/sakit
  tanpa surat) — aturan potongan absensi tidak berubah.
- **Catatan dampak:** sales reguler (non-nasional) ikut dapat kerajinan 10% → THP bisa
  naik. Sales **Nasional** THP-nya pakai gross tersendiri (tidak terpengaruh). Freelance
  tidak dapat (tetap 0).
- File: `lib/payroll-summary.ts` (`fixedDiligenceAllowance`).

### Koreksi uang makan/hari Humbelina 25.000 → 35.000 (migrasi otomatis)
- Uang makan/hari **Humbelina Febriani Imlana Putri** (NIP `FC.FC.2024.0001`) dikoreksi
  **25.000 → 35.000**, periode **Oktober 2026 & ke depan**.
- **Bukan bug kode:** uang makan disimpan apa adanya di `pei.uang_makan_per_hari` dan
  ditampilkan langsung (sudah diaudit — tak ada migrasi/perhitungan yang mengubahnya;
  migrasi BPJS kemarin hanya menyentuh kolom `bpjs`). Ini **koreksi data**.
- Dijalankan **otomatis saat deploy** (ledger-guarded, key
  `humbelina-uangmakan-25k-to-35k-2026-10`). Hanya baris yang nilainya **tepat 25.000**;
  periode lama tak diubah; periode berikutnya ikut 35.000 via clone.
- File: `lib/payroll-admin.ts` (migrasi), `db/migrations/2026-10-27-humbelina-uangmakan-35k.sql`
  (referensi manual).

### Bonus omzet: PIC = SPV, Leader = Staff
- **Aturan baru:** faktor bonus omzet per jabatan — jabatan **PIC** (mis. "PIC RnD & QA")
  mendapat faktor **sama dengan SPV (0.5)**; jabatan **Leader** (Leader Finishing/Sewing/
  Production/Printing & Cutting, dll) mendapat faktor **sama dengan Staff (0.25)**.
- Sebelumnya PIC & Leader tidak cocok tier mana pun → faktor 0 (tidak dapat bonus omzet).
- **Tidak mengurangi bonus karyawan lain:** `omzetBonus = (bonusPool / jumlah karyawan
  eligible) × faktor`. PIC & Leader sudah ikut dihitung di pembagi (karyawan aktif),
  jadi memberi mereka faktor hanya menambah bagian mereka — bagian orang lain tetap.
- **PPIC sengaja TIDAK termasuk** "PIC" (dibedakan via batas kata `\bpic\b`), karena PPIC
  jabatan berbeda dan tidak disebut.
- Hanya memengaruhi **Summary Payroll utama** (kolom Omzet). Modul "Payroll Bonus"
  (slip terpisah) tidak berubah.
- File: `lib/payroll-summary.ts` (`getOmzetFactor`).

---

## 24 Oktober 2026

### Fix: Tunjangan Jabatan 0 di Summary Penjahit & Partime (carry tidak konsisten)
- **Bug:** Summary **Penjahit** & **Partime** membaca `payroll.tunjangan_jabatan` apa adanya.
  Kalau periode berjalan ter-set 0 (akibat clone lama / simpan form dengan field kosong),
  tunjangan jabatan tampil **Rp 0** padahal periode sebelumnya ada nilainya. Summary utama
  sudah punya "carry" (ambil nilai terakhir > 0) tapi Penjahit & Partime belum → **tidak
  konsisten**, dan ikut salah di total gaji (karena tunjangan masuk perhitungan).
- **Fix:** helper tunggal `getCarriedTunjanganJabatanMap()` di `lib/payroll-admin.ts` —
  ambil `tunjangan_jabatan` TERAKHIR (> 0) dari periode ≤ periode ini per karyawan, dipakai
  sebagai fallback bila periode ini 0. Dipakai **seragam** di Summary utama, Penjahit, dan
  Partime (sumber kebenaran satu). Nilai efektif ini juga mengisi form edit
  (`inputTunjanganJabatan`) → simpan ulang otomatis "menyembuhkan" data periode berjalan.
- **Catatan penting:** kalau suatu karyawan **memang tidak pernah** punya tunjangan jabatan
  di periode mana pun, tetap **Rp 0** (itu benar, bukan bug). Mis. di Summary utama FAISAL/
  FARA/PIPIN/WARISAH = 0 karena memang tidak ada tunjangan jabatan — bukan bug.
- File: `lib/payroll-admin.ts` (helper), `lib/payroll-summary.ts`, `lib/payroll-penjahit.ts`,
  `lib/payroll-partime.ts`.

---

## 23 Oktober 2026

### BPJS 25.000 → 35.000 untuk semua karyawan (migrasi otomatis)
- Nilai BPJS **25.000 diubah jadi 35.000** untuk semua karyawan, mulai periode
  **Oktober 2026 & ke depan** (periode lama ≤ Sep 2026 tidak diubah).
- **Dijalankan otomatis saat deploy** — migrasi DML satu-kali (ledger-guarded) di
  `ensurePayrollSupportTables`. Tabel `schema_migrations` memastikan migrasi hanya
  jalan **sekali** (key `bpjs-25k-to-35k-2026-10`), jadi nilai yang di-set ulang
  manual setelahnya tidak akan ditimpa.
- **Penting:** BPJS disimpan sebagai **data per-karyawan per-periode** di DB
  (`payroll_employee_input.bpjs` + `payroll.bpjs`), bukan konstanta kode. Satu kolom
  `pei.bpjs` dipakai bareng Summary utama, Penjahit, dan Partime → sekali migrasi,
  ketiganya ikut.
- Hanya baris yang BPJS-nya **tepat 25.000** yang diubah (custom/beda tak tersentuh).
- Periode baru (via "+Tambah Payroll") otomatis clone nilai periode sebelumnya →
  setelah Okt 2026 = 35.000, bulan berikutnya ikut 35.000 otomatis.
- File: `lib/payroll-admin.ts` (migrasi + ledger). Script SQL manual setara juga ada
  di `db/migrations/2026-10-23-bpjs-25k-to-35k.sql` (referensi/cadangan).

---

## 21 Oktober 2026

### Download Excel daftar Peminjaman Barang (admin)
- Tombol **"Download Excel"** di header tabel halaman admin **Peminjaman Barang**
  mengekspor seluruh catatan ke file `.xlsx` (kolom: No, Nama, NIP, Barang Dipinjam,
  Tgl Peminjaman, Keterangan). Multi-karyawan & multi-barang per baris ditampilkan
  multiline di dalam sel.
- Tombol hanya muncul untuk **admin** (tidak di view read-only Finance).
- File: `app/api/admin/item-loans/export/route.ts` (baru, ExcelJS),
  `components/AdminItemLoansManager.tsx` (tombol).

---

## 19 Oktober 2026

### Menu "Barang Dipinjam" di akun karyawan (hanya barang sendiri)
- Karyawan kini bisa lihat daftar barang/aset perusahaan yang sedang **dia pinjam**
  langsung di akun masing-masing (read-only), lewat menu baru **"Barang Dipinjam"**.
- **Hanya** menampilkan record di mana karyawan tsb termasuk peminjam — **tidak** ada
  barang yang dipinjam orang lain. Kolom "Dipinjam Bersama" menampilkan rekan yang
  meminjam di record yang sama (bila pinjam bareng).
- Menu lama **"Peminjaman Barang"** (daftar semua karyawan, read-only) tetap khusus
  dept Finance; tidak berubah.
- File: `app/employee/my-item-loans/page.tsx` (baru), `components/EmployeeShell.tsx`
  (menu), pakai helper `listItemLoansByEmployee` di `lib/item-loans.ts`.

---

## 12 Oktober 2026

### 1. Karyawan keluar/resign → kode "K" (Keluar), bukan Alfa
- Rekap absensi: karyawan dengan `tanggal_nonaktif` (resign) dalam periode ini, hari
  pada/sesudah tanggal nonaktif ditandai kode **"K" (Keluar)** — bukan Alfa, bukan "-".
  Hari sebelum resign yang kosong tidak lagi di-auto-alfa.
- Payroll: karyawan resign dalam periode dikecualikan dari auto-alfa (tidak kena potong
  kerajinan dari auto-alfa). Tambah opsi kode "K" (Keluar) di daftar kode absensi.
- **Penting:** penanda keluar diambil dari `tanggal_nonaktif` — set tanggal resign di Data
  Karyawan agar kode "K" muncul.
- File: `lib/hris.ts`, `lib/payroll-summary.ts`.

### 2. Jabatan "bisa approve" via Master Jabatan (Leader approve lembur & absensi)
- Di **Master Jabatan** ada tombol **"Jadikan approver"** per jabatan. Jabatan yang ditandai
  (mis. Leader) boleh **approve lembur & absensi** — muncul sebagai pilihan atasan saat
  karyawan apply, bisa buka menu & halaman Approval Lembur/Absensi, dan memproses approval
  yang ditujukan padanya.
- SPV/Manager tetap bisa approve seperti biasa (tidak berubah). Izin ini **tidak** memberi
  akses Set Jadwal.
- Teknis: kolom `can_approve` di `master_lookup` (self-migrating) + helper
  `canApproveRequests()` dipakai seragam di route processing, halaman approval, menu
  (EmployeeShell), serta daftar/validasi atasan (lembur & absensi).
- File: `lib/master-lookup.ts`, `lib/approval-access.ts`, `components/AdminMasterLookup.tsx`,
  `app/api/admin/master/route.ts`, `lib/attendance-approver.ts`, `lib/overtime.ts`,
  `app/api/employee/overtime/route.ts`, `app/api/employee/{attendance,overtime}-approvals/[id]/route.ts`,
  `app/employee/{attendance,overtime}-approvals/page.tsx`, `app/employee/layout.tsx`,
  `components/EmployeeShell.tsx`, `components/EmployeeJadwalAccessContext.tsx`.

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
