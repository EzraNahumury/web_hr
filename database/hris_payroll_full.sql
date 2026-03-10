-- =========================================================
-- HRIS Absensi dan Payroll Karyawan
-- Target: MySQL / MariaDB (XAMPP)
-- Database baru: hris_payroll_app
-- =========================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS hris_payroll_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hris_payroll_app;

DROP TABLE IF EXISTS log_distribusi_slip;
DROP TABLE IF EXISTS slip_gaji;
DROP TABLE IF EXISTS payroll;
DROP TABLE IF EXISTS potongan_kontrak;
DROP TABLE IF EXISTS pinjaman;
DROP TABLE IF EXISTS lembur;
DROP TABLE IF EXISTS absensi;
DROP TABLE IF EXISTS karyawan;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'karyawan') NOT NULL,
  status_aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_status (role, status_aktif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE karyawan (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  no_karyawan VARCHAR(50) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  jabatan VARCHAR(100) NOT NULL,
  divisi VARCHAR(100) NOT NULL,
  departemen VARCHAR(100) NOT NULL,
  pembagian_rekapan VARCHAR(100) NULL,
  bank VARCHAR(100) NULL,
  no_rekening VARCHAR(50) NULL,
  status_kerja ENUM('tetap', 'kontrak', 'freelance', 'magang', 'resign') NOT NULL DEFAULT 'kontrak',
  tanggal_kontrak DATE NULL,
  tanggal_selesai_kontrak DATE NULL,
  kenaikan_tiap_tahun DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_karyawan_user_id (user_id),
  UNIQUE KEY uq_karyawan_no_karyawan (no_karyawan),
  KEY idx_karyawan_nama (nama),
  KEY idx_karyawan_departemen (departemen),
  KEY idx_karyawan_status_kerja (status_kerja),
  CONSTRAINT fk_karyawan_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE absensi (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  karyawan_id BIGINT UNSIGNED NOT NULL,
  tanggal DATE NOT NULL,
  jam_masuk DATETIME NULL,
  jam_pulang DATETIME NULL,
  status_absensi ENUM('hadir', 'sakit', 'izin', 'libur', 'setengah_hari', 'alfa') NOT NULL DEFAULT 'hadir',
  kode_absensi VARCHAR(30) NULL,
  foto_masuk VARCHAR(255) NULL,
  foto_pulang VARCHAR(255) NULL,
  latitude_masuk DECIMAL(10,7) NULL,
  longitude_masuk DECIMAL(10,7) NULL,
  latitude_pulang DECIMAL(10,7) NULL,
  longitude_pulang DECIMAL(10,7) NULL,
  terlambat_menit INT UNSIGNED NOT NULL DEFAULT 0,
  setengah_hari TINYINT(1) NOT NULL DEFAULT 0,
  lembur_jam DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  keterangan VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_absensi_karyawan_tanggal (karyawan_id, tanggal),
  KEY idx_absensi_tanggal (tanggal),
  KEY idx_absensi_status (status_absensi),
  KEY idx_absensi_kode (kode_absensi),
  CONSTRAINT fk_absensi_karyawan
    FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lembur (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  karyawan_id BIGINT UNSIGNED NOT NULL,
  tanggal DATE NOT NULL,
  jam_mulai DATETIME NOT NULL,
  jam_selesai DATETIME NOT NULL,
  total_jam DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  bukti_lembur VARCHAR(255) NULL,
  status_approval ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  catatan_atasan VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lembur_karyawan_tanggal (karyawan_id, tanggal),
  KEY idx_lembur_status_approval (status_approval),
  KEY idx_lembur_approved_by (approved_by),
  CONSTRAINT fk_lembur_karyawan
    FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_lembur_approved_by
    FOREIGN KEY (approved_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pinjaman (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  karyawan_id BIGINT UNSIGNED NOT NULL,
  jumlah_pinjaman DECIMAL(14,2) NOT NULL,
  angsuran_per_bulan DECIMAL(14,2) NOT NULL,
  total_sudah_bayar DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  sisa_pinjaman DECIMAL(14,2) NOT NULL,
  tanggal_pengajuan DATE NOT NULL,
  status_pinjaman ENUM('pending', 'approved', 'berjalan', 'lunas', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pinjaman_karyawan (karyawan_id),
  KEY idx_pinjaman_status (status_pinjaman),
  KEY idx_pinjaman_tanggal_pengajuan (tanggal_pengajuan),
  CONSTRAINT fk_pinjaman_karyawan
    FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE potongan_kontrak (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  karyawan_id BIGINT UNSIGNED NOT NULL,
  bulan TINYINT UNSIGNED NOT NULL,
  tahun SMALLINT UNSIGNED NOT NULL,
  nominal_potongan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  keterangan VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_potongan_kontrak_periode (karyawan_id, bulan, tahun),
  KEY idx_potongan_kontrak_periode (tahun, bulan),
  CONSTRAINT fk_potongan_kontrak_karyawan
    FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_potongan_kontrak_bulan CHECK (bulan BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payroll (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  karyawan_id BIGINT UNSIGNED NOT NULL,
  periode_bulan TINYINT UNSIGNED NOT NULL,
  periode_tahun SMALLINT UNSIGNED NOT NULL,
  hari_kerja INT UNSIGNED NOT NULL DEFAULT 0,
  total_masuk INT UNSIGNED NOT NULL DEFAULT 0,
  total_lembur_jam DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  total_terlambat INT UNSIGNED NOT NULL DEFAULT 0,
  total_setengah_hari INT UNSIGNED NOT NULL DEFAULT 0,
  gaji_pokok DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tunjangan_jabatan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tunjangan_lain DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  bonus_performa DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  bpjs DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  uang_makan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  transport DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  insentif DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  upah_lembur DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  potongan_keterlambatan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  potongan_setengah_hari DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  potongan_kontrak DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  potongan_pinjaman DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  potongan_kerajinan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_potongan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  gaji_bersih DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  status_payroll ENUM('draft', 'processed', 'approved_finance', 'paid') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payroll_periode (karyawan_id, periode_bulan, periode_tahun),
  KEY idx_payroll_periode (periode_tahun, periode_bulan),
  KEY idx_payroll_status (status_payroll),
  CONSTRAINT fk_payroll_karyawan
    FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_payroll_bulan CHECK (periode_bulan BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE slip_gaji (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payroll_id BIGINT UNSIGNED NOT NULL,
  nomor_slip VARCHAR(50) NOT NULL,
  tanggal_distribusi DATETIME NULL,
  status_distribusi ENUM('draft', 'didistribusikan', 'dibaca') NOT NULL DEFAULT 'draft',
  file_slip VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slip_gaji_payroll_id (payroll_id),
  UNIQUE KEY uq_slip_gaji_nomor_slip (nomor_slip),
  KEY idx_slip_gaji_status (status_distribusi),
  CONSTRAINT fk_slip_gaji_payroll
    FOREIGN KEY (payroll_id) REFERENCES payroll (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE log_distribusi_slip (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slip_gaji_id BIGINT UNSIGNED NOT NULL,
  karyawan_id BIGINT UNSIGNED NOT NULL,
  didistribusikan_oleh BIGINT UNSIGNED NOT NULL,
  tanggal_distribusi DATETIME NOT NULL,
  status_baca TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_log_distribusi_slip_gaji_id (slip_gaji_id),
  KEY idx_log_distribusi_karyawan_id (karyawan_id),
  KEY idx_log_distribusi_didistribusikan_oleh (didistribusikan_oleh),
  KEY idx_log_distribusi_tanggal (tanggal_distribusi),
  CONSTRAINT fk_log_distribusi_slip
    FOREIGN KEY (slip_gaji_id) REFERENCES slip_gaji (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_log_distribusi_karyawan
    FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_log_distribusi_admin
    FOREIGN KEY (didistribusikan_oleh) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Dummy data
-- Password disimpan sebagai SHA2-256 agar langsung importable di MySQL.
-- Untuk production sebaiknya gunakan bcrypt/argon2 di aplikasi.
-- =========================================================

INSERT INTO users (id, nama, email, password, role, status_aktif) VALUES
  (1, 'Ezra Kristanto', 'ezra.kristanto@ti.ukdw.ac.id', SHA2('ftiukdw2022', 256), 'admin', 1),
  (2, 'Rina Saputri', 'rina.saputri@company.local', SHA2('rina12345', 256), 'karyawan', 1),
  (3, 'Budi Hartono', 'budi.hartono@company.local', SHA2('budi12345', 256), 'karyawan', 1);

INSERT INTO karyawan (
  id,
  user_id,
  no_karyawan,
  nama,
  jabatan,
  divisi,
  departemen,
  pembagian_rekapan,
  bank,
  no_rekening,
  status_kerja,
  tanggal_kontrak,
  tanggal_selesai_kontrak,
  kenaikan_tiap_tahun
) VALUES
  (
    1,
    2,
    'KRY-2026-001',
    'Rina Saputri',
    'Staff Admin',
    'Operasional',
    'Office',
    'Rekapan Office',
    'BCA',
    '1234567890',
    'kontrak',
    '2026-01-01',
    '2026-12-31',
    500000.00
  ),
  (
    2,
    3,
    'KRY-2026-002',
    'Budi Hartono',
    'Partner Toko',
    'Penjualan',
    'Toko',
    'Rekapan Toko',
    'BRI',
    '9876543210',
    'tetap',
    '2025-06-01',
    NULL,
    750000.00
  );

INSERT INTO absensi (
  karyawan_id,
  tanggal,
  jam_masuk,
  jam_pulang,
  status_absensi,
  kode_absensi,
  foto_masuk,
  foto_pulang,
  latitude_masuk,
  longitude_masuk,
  latitude_pulang,
  longitude_pulang,
  terlambat_menit,
  setengah_hari,
  lembur_jam,
  keterangan
) VALUES
  (
    1,
    '2026-03-01',
    '2026-03-01 08:34:00',
    '2026-03-01 16:35:00',
    'hadir',
    'ABS-MASUK',
    'uploads/absensi/rina-masuk-20260301.jpg',
    'uploads/absensi/rina-pulang-20260301.jpg',
    -7.8012345,
    110.3645678,
    -7.8012455,
    110.3645778,
    4,
    0,
    0.00,
    'Terlambat ringan'
  ),
  (
    2,
    '2026-03-01',
    '2026-03-01 08:29:00',
    '2026-03-01 18:45:00',
    'hadir',
    'ABS-MASUK',
    'uploads/absensi/budi-masuk-20260301.jpg',
    'uploads/absensi/budi-pulang-20260301.jpg',
    -7.8023456,
    110.3656789,
    -7.8023556,
    110.3656889,
    0,
    0,
    2.00,
    'Lembur toko'
  );

INSERT INTO lembur (
  id,
  karyawan_id,
  tanggal,
  jam_mulai,
  jam_selesai,
  total_jam,
  bukti_lembur,
  status_approval,
  approved_by,
  catatan_atasan
) VALUES
  (
    1,
    2,
    '2026-03-01',
    '2026-03-01 16:30:00',
    '2026-03-01 18:30:00',
    2.00,
    'uploads/lembur/budi-lembur-20260301.jpg',
    'approved',
    1,
    'Disetujui karena pengganti shift libur'
  ),
  (
    2,
    1,
    '2026-03-05',
    '2026-03-05 16:30:00',
    '2026-03-05 17:30:00',
    1.00,
    'uploads/lembur/rina-lembur-20260305.jpg',
    'pending',
    NULL,
    NULL
  );

INSERT INTO pinjaman (
  id,
  karyawan_id,
  jumlah_pinjaman,
  angsuran_per_bulan,
  total_sudah_bayar,
  sisa_pinjaman,
  tanggal_pengajuan,
  status_pinjaman
) VALUES
  (
    1,
    1,
    1500000.00,
    300000.00,
    600000.00,
    900000.00,
    '2026-01-15',
    'berjalan'
  ),
  (
    2,
    2,
    2000000.00,
    500000.00,
    0.00,
    2000000.00,
    '2026-03-02',
    'approved'
  );

INSERT INTO potongan_kontrak (
  id,
  karyawan_id,
  bulan,
  tahun,
  nominal_potongan,
  keterangan
) VALUES
  (
    1,
    1,
    3,
    2026,
    200000.00,
    'Potongan uang jaminan kontrak bulan Maret 2026'
  ),
  (
    2,
    2,
    3,
    2026,
    0.00,
    'Tidak ada potongan kontrak'
  );

INSERT INTO payroll (
  id,
  karyawan_id,
  periode_bulan,
  periode_tahun,
  hari_kerja,
  total_masuk,
  total_lembur_jam,
  total_terlambat,
  total_setengah_hari,
  gaji_pokok,
  tunjangan_jabatan,
  tunjangan_lain,
  bonus_performa,
  bpjs,
  uang_makan,
  transport,
  insentif,
  upah_lembur,
  potongan_keterlambatan,
  potongan_setengah_hari,
  potongan_kontrak,
  potongan_pinjaman,
  potongan_kerajinan,
  total_potongan,
  gaji_bersih,
  status_payroll
) VALUES
  (
    1,
    1,
    3,
    2026,
    26,
    25,
    0.00,
    12,
    0,
    3200000.00,
    300000.00,
    150000.00,
    100000.00,
    120000.00,
    250000.00,
    150000.00,
    0.00,
    0.00,
    20000.00,
    0.00,
    200000.00,
    300000.00,
    0.00,
    520000.00,
    3630000.00,
    'processed'
  ),
  (
    2,
    2,
    3,
    2026,
    26,
    26,
    8.00,
    0,
    0,
    3500000.00,
    450000.00,
    200000.00,
    250000.00,
    140000.00,
    300000.00,
    200000.00,
    100000.00,
    160000.00,
    0.00,
    0.00,
    0.00,
    500000.00,
    0.00,
    500000.00,
    4660000.00,
    'approved_finance'
  );

INSERT INTO slip_gaji (
  id,
  payroll_id,
  nomor_slip,
  tanggal_distribusi,
  status_distribusi,
  file_slip
) VALUES
  (
    1,
    1,
    'SLIP-202603-001',
    '2026-03-31 17:00:00',
    'didistribusikan',
    'uploads/slip/slip-rina-202603.pdf'
  ),
  (
    2,
    2,
    'SLIP-202603-002',
    '2026-03-31 17:10:00',
    'dibaca',
    'uploads/slip/slip-budi-202603.pdf'
  );

INSERT INTO log_distribusi_slip (
  slip_gaji_id,
  karyawan_id,
  didistribusikan_oleh,
  tanggal_distribusi,
  status_baca
) VALUES
  (
    1,
    1,
    1,
    '2026-03-31 17:00:00',
    0
  ),
  (
    2,
    2,
    1,
    '2026-03-31 17:10:00',
    1
  );

-- =========================================================
-- Catatan desain:
-- 1. Semua login admin dan karyawan berada di tabel users.
-- 2. Tabel karyawan menyimpan profil kerja dan refer ke users.
-- 3. Payroll sudah siap menjadi summary bulanan untuk finance.
-- 4. Slip gaji dan log distribusi dipisah agar distribusi bisa diaudit.
-- 5. Dummy data dapat langsung dipakai untuk uji alur payroll otomatis.
-- =========================================================
