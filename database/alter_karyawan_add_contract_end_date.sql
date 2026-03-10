USE hris_payroll_app;

ALTER TABLE karyawan
  ADD COLUMN tanggal_selesai_kontrak DATE NULL
  AFTER tanggal_kontrak;
