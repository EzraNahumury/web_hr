-- =========================================================
-- HRIS Absensi, Payroll, dan Potongan Kontrak
-- Versi lengkap dengan tabel karyawan terbaru
-- Target: MySQL / MariaDB (XAMPP / phpMyAdmin)
-- Database: hris_payroll_app_v2
-- =========================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS hris_payroll_app_v2;
CREATE DATABASE hris_payroll_app_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hris_payroll_app_v2;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(150) NOT NULL,
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

-- =========================================================
-- KARYAWAN
-- Kolom lama tetap dipertahankan agar kompatibel dengan aplikasi
-- Kolom baru ditambahkan mengikuti format Excel terbaru
-- =========================================================

CREATE TABLE karyawan (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  no_karyawan VARCHAR(50) NOT NULL,
  nama VARCHAR(150) NOT NULL,
  unit VARCHAR(100) NULL,
  jabatan VARCHAR(100) NOT NULL,
  departemen VARCHAR(100) NOT NULL,
  divisi VARCHAR(100) NOT NULL,
  sub_divisi VARCHAR(100) NULL,
  penempatan VARCHAR(150) NULL,
  pembagian_rekapan VARCHAR(100) NULL,
  pembebanan VARCHAR(100) NULL,
  bank VARCHAR(50) NULL DEFAULT 'BCA',
  no_rekening VARCHAR(50) NULL,
  jenis_kelamin ENUM('laki-laki', 'perempuan') NULL,
  tempat_lahir VARCHAR(100) NULL,
  tanggal_lahir DATE NULL,
  nik VARCHAR(30) NULL,
  agama VARCHAR(30) NULL,
  alamat_ktp TEXT NULL,
  alamat_rumah_kost TEXT NULL,
  nomor_telepon VARCHAR(30) NULL,
  foto_ktp VARCHAR(255) NULL,
  status_kepegawaian ENUM('tetap', 'kontrak', 'freelance', 'magang', 'resign') NOT NULL DEFAULT 'kontrak',
  status_kerja ENUM('tetap', 'kontrak', 'freelance', 'magang', 'resign') NOT NULL DEFAULT 'kontrak',
  status_data ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  tanggal_kontrak DATE NULL,
  tanggal_selesai_kontrak DATE NULL,
  kenaikan_tiap_tahun DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_karyawan_user_id (user_id),
  UNIQUE KEY uq_karyawan_no_karyawan (no_karyawan),
  UNIQUE KEY uq_karyawan_nik (nik),
  KEY idx_karyawan_nama (nama),
  KEY idx_karyawan_unit (unit),
  KEY idx_karyawan_departemen (departemen),
  KEY idx_karyawan_divisi (divisi),
  KEY idx_karyawan_status_kepegawaian (status_kepegawaian),
  KEY idx_karyawan_status_kerja (status_kerja),
  KEY idx_karyawan_status_data (status_data),
  CONSTRAINT fk_karyawan_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- ABSENSI
-- Kode absensi terbaru:
-- H = Masuk
-- X = Ga Masuk
-- S = Sakit
-- SX = Setengah Hari
-- =========================================================

CREATE TABLE absensi (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  karyawan_id BIGINT UNSIGNED NOT NULL,
  tanggal DATE NOT NULL,
  jam_masuk DATETIME NULL,
  jam_pulang DATETIME NULL,
  status_absensi ENUM('hadir', 'sakit', 'izin', 'libur', 'setengah_hari', 'alfa') NOT NULL DEFAULT 'hadir',
  kode_absensi VARCHAR(10) NULL,
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

-- =========================================================
-- LEMBUR
-- =========================================================

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

-- =========================================================
-- PINJAMAN
-- =========================================================

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
  KEY idx_pinjaman_tanggal (tanggal_pengajuan),
  CONSTRAINT fk_pinjaman_karyawan
    FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- POTONGAN KONTRAK
-- Berlaku pada 5 bulan pertama kontrak
-- =========================================================

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

-- =========================================================
-- PAYROLL
-- =========================================================

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

-- =========================================================
-- SLIP GAJI
-- =========================================================

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

-- =========================================================
-- LOG DISTRIBUSI SLIP
-- =========================================================

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
  KEY idx_log_distribusi_slip (slip_gaji_id),
  KEY idx_log_distribusi_karyawan (karyawan_id),
  KEY idx_log_distribusi_admin (didistribusikan_oleh),
  CONSTRAINT fk_log_distribusi_slip
    FOREIGN KEY (slip_gaji_id) REFERENCES slip_gaji (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_log_distribusi_karyawan
    FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_log_distribusi_user
    FOREIGN KEY (didistribusikan_oleh) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- SEED USERS
-- Password masih SHA2 agar bisa langsung dipakai saat import
-- =========================================================

INSERT INTO users (id, nama, email, password, role, status_aktif) VALUES
  (1, 'Ezra Kristanto', 'ezra.kristanto@ti.ukdw.ac.id', SHA2('ftiukdw2022', 256), 'admin', 1),
  (2, 'Elnida Rahma Dian', 'elnida@ayres.local', SHA2('elnida123', 256), 'karyawan', 1),
  (3, 'Fiya Agista Rahmadiyani', 'fiya@ayres.local', SHA2('fiya123', 256), 'karyawan', 1);

-- =========================================================
-- SEED KARYAWAN
-- =========================================================

INSERT INTO karyawan (
  id,
  user_id,
  no_karyawan,
  nama,
  unit,
  jabatan,
  departemen,
  divisi,
  sub_divisi,
  penempatan,
  pembagian_rekapan,
  pembebanan,
  bank,
  no_rekening,
  jenis_kelamin,
  tempat_lahir,
  tanggal_lahir,
  nik,
  agama,
  alamat_ktp,
  alamat_rumah_kost,
  nomor_telepon,
  foto_ktp,
  status_kepegawaian,
  status_kerja,
  status_data,
  tanggal_kontrak,
  tanggal_selesai_kontrak,
  kenaikan_tiap_tahun
) VALUES
  (
    1,
    2,
    '2058',
    'Elnida Rahma Dian',
    'AVA Group',
    'Admin',
    'AVA Group',
    'HR',
    'HR Office',
    'Head Office',
    'Umum AVA',
    'umum ava',
    'BCA',
    '1234567890',
    'perempuan',
    'Yogyakarta',
    '1999-05-12',
    '3404011205990001',
    'Islam',
    'Jl. Kenari No. 1, Yogyakarta',
    'Kost Jogja Selatan',
    '081234567890',
    'uploads/ktp/elnida.jpg',
    'kontrak',
    'kontrak',
    'aktif',
    '2025-11-17',
    '2026-11-16',
    200000.00
  ),
  (
    2,
    3,
    '2004',
    'Fiya Agista Rahmadiyani',
    'Ayres Apparel',
    'Staff',
    'Ayres Apparel',
    'Customer Service',
    'CS Online',
    'Office 2',
    'Penjualan Ayres',
    'penjualan ayres',
    'BCA',
    '1231231231',
    'perempuan',
    'Sleman',
    '2000-08-20',
    '3404012008000002',
    'Islam',
    'Jl. Melati No. 7, Sleman',
    'Rumah',
    '081111222233',
    'uploads/ktp/fiya.jpg',
    'kontrak',
    'kontrak',
    'aktif',
    '2023-11-01',
    '2024-10-31',
    150000.00
  );

-- =========================================================
-- SEED ABSENSI
-- =========================================================

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
    '2026-03-10',
    '2026-03-10 08:31:00',
    '2026-03-10 16:32:00',
    'hadir',
    'H',
    'uploads/attendance/employee-1-in.jpg',
    'uploads/attendance/employee-1-out.jpg',
    -7.7780000,
    110.3677000,
    -7.7780200,
    110.3677100,
    1,
    0,
    0.00,
    'Masuk normal'
  ),
  (
    2,
    '2026-03-10',
    NULL,
    NULL,
    'sakit',
    'S',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    0,
    0.00,
    'Sakit dengan izin'
  );

-- =========================================================
-- SEED LEMBUR
-- =========================================================

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
    1,
    '2026-03-11',
    '2026-03-11 16:40:00',
    '2026-03-11 18:54:00',
    2.23,
    'uploads/overtime/1773124644375-Mar06-02_09.jpg.jpeg',
    'approved',
    1,
    'Lembur valid'
  );

-- =========================================================
-- SEED PINJAMAN
-- =========================================================

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
  );

-- =========================================================
-- SEED POTONGAN KONTRAK
-- 5 bulan pertama, Rp200.000 per bulan
-- =========================================================

INSERT INTO potongan_kontrak (
  karyawan_id,
  bulan,
  tahun,
  nominal_potongan,
  keterangan
) VALUES
  (1, 11, 2025, 200000.00, 'Potongan kontrak bulan ke-1 dari 5'),
  (1, 12, 2025, 200000.00, 'Potongan kontrak bulan ke-2 dari 5'),
  (1, 1, 2026, 200000.00, 'Potongan kontrak bulan ke-3 dari 5'),
  (1, 2, 2026, 200000.00, 'Potongan kontrak bulan ke-4 dari 5'),
  (1, 3, 2026, 200000.00, 'Potongan kontrak bulan ke-5 dari 5'),
  (2, 11, 2023, 200000.00, 'Potongan kontrak bulan ke-1 dari 5'),
  (2, 12, 2023, 200000.00, 'Potongan kontrak bulan ke-2 dari 5'),
  (2, 1, 2024, 200000.00, 'Potongan kontrak bulan ke-3 dari 5'),
  (2, 2, 2024, 200000.00, 'Potongan kontrak bulan ke-4 dari 5'),
  (2, 3, 2024, 200000.00, 'Potongan kontrak bulan ke-5 dari 5');

-- =========================================================
-- SEED PAYROLL
-- =========================================================

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
    2.23,
    1,
    0,
    3200000.00,
    300000.00,
    150000.00,
    100000.00,
    120000.00,
    250000.00,
    150000.00,
    0.00,
    44600.00,
    20000.00,
    0.00,
    200000.00,
    300000.00,
    0.00,
    520000.00,
    3674600.00,
    'processed'
  );

-- =========================================================
-- SEED SLIP GAJI
-- =========================================================

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
    'uploads/slip/slip-elnida-202603.pdf'
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
  );

-- =========================================================
-- CATATAN
-- 1. Admin login:
--    ezra.kristanto@ti.ukdw.ac.id / ftiukdw2022
-- 2. Database ini dibuat terpisah agar aman untuk import baru.
-- 3. Tabel karyawan sudah memuat kolom lama + kolom baru.
-- =========================================================
