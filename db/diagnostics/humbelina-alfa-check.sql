-- ============================================================================
-- Diagnostik: kenapa Humbelina (NIP FC.FC.2024.0001) bisa kena ALFA di hari Minggu
-- Konteks: karyawan TANPA set jadwal seharusnya hari Minggu = Libur (bukan Alfa).
-- Kode auto-alfa SUDAH benar (skip Minggu utk yang tak dijadwalkan). Minggu baru jadi
-- Alfa kalau ADA entri jadwal shift kerja (shift != 'libur') di hari itu. Query ini
-- mengecek apakah ada entri jadwal "nyasar" / data pemicu.
-- ============================================================================

-- 1) Status is_shift & identitas
SELECT id, nama, no_karyawan, is_shift, status_kepegawaian, jabatan, tanggal_masuk_pertama
FROM karyawan
WHERE no_karyawan = 'FC.FC.2024.0001';

-- 2) Entri jadwal dalam periode payroll Oktober 2026 (26 Sep - 25 Okt).
--    Kalau ada baris dengan shift != 'libur' di tanggal yang jatuh hari Minggu
--    (04, 11, 18, 25 Okt 2026 / 27 Sep 2026) -> itu pemicu Alfa.
SELECT jk.tanggal, DAYNAME(jk.tanggal) AS hari, jk.shift
FROM jadwal_karyawan jk
JOIN karyawan k ON k.id = jk.karyawan_id
WHERE k.no_karyawan = 'FC.FC.2024.0001'
  AND jk.tanggal BETWEEN '2026-09-26' AND '2026-10-25'
ORDER BY jk.tanggal;

-- 3) Record absensi nyata dalam periode (lihat kalau ada status 'alfa' tersimpan,
--    atau telat/pulang-awal belum di-approve yang dihitung alfa).
SELECT a.tanggal, DAYNAME(a.tanggal) AS hari, a.status_absensi, a.kode_absensi,
       a.butuh_approval, a.approval_status, a.jam_masuk, a.jam_pulang
FROM absensi a
JOIN karyawan k ON k.id = a.karyawan_id
WHERE k.no_karyawan = 'FC.FC.2024.0001'
  AND a.tanggal BETWEEN '2026-09-26' AND '2026-10-25'
ORDER BY a.tanggal;

-- ============================================================================
-- JIKA query #2 menunjukkan entri jadwal shift kerja di hari Minggu (data nyasar),
-- bersihkan (ubah jadi libur) HANYA untuk Humbelina, HANYA hari Minggu, periode ini:
--
--   UPDATE jadwal_karyawan jk
--   JOIN karyawan k ON k.id = jk.karyawan_id
--   SET jk.shift = 'libur'
--   WHERE k.no_karyawan = 'FC.FC.2024.0001'
--     AND jk.tanggal BETWEEN '2026-09-26' AND '2026-10-25'
--     AND DAYOFWEEK(jk.tanggal) = 1   -- 1 = Minggu
--     AND jk.shift <> 'libur';
--
-- Atau hapus entri jadwalnya sama sekali kalau dia memang tidak dijadwalkan:
--   DELETE jk FROM jadwal_karyawan jk JOIN karyawan k ON k.id = jk.karyawan_id
--   WHERE k.no_karyawan = 'FC.FC.2024.0001'
--     AND jk.tanggal BETWEEN '2026-09-26' AND '2026-10-25'
--     AND DAYOFWEEK(jk.tanggal) = 1;
-- ============================================================================
