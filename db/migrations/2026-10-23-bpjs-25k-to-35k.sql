-- ============================================================================
-- Revisi 23 Oktober 2026 — BPJS 25.000 -> 35.000 untuk SEMUA karyawan
-- Scope: periode >= Oktober 2026 (periode lama / sudah dibayar TIDAK diubah).
-- Hanya baris yang BPJS-nya saat ini TEPAT 25.000 yang diubah.
--
-- Catatan:
--  - BPJS disimpan sebagai DATA per-karyawan per-periode (bukan konstanta kode).
--  - `payroll_employee_input.bpjs` = sumber utama yang tampil di Summary utama,
--    Summary Penjahit, dan Summary Partime (ketiganya baca kolom yang sama).
--  - `payroll.bpjs` = fallback + dipakai sebagian ekspor finance.
--  - Periode baru yang dibuat lewat "+Tambah Payroll" otomatis meng-clone nilai
--    periode sebelumnya, jadi setelah Oktober 2026 jadi 35.000, bulan berikutnya
--    ikut 35.000 otomatis.
--
-- CARA PAKAI (jalankan di DB PRODUKSI, mis. phpMyAdmin / mysql client):
--  1. Jalankan blok PREVIEW dulu. Pastikan jumlah baris masuk akal.
--  2. Jalankan blok UPDATE (sudah dibungkus transaksi). Kalau angka di langkah 1
--     aneh, jangan COMMIT -> ketik ROLLBACK;.
--  3. Jalankan blok VERIFIKASI untuk memastikan tidak ada lagi 25.000 di periode
--     >= Oktober 2026.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) PREVIEW (read-only) — berapa baris akan berubah
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS akan_berubah_pei
FROM payroll_employee_input pei
JOIN payroll p ON p.id = pei.payroll_id
WHERE pei.bpjs = 25000.00
  AND (p.periode_tahun > 2026 OR (p.periode_tahun = 2026 AND p.periode_bulan >= 10));

SELECT COUNT(*) AS akan_berubah_payroll
FROM payroll p
WHERE p.bpjs = 25000.00
  AND (p.periode_tahun > 2026 OR (p.periode_tahun = 2026 AND p.periode_bulan >= 10));


-- ---------------------------------------------------------------------------
-- 2) UPDATE (dibungkus transaksi — bisa ROLLBACK sebelum COMMIT)
-- ---------------------------------------------------------------------------
START TRANSACTION;

UPDATE payroll_employee_input pei
JOIN payroll p ON p.id = pei.payroll_id
SET pei.bpjs = 35000.00
WHERE pei.bpjs = 25000.00
  AND (p.periode_tahun > 2026 OR (p.periode_tahun = 2026 AND p.periode_bulan >= 10));

UPDATE payroll p
SET p.bpjs = 35000.00
WHERE p.bpjs = 25000.00
  AND (p.periode_tahun > 2026 OR (p.periode_tahun = 2026 AND p.periode_bulan >= 10));

-- Periksa hasil sebelum permanen:
--   COMMIT;    -- simpan perubahan
--   ROLLBACK;  -- batalkan kalau ada yang salah
COMMIT;


-- ---------------------------------------------------------------------------
-- 3) VERIFIKASI — harus 0 baris tersisa di periode >= Oktober 2026
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS sisa_25k_pei
FROM payroll_employee_input pei
JOIN payroll p ON p.id = pei.payroll_id
WHERE pei.bpjs = 25000.00
  AND (p.periode_tahun > 2026 OR (p.periode_tahun = 2026 AND p.periode_bulan >= 10));

SELECT COUNT(*) AS sisa_25k_payroll
FROM payroll p
WHERE p.bpjs = 25000.00
  AND (p.periode_tahun > 2026 OR (p.periode_tahun = 2026 AND p.periode_bulan >= 10));
