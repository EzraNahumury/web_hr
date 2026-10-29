-- ============================================================================
-- Diagnostik: kenapa HANDIKA DIAN (Toko Solo) tidak dapat omzet/insentif
-- Dua kemungkinan:
--  (A) Terdeteksi karyawan BARU (tanggal_masuk_pertama di dalam periode 26 Sep-25 Okt).
--      -> Sudah diperbaiki: karyawan baru yang MASUK PENUH kini dapat omzet. Butuh REDEPLOY.
--  (B) unit-nya BUKAN persis "Toko Solo" -> getOmzetGroupKeyForUnit() return null -> tidak
--      masuk grup omzet -> omzet 0 (padahal penempatan = Toko Solo). Ini masalah DATA unit.
-- ============================================================================

-- 1) Identitas Handika: cek `unit` (harus persis cocok grup omzet), penempatan, jabatan,
--    dan tanggal_masuk_pertama (kalau di dalam 2026-09-26..2026-10-25 = terdeteksi baru).
SELECT k.id, k.nama, k.unit, k.penempatan, k.jabatan, k.departemen,
       DATE_FORMAT(k.tanggal_masuk_pertama, '%Y-%m-%d') AS masuk_pertama
FROM karyawan k
WHERE k.nama LIKE '%HANDIKA%';

-- 2) Bandingkan dengan Michael/Laras (yang DAPAT omzet) — lihat kolom `unit` mereka,
--    harus sama persis dengan Handika supaya ikut grup omzet yang sama.
SELECT k.id, k.nama, k.unit, k.penempatan
FROM karyawan k
WHERE k.nama LIKE '%MICHAEL FABIO%' OR k.nama LIKE '%LARAS ANDINI%';

-- 3) Omzet Toko Solo periode Oktober 2026 (apakah terisi & custom).
SELECT unit, total_omzet, is_custom_bonus
FROM omzet_bulanan
WHERE periode_bulan = 10 AND periode_tahun = 2026
  AND LOWER(unit) LIKE '%solo%';

-- ============================================================================
-- KALAU hasil #1 menunjukkan unit Handika != unit Michael/Laras (mis. kosong atau beda
-- ejaan), FIX = samakan unit Handika di Data Karyawan menjadi persis seperti Michael/Laras
-- (mis. "Toko Solo"). Setelah itu omzet-nya otomatis muncul.
-- ============================================================================
