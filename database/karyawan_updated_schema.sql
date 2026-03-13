USE hris_payroll_app;

DROP TABLE IF EXISTS karyawan;

CREATE TABLE karyawan (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  no_karyawan VARCHAR(50) NOT NULL,
  nama VARCHAR(150) NOT NULL,
  unit VARCHAR(100) NULL,
  jabatan VARCHAR(100) NOT NULL,
  departemen VARCHAR(100) NOT NULL,
  divisi VARCHAR(100) NOT NULL,
  sub_divisi VARCHAR(100) NULL,
  penempatan VARCHAR(150) NULL,
  status_kepegawaian ENUM('tetap','kontrak','freelance','magang','resign') NOT NULL DEFAULT 'kontrak',
  bank VARCHAR(50) NULL DEFAULT 'BCA',
  no_rekening VARCHAR(50) NULL,
  jenis_kelamin ENUM('laki-laki','perempuan') NULL,
  tempat_lahir VARCHAR(100) NULL,
  tanggal_lahir DATE NULL,
  nik VARCHAR(30) NULL,
  agama VARCHAR(30) NULL,
  status_data ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  alamat_ktp TEXT NULL,
  alamat_rumah_kost TEXT NULL,
  nomor_telepon VARCHAR(30) NULL,
  foto_ktp VARCHAR(255) NULL,
  tanggal_kontrak DATE NULL,
  tanggal_selesai_kontrak DATE NULL,
  kenaikan_tiap_tahun DECIMAL(12,2) NOT NULL DEFAULT 0,
  pembagian_rekapan VARCHAR(100) NULL,
  pembebanan VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_karyawan_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT uq_karyawan_user_id UNIQUE (user_id),
  CONSTRAINT uq_karyawan_no_karyawan UNIQUE (no_karyawan),
  CONSTRAINT uq_karyawan_nik UNIQUE (nik)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_karyawan_nama ON karyawan(nama);
CREATE INDEX idx_karyawan_departemen ON karyawan(departemen);
CREATE INDEX idx_karyawan_divisi ON karyawan(divisi);
CREATE INDEX idx_karyawan_status_kepegawaian ON karyawan(status_kepegawaian);
CREATE INDEX idx_karyawan_status_data ON karyawan(status_data);
