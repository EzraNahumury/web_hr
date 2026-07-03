# Web HR — AvA Group

> **Sistem Manajemen SDM & Payroll berbasis web** untuk AvA Group (AVA Sportivo, Ayres Apparel, JNE, Toko Solo).
> Presensi digital (selfie + GPS), penjadwalan shift, lembur berjenjang, pinjaman, dan mesin payroll otomatis lengkap dengan slip gaji.

**Versi Dokumen:** 3.0 · **Zona waktu sistem:** Asia/Jakarta (WIB) · **Bahasa:** Indonesia

Dokumen ini berisi **dua bagian**:
- **Bagian A — Dokumentasi Teknis**: arsitektur, model data, alur (flow diagram), modul, API, setup & deployment.
- **Bagian B — Panduan Pengguna**: alur pemakaian per peran (Karyawan, SPV/Manager, Admin) dan aturan sistem.

---

## Daftar Isi

**Bagian A — Teknis**
1. [Gambaran Umum](#1-gambaran-umum)
2. [Tech Stack](#2-tech-stack)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Struktur Direktori](#4-struktur-direktori)
5. [Autentikasi & Sesi](#5-autentikasi--sesi)
6. [Model Data (ERD & Katalog Tabel)](#6-model-data-erd--katalog-tabel)
7. [Alur Utama / Flow Diagram](#7-alur-utama--flow-diagram)
   - [7.1 Login & Routing Peran](#71-login--routing-peran)
   - [7.2 Presensi Masuk / Pulang](#72-presensi-masuk--pulang)
   - [7.3 Lembur & Approval Berjenjang](#73-lembur--approval-berjenjang)
   - [7.4 Pinjaman (Lifecycle)](#74-pinjaman-lifecycle)
   - [7.5 Pipeline Payroll](#75-pipeline-payroll)
   - [7.6 Payroll Freelance](#76-payroll-freelance)
   - [7.7 Slip Gaji & Distribusi](#77-slip-gaji--distribusi)
8. [Modul Bisnis (`lib/`)](#8-modul-bisnis-lib)
9. [Peta API Endpoint](#9-peta-api-endpoint)
10. [Setup & Menjalankan](#10-setup--menjalankan)
11. [Environment Variables](#11-environment-variables)
12. [Deployment](#12-deployment)
13. [Catatan Keamanan & Teknis](#13-catatan-keamanan--teknis)

**Bagian B — Panduan Pengguna**
14. [Peran & Hak Akses](#14-peran--hak-akses)
15. [Alur Karyawan](#15-alur-karyawan)
16. [Alur Supervisor & Manager](#16-alur-supervisor--manager)
17. [Alur Admin](#17-alur-admin)
18. [Aturan Sistem](#18-aturan-sistem)
19. [Kode Status Presensi](#19-kode-status-presensi)
20. [FAQ](#20-faq)

---

# BAGIAN A — DOKUMENTASI TEKNIS

## 1. Gambaran Umum

Web HR AvA Group adalah aplikasi **full-stack Next.js (App Router)** yang menyatukan seluruh proses HR ke dalam satu platform:

| Domain | Kemampuan |
|--------|-----------|
| **Presensi** | Check-in / check-out berbasis **selfie + GPS geofence**, deteksi shift & keterlambatan otomatis |
| **Penjadwalan** | Set jadwal shift per karyawan per hari (SPV/Manager/Admin) |
| **Lembur** | Pengajuan + approval **1x atau 2x berjenjang** (atasan → admin) |
| **Pinjaman** | Pengajuan mandiri, cicilan otomatis terpotong payroll, pelunasan awal |
| **Payroll** | Mesin perhitungan gaji **real-time** dari absensi + lembur + potongan + omzet |
| **Payroll khusus** | Solo, Penjahit (mingguan/bulanan), Sales Nasional, Freelance (jam/pengerjaan/harian/custom) |
| **Slip** | Slip gaji & slip bonus (PDF), distribusi ke akun karyawan |
| **Keuangan** | Rekap finance per unit, kontrak, reimburse, perjalanan dinas |
| **Lainnya** | Laporan kunjungan sales, HR Agent (AI tanya-jawab data), export Excel/PDF |

Semua pencatatan waktu memakai **Asia/Jakarta (WIB)**. Periode payroll berjalan dari **tanggal 26 bulan sebelumnya s.d. tanggal 25 bulan berjalan**.

---

## 2. Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| **Framework** | Next.js `16.1.6` (App Router, React Server Components + Route Handlers) |
| **UI** | React `19.2.3`, Tailwind CSS `v4`, TypeScript `5` |
| **Database** | MySQL (via `mysql2` connection pool, `namedPlaceholders`) |
| **Auth** | Cookie sesi HMAC-SHA256 (httpOnly), password SHA2-256, Bearer token untuk mobile |
| **Export** | `exceljs` (Excel), `jspdf` + `jspdf-autotable` (PDF) |
| **Visual login** | `three.js` + `postprocessing` (animasi GridScan, desktop only) |
| **AI (HR Agent)** | Ollama Cloud (`gpt-oss:120b-cloud`) via `OLLAMA_HOST` — tool-calling read-only ke DB |
| **Runtime** | Node.js |

> Path alias `@/*` → root project (lihat `tsconfig.json`). Tidak ada ORM — query SQL langsung lewat `lib/db.ts` (pool tunggal, cached global saat dev).

---

## 3. Arsitektur Sistem

Aplikasi memakai arsitektur **berlapis** khas Next.js App Router: halaman (Server Components) dan Route Handlers memanggil **lapisan modul bisnis** di `lib/`, yang menjadi satu-satunya jalur ke database.

```mermaid
flowchart TB
    subgraph Client["🌐 Client (Browser / Mobile WebView)"]
        LOGIN["Halaman Login /"]
        EMP["Area Karyawan /employee/*"]
        ADM["Area Admin /admin/*"]
        SPV["Area SPV /spv/*"]
    end

    subgraph Next["▲ Next.js App Router (server)"]
        PAGES["Server Components<br/>(app/**/page.tsx)"]
        API["Route Handlers<br/>(app/api/**/route.ts)"]
        GUARD["Guard Sesi<br/>requireAdmin/Employee/SpvSession"]
    end

    subgraph Domain["🧠 Lapisan Bisnis (lib/)"]
        AUTH["auth.ts"]
        HRIS["hris.ts / attendance.ts"]
        PAY["payroll-*.ts"]
        LOAN["loans.ts"]
        OT["overtime*.ts"]
        MISC["employees / jadwal / finance / ..."]
    end

    subgraph Data["💾 Penyimpanan"]
        DB[("MySQL<br/>hris_payroll_app_v2")]
        FS["File Upload<br/>public/uploads/*"]
    end

    AI["🤖 Ollama Cloud<br/>gpt-oss:120b"]

    LOGIN & EMP & ADM & SPV --> PAGES
    LOGIN & EMP & ADM & SPV -->|fetch JSON| API
    PAGES --> GUARD
    API --> GUARD
    GUARD --> AUTH
    PAGES --> Domain
    API --> Domain
    Domain --> DB
    Domain --> FS
    HRIS -.HR Agent.-> AI
    AI -.read-only tool calls.-> DB
```

**Prinsip kunci:**

- **Tanpa middleware global** — proteksi dilakukan per-halaman/route lewat `requireAdminSession()`, `requireEmployeeSession()`, `requireSpvSession()` yang `redirect("/")` bila sesi tidak valid.
- **Migrasi lazy & idempotent** — setiap modul punya `ensureXxxSchemaSupport()` (singleton promise) yang menjalankan `CREATE TABLE IF NOT EXISTS` / `ALTER` saat pertama diakses, dibungkus `safeMigrate` yang menelan error "sudah ada" (`ER_TABLE_EXISTS_ERROR`, `ER_DUP_FIELDNAME`, dll). Schema bisa berevolusi tanpa migrasi manual.
- **Upload** — file (selfie, KTP, bukti) disimpan di `public/uploads/` dan disajikan via rewrite `/uploads/:path*` → `/api/uploads/[...path]`.
- **Real-time payroll** — tidak ada job batch; summary payroll dihitung on-the-fly dari data absensi/lembur terbaru setiap halaman dibuka.

---

## 4. Struktur Direktori

```
web_hr/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Halaman login/signup (entry)
│   ├── layout.tsx, error.tsx     # Root layout & error boundary
│   ├── employee/                 # 14 halaman area karyawan
│   │   ├── check-in / check-out  # Presensi
│   │   ├── overtime / loans      # Lembur & pinjaman
│   │   ├── payslips / bonus-slips# Slip
│   │   └── ...                   # jadwal, contract, profile, visit-report, dll
│   ├── admin/                    # 20+ halaman area admin (lihat sidebar)
│   │   ├── employees, attendance, jadwal, overtime, loans
│   │   ├── payroll-summary/{solo,penjahit,sales-nasional}
│   │   ├── payroll-bonus, payroll-freelance
│   │   ├── payslips, payslip-distribution, bonus-slips, ...
│   │   └── finance, contract-*, reimbursements, roles, hr-agent
│   ├── spv/                      # Area SPV (jadwal + approval lembur)
│   └── api/                      # Route Handlers (REST-ish)
│       ├── login, logout, signup, mobile/login
│       ├── employee/*            # Endpoint karyawan
│       ├── admin/*               # Endpoint admin
│       ├── spv/*                 # Endpoint SPV
│       └── uploads/[...path]     # Serve file upload
├── components/                   # 42 komponen React (Admin*, Employee*, Spv*, Shell, dll)
├── lib/                          # 35 modul bisnis (business logic + akses DB)
├── database/ , db/               # Skrip SQL (schema & seed)
│   └── db/hris_payroll_app_v2.sql# Schema kanonik (nama DB default)
├── scripts/seed-admins.mjs       # Seeder akun admin
├── public/                       # Aset statis + uploads/
├── next.config.ts                # Rewrite /uploads
└── package.json
```

---

## 5. Autentikasi & Sesi

### Mekanisme

- **Password** disimpan sebagai hash **SHA2-256** (dihitung di MySQL via `SHA2(?, 256)`). Login membandingkan hash input dengan kolom `users.password`.
- **Sesi** = token `base64url(payload).HMAC-SHA256(payload)` ditandatangani dengan `APP_SESSION_SECRET`. Disimpan di **cookie httpOnly** (`sameSite=lax`, `secure` di production, `maxAge` 8 jam).
- **Tiga cookie sesi terpisah**: `web_hr_admin_session`, `web_hr_employee_session`, `web_hr_spv_session`.
- **Mobile**: token sama dikirim via header `Authorization: Bearer <token>` (dengan klaim `exp`). Cookie web tidak memakai `exp` (masa berlaku diatur `maxAge`).
- **Verifikasi tanda tangan** memakai `timingSafeEqual` (anti timing-attack).

### Hak akses berbutir (fine-grained)

Selain peran, ada **whitelist email** di `lib/auth.ts` untuk aksi sensitif:

| Fungsi | Arti |
|--------|------|
| `isPayrollEditor(email)` | Hanya email tertentu boleh **edit/simpan** Summary Payroll; admin lain read-only |
| `isOvertimeApprover(email)` | Hanya email tertentu boleh **approve/reject** lembur; admin lain read-only |

> ⚠️ **Catatan keamanan**: jika `APP_SESSION_SECRET` tidak di-set di production, sistem memakai default tidak aman (hanya memicu `console.warn`, tidak throw). **Wajib set env var ini di server.**

---

## 6. Model Data (ERD & Katalog Tabel)

### ERD inti

```mermaid
erDiagram
    users ||--o| karyawan : "1:1 (user_id)"
    karyawan ||--o{ absensi : "presensi harian"
    karyawan ||--o{ jadwal_karyawan : "shift terjadwal"
    karyawan ||--o{ lembur : "pengajuan lembur"
    karyawan ||--o{ pinjaman : "pinjaman"
    pinjaman ||--o{ pinjaman_cicilan : "jadwal cicilan"
    karyawan ||--o{ payroll : "baris payroll/periode"
    payroll ||--o| payroll_employee_input : "override & konfigurasi"
    payroll ||--o| slip_gaji : "slip"
    slip_gaji ||--o{ log_distribusi_slip : "log kirim"
    karyawan ||--o{ potongan_kontrak : "potongan"
    karyawan ||--o{ pengembalian_kontrak : "deposit balik"
    karyawan ||--o{ reimbursements : "reimburse"
    karyawan ||--o{ perjalanan_dinas : "dinas"
    karyawan ||--o{ laporan_kunjungan : "kunjungan sales"
    omzet_bulanan }o--|| karyawan : "bonus omzet (per unit)"

    users {
        int id PK
        string nama
        string email UK
        string password "SHA2-256"
        enum role "admin|karyawan|spv"
        tinyint status_aktif
    }
    karyawan {
        int id PK
        int user_id FK
        string nama
        string jabatan
        string divisi
        string sub_divisi
        string unit
        string penempatan
        string status_kepegawaian
        string tipe_freelance
        enum status_data "aktif|nonaktif"
        string bank
        string no_rekening
        date tanggal_masuk_pertama
    }
    absensi {
        int id PK
        int karyawan_id FK
        date tanggal
        datetime jam_masuk
        datetime jam_pulang
        string status_absensi
        string kode_absensi "O|T|H|S|SX|I|A|L|PA"
        string shift
        int terlambat_menit
        tinyint setengah_hari
    }
    payroll {
        int id PK
        int karyawan_id FK
        int periode_bulan
        int periode_tahun
        int hari_kerja
        decimal gaji_pokok
    }
```

### Katalog tabel

Skema kanonik ada di **`db/hris_payroll_app_v2.sql`**; sebagian tabel juga dibuat lazy via `ensureXxxSchemaSupport()` di `lib/`.

| Kelompok | Tabel |
|----------|-------|
| **Akun & karyawan** | `users`, `karyawan`, `otp_codes` |
| **Presensi & jadwal** | `absensi`, `jadwal_karyawan`, `libur_nasional` |
| **Lembur** | `lembur` |
| **Payroll inti** | `payroll`, `payroll_employee_input`, `payroll_period_config`, `omzet_bulanan`, `payroll_bonus` |
| **Freelance** | `freelance_jam`, `freelance_pengerjaan`, `freelance_harian`, `freelance_custom_item`, `freelance_custom_pengerjaan` |
| **Pinjaman** | `pinjaman`, `pinjaman_cicilan` |
| **Kontrak** | `potongan_kontrak`, `pengembalian_kontrak` |
| **Slip** | `slip_gaji`, `slip_bonus`, `log_distribusi_slip`, `log_distribusi_slip_bonus` |
| **Keuangan lain** | `finance_lembur_tambahan`, `reimbursements`, `perjalanan_dinas` |
| **Sales** | `laporan_kunjungan` |
| **Sistem** | `app_migrations`, `hris_migration_log` |

**Kolom penting `karyawan`** yang mengendalikan banyak logika:
- `jabatan` → menentukan sales/penjahit/freelance/CEO (mis. `getFreelanceSheet` menyaring `jabatan='freelance'`).
- `status_kepegawaian` → `tetap`/`freelance`/dll (memengaruhi tunjangan & waive kontrak).
- `penempatan` → geofence & pemisahan halaman (Toko Solo terpisah).
- `sub_divisi` → penjahit/media/dll (shift & kelas payroll).
- `unit` → kelompok omzet (AVA/Ayres/JNE).
- `status_data` → `aktif`/`nonaktif` (nonaktif hilang dari payroll periode berikutnya).

---

## 7. Alur Utama / Flow Diagram

### 7.1 Login & Routing Peran

Satu endpoint `/api/login` memvalidasi kredensial lalu mengarahkan sesuai `users.role`.

```mermaid
sequenceDiagram
    participant U as Pengguna
    participant P as Halaman / (page.tsx)
    participant API as POST /api/login
    participant DB as MySQL
    participant C as Cookie Sesi

    U->>P: Isi email + password
    P->>API: fetch JSON {email, password}
    API->>DB: SELECT users JOIN karyawan
    alt Akun tidak aktif / nonaktif
        API-->>P: 401 / 403 (pesan jelas)
    else Kredensial valid
        API->>DB: SHA2(password,256) == users.password ?
        API->>C: Set cookie sesi (admin | spv | employee)
        alt role = admin
            API-->>P: redirectTo /admin
        else role = spv
            API-->>P: redirectTo /spv/jadwal
        else role = karyawan
            API-->>P: redirectTo /employee/check-in<br/>(+ minta izin lokasi)
        end
    end
    P->>U: router.push(redirectTo)
```

> Karyawan juga diminta **izin lokasi GPS** saat login (disimpan sementara di `sessionStorage`) agar presensi lancar. Pada tanggal 1 (payday) muncul salam payroll.

### 7.2 Presensi Masuk / Pulang

```mermaid
flowchart TD
    START([Buka Presensi Masuk]) --> PILIH{Jenis presensi}
    PILIH -->|Izin / Sakit| KET[Isi keterangan / upload surat]
    KET --> SIMPAN
    PILIH -->|Hadir / Setengah Hari| GEO{Dalam radius<br/>geofence?}
    GEO -->|Tidak| TOLAK1[❌ Ditolak: di luar lokasi]
    GEO -->|Ya| SHIFT{Punya shift terjadwal?<br/>Toko/Gudang/Media/JNE}
    SHIFT -->|Ya| WINDOW{Dalam window<br/>jam shift?}
    WINDOW -->|Tidak| TOLAK2[❌ Ditolak: di luar jam shift]
    WINDOW -->|Ya| LATE[Hitung keterlambatan<br/>+ set kode O/T/H]
    SHIFT -->|Tidak| LATE
    LATE --> SIMPAN[(INSERT absensi<br/>selfie + lat/long)]
    SIMPAN --> DONE([✅ Masuk tercatat])

    OUT([Buka Presensi Pulang]) --> CHECK{Sudah check-in<br/>hari ini?}
    CHECK -->|Belum| TOLAK3[❌ Belum ada presensi masuk]
    CHECK -->|Ya| GEO2{Dalam radius?}
    GEO2 -->|Tidak| TOLAK4[❌ Di luar lokasi]
    GEO2 -->|Ya| EARLY{Pulang lebih awal?<br/>bukan penjahit/freelance}
    EARLY -->|Ya, tanpa keterangan| TOLAK5[❌ Wajib isi keterangan PA]
    EARLY -->|Ya + keterangan / Tidak| UPD[(UPDATE absensi<br/>jam_pulang + shift final)]
    UPD --> DONE2([✅ Pulang tercatat])
```

**Aturan penting:**
- **Geofence** divalidasi di check-in **dan** check-out (radius per lokasi, lihat §18).
- **Penjahit & Freelance** dibebaskan dari aturan "pulang awal" — boleh check-out kapan pun (freelance dibayar per jam/pcs, jam dihitung dari masuk–pulang).
- **1 presensi per hari**, tidak bisa diubah karyawan; hanya Admin yang bisa koreksi kode.

### 7.3 Lembur & Approval Berjenjang

Alur approval bergantung pada siapa penyetuju yang dipilih pengaju.

```mermaid
flowchart TD
    A[Karyawan ajukan lembur] --> B{Diajukan ke siapa?}
    B -->|ADMIN generic / pengaju Manager| C[Pending → pool Admin]
    B -->|SPV / Supervisor / Manager spesifik| D[Pending → atasan]

    C --> E{Admin putuskan}
    E -->|Approve| F([✅ Approved → masuk payroll])
    E -->|Reject| G([❌ Rejected])

    D --> H{Atasan putuskan<br/>Stage 1}
    H -->|Reject| G
    H -->|Approve| I[Menunggu Admin<br/>Stage 2]
    I --> J{Admin putuskan}
    J -->|Approve| F
    J -->|Reject| G

    style F fill:#1b5e20,color:#fff
    style G fill:#7f1d1d,color:#fff
```

- **1x approval**: pengaju pilih **ADMIN** generic, atau pengaju berjabatan Manager (auto ke admin).
- **2x approval**: pengaju pilih atasan spesifik → atasan approve → **baru** admin bisa approve (admin tidak bisa approve sebelum atasan approve).
- Divisi **Produksi** wajib mengisi field tambahan (Nama Order, QTY, Target Sebelum/Setelah).
- Lembur **approved** otomatis menambah jam lembur di payroll periode tersebut.

### 7.4 Pinjaman (Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> Pending: Karyawan ajukan (≤ Rp3jt)<br/>atau Admin buat (tanpa batas)
    Pending --> Approved: Admin approve<br/>(jadwal cicilan dibuat)
    Pending --> Rejected: Admin reject
    Approved --> Berjalan: Cicilan pertama<br/>dipotong bulan depan
    Berjalan --> Lunas: Semua cicilan terbayar
    Approved --> Lunas: Pelunasan awal (Admin)
    Berjalan --> Lunas: Pelunasan awal (Admin)
    Rejected --> [*]
    Lunas --> [*]
```

**Syarat pengajuan mandiri karyawan:** masa kerja ≥ 6 bulan, tidak ada pinjaman aktif, cooldown 4 bulan setelah lunas, maksimal Rp 3.000.000. Admin dapat membuat pinjaman darurat **tanpa batas**. Cicilan (`pinjaman_cicilan`) otomatis menjadi **potongan pinjaman** di payroll bulan bersangkutan.

### 7.5 Pipeline Payroll

Mesin payroll (`lib/payroll-summary.ts`) menggabungkan banyak sumber data **secara real-time** menjadi Take Home Pay per karyawan.

```mermaid
flowchart LR
    subgraph SRC["Sumber Data (real-time)"]
        A1[absensi<br/>hadir/telat/½hari]
        A2[lembur approved]
        A3[jadwal_karyawan<br/>hari kerja terjadwal]
        A4[pinjaman_cicilan<br/>potongan bulan ini]
        A5[potongan_kontrak]
        A6[pengembalian_kontrak]
        A7[reimbursements]
        A8[omzet_bulanan<br/>bonus per unit]
        A9[payroll_employee_input<br/>konfigurasi & override]
        A10[getFreelanceSheet<br/>total freelance]
    end

    ENGINE{{getAdminPayrollSummarySheet<br/>per periode 26→25}}

    A1 & A2 & A3 & A4 & A5 & A6 & A7 & A8 & A9 & A10 --> ENGINE

    ENGINE --> O1[Gaji pokok / kontrak]
    ENGINE --> O2[Tunjangan & bonus<br/>omzet, kerajinan, BPJS, dll]
    ENGINE --> O3[Potongan<br/>telat, ½hari, kontrak, pinjaman]
    O1 & O2 & O3 --> THP[[Take Home Pay]]
    THP --> SLIP[Slip Gaji PDF]
    THP --> FIN[Finance Export XLSX]
    THP --> SUM[Summary Payroll / Solo / Penjahit / Sales Nasional]
```

**Aturan turunan absensi (penting & konsisten dengan rekap):**
- **Telat** dihitung dari `kode_absensi = 'T'` (bukan recompute `terlambat_menit`).
- **Setengah hari** mengikuti resolusi kode absensi (`mapAttendanceCode`): `H`/`SH` = ya; `T`/`SX` + jam ½hari = ya; kode `O`/`PA` = **bukan** ½hari. Ini mencegah potongan palsu setelah admin mengganti kode manual.
- Periode: `getActivePayrollPeriod()` otomatis pindah ke bulan berikutnya bila tanggal > 25.

### 7.6 Payroll Freelance

Karyawan `jabatan = 'freelance'` dibagi 4 tipe (`tipe_freelance`), masing-masing punya cara hitung berbeda; totalnya menjadi **satu sumber kebenaran** yang juga dipakai slip gaji.

```mermaid
flowchart TD
    F[Karyawan Freelance] --> T{tipe_freelance}
    T -->|jam| J[Rate/jam × jam kerja<br/>dari jam masuk–pulang absensi<br/>dibulatkan per 30 mnt]
    T -->|pengerjaan| P[Harga/pcs × jumlah pcs]
    T -->|harian| H[Harga/hari × hari hadir]
    T -->|custom_pengerjaan| C[Σ harga/pcs × qty<br/>per jenis item]
    J & P & H & C --> TOTAL[[Total Gaji Freelance]]
    TOTAL --> SLIPF[Slip Gaji = total ini persis]
    TOTAL --> SUMF[Summary Payroll Freelance]
```

> Karena `getFreelanceSheet` menyaring berdasarkan **jabatan** `'freelance'`, mesin payroll mengenali freelancer lewat kehadirannya di sheet ini (bukan hanya `status_kepegawaian`) agar slip gaji **selalu sama** dengan Summary Payroll Freelance.

### 7.7 Slip Gaji & Distribusi

```mermaid
sequenceDiagram
    participant AD as Admin
    participant PS as Slip Gaji (page)
    participant DIST as Distribusi Slip
    participant DB as slip_gaji / log_distribusi_slip
    participant EMP as Karyawan

    AD->>PS: Pilih periode & karyawan
    PS->>PS: Render slip (data payroll real-time)
    AD->>PS: Export PDF (opsional)
    AD->>DIST: Pilih karyawan aktif → Distribusi
    DIST->>DB: Catat slip + log distribusi
    EMP->>DB: Buka menu Slip Gaji
    DB-->>EMP: Slip periode tersedia (read-only, unduh PDF)
```

> Distribusi hanya menampilkan **karyawan aktif** (`status_data='aktif'`). Slip bonus dikelola terpisah (`bonus-slips`, `bonus-slip-distribution`).

---

## 8. Modul Bisnis (`lib/`)

| Modul | Tanggung jawab |
|-------|----------------|
| `db.ts` | Pool MySQL tunggal (cached global saat dev), `namedPlaceholders` |
| `auth.ts` | Sesi HMAC, guard peran, whitelist editor payroll & approver lembur |
| `employees.ts` | CRUD karyawan, signup, migrasi kolom karyawan |
| `attendance.ts` | Aturan shift, window jam, deteksi telat/½hari, geofence-time, foto |
| `attendance-recompute.ts` | Recompute kode absensi & migrasi `app_migrations` |
| `hris.ts` | Rekap absensi (spreadsheet), `mapAttendanceCode`, set kode manual, dashboard |
| `jadwal-karyawan.ts` | Set jadwal shift, hari efektif |
| `geofence.ts` | Titik & radius lokasi, validasi jarak (haversine) |
| `overtime.ts`, `overtime-approval.ts` | Lembur, approval berjenjang, approver |
| `loans.ts` | Pinjaman, cicilan otomatis, pelunasan awal |
| `payroll-admin.ts` | Periode payroll, clone periode, omzet & grup unit |
| `payroll-summary.ts` | **Mesin payroll utama** (summary, THP, override) |
| `payroll-penjahit.ts` | Payroll penjahit mingguan/bulanan |
| `payroll-freelance.ts` | 4 tipe freelance + upsert rate/qty |
| `payroll-bonus.ts` | Payroll bonus sales/SPV/dll |
| `payslip-row.ts`, `bonus-slip.ts` | Map baris slip, slip bonus & distribusi |
| `contract-deductions.ts`, `contract-returns.ts`, `contract-timeline.ts` | Kontrak & deposit |
| `reimbursements.ts`, `business-trips.ts` | Reimburse & perjalanan dinas |
| `visit-reports.ts` | Laporan kunjungan sales |
| `holidays.ts` | Libur nasional |
| `hr-agent.ts` | HR Agent (Ollama, tool-calling read-only, tabel di-whitelist) |
| `*-roles.ts`, `payroll-constants.ts` | Konstanta peran & tarif (mis. omzet 0.7%) |
| `uploads.ts`, `api-json.ts` | Util upload & respons JSON |

---

## 9. Peta API Endpoint

Endpoint dikelompokkan per audiens. Semua memvalidasi sesi peran terkait.

**Auth (publik):** `POST /api/login`, `POST /api/signup`, `POST /api/logout`, `POST /api/mobile/login`

**Karyawan** (`/api/employee/*`): `attendance/check-in`, `attendance/check-out`, `attendance/today`, `attendance/history`, `overtime`, `overtime-approvals/[id]`, `loans`, `payslips`, `bonus-slips`, `reimbursements`, `business-trips`, `contract`, `profile`, `visit-report`, `overview`

**Admin** (`/api/admin/*`): `employees/*` (+ `export`), `attendance/{update,holiday,recover}`, `overtime/[id]`, `loans/[id]/payoff`, `payroll-summary/*` (+ `finance-export`), `payroll-bonus/[id]`, `payroll-freelance`, `freelance/{jam,harian,pengerjaan,custom-items,custom-pengerjaan}`, `payslip-distribution`, `bonus-slip-distribution`, `contract-deductions/[id]`, `contract-returns`, `reimbursements/[id]`, `business-trips/[id]`, `visit-reports/summary`, `finance/lembur`, `roles/[id]`, `hr-agent`, `login`, `logout`

**SPV** (`/api/spv/*`): `jadwal`, `overtime-approvals/[id]`, `logout`

**Berkas:** `GET /api/uploads/[...path]` (via rewrite `/uploads/*`)

---

## 10. Setup & Menjalankan

```bash
# 1) Install dependensi
npm install

# 2) Siapkan database MySQL
#    Buat database lalu import schema kanonik:
mysql -u root hris_payroll_app_v2 < db/hris_payroll_app_v2.sql

# 3) Buat file .env.local (lihat §11)

# 4) Seed akun admin (opsional)
node scripts/seed-admins.mjs

# 5) Jalankan dev server
npm run dev        # http://localhost:3000

# Build & production
npm run build
npm run start
npm run lint       # ESLint (eslint-config-next)
```

> Tabel yang belum ada akan dibuat otomatis saat modul terkait pertama diakses (migrasi lazy), sehingga import schema dasar + jalan aplikasi sudah cukup untuk lingkungan baru.

---

## 11. Environment Variables

| Variabel | Wajib | Default | Keterangan |
|----------|:-----:|---------|-----------|
| `DB_HOST` | ✔ | `127.0.0.1` | Host MySQL |
| `DB_PORT` | ✔ | `3306` | Port MySQL |
| `DB_USER` | ✔ | `root` | User MySQL |
| `DB_PASSWORD` |  | `` | Password MySQL |
| `DB_NAME` | ✔ | `hris_payroll_app_v2` | Nama database |
| `APP_SESSION_SECRET` | ✔ (prod) | *dev fallback* | **Kunci tanda tangan sesi** — wajib di production |
| `OLLAMA_HOST` |  | `https://ollama.com` | Endpoint HR Agent |
| `OLLAMA_KEY` |  | `` | API key Ollama Cloud |
| `OLLAMA_MODEL` |  | `gpt-oss:120b-cloud` | Model HR Agent |
| `SMTP_HOST/PORT/USER/PASS/FROM` |  | — | Kirim email (OTP/notifikasi) |

Contoh `.env.local`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=hris_payroll_app_v2
APP_SESSION_SECRET=ganti-dengan-string-acak-panjang
```

---

## 12. Deployment

- **Build**: `npm run build` menghasilkan output Next.js standar; jalankan `npm run start` di belakang reverse proxy (Nginx/hcdn).
- **Cache**: route login memakai header `no-store` + `dynamic = "force-dynamic"` agar CDN/WAF tidak menyimpan respons autentikasi.
- **Berkas upload** disimpan di filesystem (`public/uploads`) — pastikan volume persisten di production.
- **Wajib** set `APP_SESSION_SECRET` dan kredensial DB via environment. Terdapat `.env.railway` untuk konfigurasi Railway.
- Jalankan dengan Node.js (bukan edge runtime) karena memakai `mysql2` dan `node:crypto`.

---

## 13. Catatan Keamanan & Teknis

- **Password hashing SHA2-256 tanpa salt** — cukup untuk konteks internal, namun idealnya di-upgrade ke bcrypt/argon2 bila memungkinkan.
- **`APP_SESSION_SECRET`** menentukan integritas seluruh sesi; jangan pakai default di production.
- **HR Agent** hanya boleh membaca daftar tabel yang di-whitelist (mengecualikan `users.password` & `otp_codes`).
- **Geofence** memakai perhitungan jarak haversine; akurasi bergantung sinyal GPS klien.
- **Migrasi lazy** memudahkan evolusi schema, tetapi urutan kolom pada beberapa tabel bergantung pada `ALTER` idempotent — hindari mengandalkan posisi kolom.
- **Timezone** selalu Asia/Jakarta; hindari `new Date()` polos untuk logika tanggal payroll — gunakan helper periode.

---

# BAGIAN B — PANDUAN PENGGUNA

## 14. Peran & Hak Akses

Terdapat **3 jenis akun**:

| Peran | Akses | Login |
|-------|-------|-------|
| **Karyawan (Staff)** | Presensi, lembur, pinjaman, slip, reimburse | Halaman utama |
| **Supervisor / Manager** | Set jadwal + approval lembur tim | Otomatis di menu karyawan, atau login SPV khusus |
| **Admin** | Akses penuh seluruh sistem | Login admin |

> Supervisor/Manager yang berstatus karyawan aktif tetap bisa presensi pribadi; menu **Set Jadwal** & **Approval Lembur** muncul otomatis di area karyawan mereka.

### Ringkasan hak akses

| Fitur | Karyawan | SPV/Manager | Admin |
|-------|:--------:|:-----------:|:-----:|
| Check-in / Check-out | ✅ | ✅ | — |
| Lihat absensi sendiri | ✅ | ✅ | ✅ |
| Lihat/edit absensi semua | — | — | ✅ |
| Ajukan lembur | ✅ | ✅ | — |
| Approve lembur (atasan / final) | — | ✅ (stage 1) | ✅ (final) |
| Set jadwal shift | — | ✅ | ✅ |
| Ajukan pinjaman (≤ Rp3jt) | ✅ | ✅ | — |
| Buat/approve pinjaman | — | — | ✅ |
| Lihat slip sendiri | ✅ | ✅ | ✅ |
| Kelola payroll & distribusi slip | — | — | ✅ |
| Kelola karyawan / role | — | — | ✅ |
| Approval reimburse & dinas | — | — | ✅ |

---

## 15. Alur Karyawan

### 15.1 Login
Masukkan email & password → diarahkan ke dashboard karyawan (mulai dari Presensi Masuk). Lupa password → hubungi Admin HR.

### 15.2 Presensi Masuk (Check-In)
Pilih jenis presensi, lalu:

| Pilihan | Kode | Syarat |
|---------|------|--------|
| Masuk (Hadir) | O | Selfie + GPS |
| Izin / Off | I | Wajib keterangan |
| Sakit + Surat | S | Upload surat |
| Sakit tanpa surat | SX | Wajib keterangan |
| Setengah Hari | H | Selfie + GPS |

Aturan: **1x sehari**, tidak bisa diubah; untuk Toko/Gudang/Media/JNE divalidasi jam shift; jadwal **libur** menolak presensi; keterlambatan dihitung otomatis.

### 15.3 Presensi Pulang (Check-Out)
Selfie + GPS. Harus sudah check-in. **Pulang Awal (PA)** wajib keterangan (kecuali penjahit & freelance yang dibebaskan). Shift final disimpan otomatis.

### 15.4 Pengajuan Lembur
Isi tanggal, jam mulai–selesai, penyetuju, jenis pekerjaan, deadline. **Divisi Produksi** wajib mengisi Nama Order, QTY, Target Sebelum/Setelah. Dropdown penyetuju bergantung jabatan pengaju (Staff→SPV/atasan/ADMIN; Supervisor→Manager/ADMIN; Manager→ADMIN otomatis). Lihat alur approval di [§7.3](#73-lembur--approval-berjenjang).

### 15.5 Pengajuan Pinjaman
Syarat: masa kerja ≥ 6 bulan, tidak ada pinjaman aktif, cooldown 4 bulan setelah lunas, maks Rp 3.000.000. Sistem menampilkan preview potongan/bulan. Lihat lifecycle di [§7.4](#74-pinjaman-lifecycle).

### 15.6 Slip Gaji & Bonus
Lihat & unduh slip per periode (tersedia setelah Admin distribusi). Header **AvA Group**.

### 15.7 Reimburse & Perjalanan Dinas
Ajukan dengan bukti/detail → menunggu persetujuan Admin.

### 15.8 Riwayat Absensi & Kontrak
Rekap presensi pribadi (jam, status, kode, keterangan PA) dan info kontrak (read-only).

---

## 16. Alur Supervisor & Manager

### 16.1 Set Jadwal
Bisa dilakukan SPV/Manager/Admin (dan karyawan yang di-whitelist scheduler). Pilih bulan → klik sel (karyawan × tanggal) → pilih shift → simpan.

**Shift & window jam** — lihat [§18.2](#182-shift--jam-kerja). **Aturan shift per penempatan:**

| Penempatan | Shift diperbolehkan |
|-----------|--------------------|
| Toko Solo | pagi, libur |
| JNE | jne_pagi, jne_siang, jne_minggu, libur |
| Media (sub divisi) | pagi, siang, libur |
| Lainnya | pagi, siang, lembur, setengah_1, setengah_2, libur |

### 16.2 Approval Lembur
Hanya pengajuan yang ditujukan kepada Anda yang muncul. Approve/Reject + catatan. Setelah Anda approve → masuk ke Admin (stage 2). Jika Anda reject → langsung final rejected.

---

## 17. Alur Admin

| Modul | Ringkasan |
|-------|-----------|
| **Data Karyawan** | CRUD, nonaktifkan, upload/download KTP, atur bank & rekening |
| **Absensi** | Rekap semua, filter, modal Detail (foto/peta), ubah kode manual |
| **Set Jadwal** | Jadwal semua karyawan tanpa batasan |
| **Lembur** | 2 tab (Langsung ke Admin / Via Atasan), modal detail, approve/reject |
| **Pinjaman** | Buat pinjaman darurat (tanpa batas), approve/reject, pelunasan awal |
| **Summary Payroll** | Mesin payroll utama; edit override, input omzet, real-time |
| **Summary Payroll Solo** | Khusus penempatan Toko Solo (omzet tanpa multiplier) |
| **Summary Penjahit** | Penjahit mingguan/bulanan |
| **Summary Sales Nasional** | Sales Nasional (komisi & omzet) |
| **Summary Payroll Freelance** | 4 tipe freelance (jam/pengerjaan/harian/custom) |
| **Slip Gaji / Distribusi** | Render, export PDF, distribusi ke karyawan aktif |
| **Slip Bonus / Distribusi** | Terpisah dari slip gaji |
| **Finance** | Rekap keuangan per unit + lembur custom |
| **Reimburse / Perjalanan Dinas** | Approval |
| **Role** | Kelola akun Admin & SPV |
| **HR Agent** | Tanya-jawab data HR berbasis AI (read-only) |

**Periode payroll:** 26 (M-1) → 25 (M). Contoh: Juni = 26 Mei – 25 Juni. Otomatis pindah periode jika tanggal > 25. Karyawan nonaktif hilang dari periode berikutnya.

**Pemisahan halaman payroll:** karyawan **Toko Solo** dan **Penjahit** tidak muncul di Summary Payroll utama — masing-masing punya halaman sendiri.

---

## 18. Aturan Sistem

### 18.1 Aturan Presensi
1 presensi/hari · tidak bisa diubah karyawan · Admin bisa koreksi · selfie & GPS wajib untuk hadir · keterangan wajib untuk izin/sakit tanpa surat · surat wajib untuk sakit resmi · PA wajib keterangan (kecuali penjahit/freelance).

### 18.2 Shift & Jam Kerja

| Shift | Check-In | Check-Out |
|-------|----------|-----------|
| pagi | 08:00–08:30 | 16:30–17:30 |
| siang | 11:45–12:00 | 20:00–21:00 |
| lembur | 09:45–10:00 | 20:00–21:00 |
| setengah_1 | 10:30–13:00 | 16:30–17:30 |
| setengah_2 | 08:00–08:30 | 12:00–13:00 |
| pagi_full | 08:00–08:30 | 16:30–17:30 |
| pagi_short | 08:00–08:30 | 14:30–15:30 |
| siang_sore | 11:45–12:00 | 16:30–17:30 |
| jne_pagi | 07:30–11:00 | 15:30–16:30 |
| jne_siang | 13:30–17:00 | 20:30–21:30 |
| jne_minggu | 12:30–14:00 | 19:30–20:30 |
| libur | — | — |

**Toleransi telat:** JNE 10 menit; shift lain 5 menit.

### 18.3 Geofence (radius lokasi)

| Lokasi | Radius |
|--------|--------|
| Office (Jl. Wonocatur) | 50 m |
| Toko (AVA Sport Store) | 50 m |
| Toko Solo (Kartasura) | 50 m |
| Ayres Apparel | 50 m |
| JNE Ambarrukmo | 50 m |
| Bank BCA KC Adisucipto | 100 m |
| Gudang Avasportivo | 25 m |

> **WFA (Work From Anywhere)** tidak terkena validasi geofence.

### 18.4 Aturan Periode Payroll
Rentang 26 (M-1) – 25 (M) · hari kerja Senin–Sabtu (tanpa Minggu) · real-time dari absensi · karyawan nonaktif hilang periode berikutnya.

### 18.5 Omzet & Bonus
- Grup **AVA + Ayres** → bonus = total omzet × **0,7%**, dibagi ke karyawan eligible × role factor.
- **JNE** → `is_custom_bonus`, nominal input dipakai langsung.
- **Toko Solo** → input manual tanpa multiplier.
- CEO & Freelance **tidak** dapat bonus omzet (factor 0).

---

## 19. Kode Status Presensi

| Kode | Nama | Keterangan |
|------|------|-----------|
| **O** | Hadir | Masuk tepat waktu |
| **T** | Terlambat | Masuk setelah jam shift (+toleransi) |
| **I** | Izin | Izin/Off (dengan keterangan) |
| **S** | Sakit | Dengan surat |
| **SX** | Sakit tanpa surat | Tanpa dokumen |
| **H** | Setengah Hari | Hadir ½ hari |
| **PA** | Pulang Awal | Pulang sebelum jam checkout + keterangan (di DB: hadir + keterangan) |
| **L** | Libur | Libur terjadwal |
| **A** | Alfa | Tidak hadir tanpa keterangan |
| **C** | Cuti | Cuti resmi |

---

## 20. FAQ

**GPS tidak akurat?** Pastikan GPS aktif & izin diberikan, tunggu sinyal, pakai tombol Refresh, pindah ke area terbuka.

**Lupa check-out kemarin?** Hubungi Admin — karyawan tidak bisa mengisi check-out hari lampau.

**Salah status check-in?** Tidak bisa diubah sendiri; Admin dapat mengoreksi kode via modal detail absensi.

**Lembur sudah di-approve atasan tapi masih "menunggu admin"?** Karena Anda memakai alur **2x approval** (via atasan). Setelah atasan approve, admin masih perlu finalisasi. Pilih **ADMIN** generic saat submit bila ingin 1x approve.

**Baru kerja 4 bulan, kapan bisa pinjam?** Setelah masa kerja **6 bulan**.

**Cicilan belum terpotong?** Cicilan tercermin saat payroll periode terkait dihitung.

**PA vs Izin?** PA = sudah check-in hadir lalu pulang sebelum jam checkout (tetap hadir + keterangan). Izin = tidak masuk sejak awal.

**Karyawan Toko Solo tidak muncul di Summary utama?** Sengaja dipisah ke **Summary Payroll Solo**. Slip gaji Anda tetap normal.

**Slip belum muncul?** Slip tersedia setelah Admin mendistribusikannya.

**Freelance dihitung bagaimana?** Sesuai `tipe_freelance` (jam/pengerjaan/harian/custom) — lihat [§7.6](#76-payroll-freelance). Slip gaji mengikuti total di Summary Payroll Freelance persis.

**Bisa check-in di luar jam shift?** Untuk karyawan bershift (Toko/Gudang/Media/JNE), check-in di luar window ditolak. Karyawan lain diterima namun telat tetap dicatat.

---

> **Kendala teknis atau pertanyaan lain → hubungi Admin HR AvA Group.**
>
> *Dokumentasi ini mencakup arsitektur teknis dan panduan pengguna sistem Web HR AvA Group.*
