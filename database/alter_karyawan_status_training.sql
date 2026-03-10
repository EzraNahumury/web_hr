USE hris_payroll_app_v2;

ALTER TABLE karyawan
  MODIFY COLUMN status_kepegawaian ENUM('training', 'kontrak', 'tetap', 'freelance') NOT NULL DEFAULT 'kontrak',
  MODIFY COLUMN status_kerja ENUM('training', 'kontrak', 'tetap', 'freelance') NOT NULL DEFAULT 'kontrak';
