-- ============================================================================
-- Revisi 27 Oktober 2026 — Koreksi UANG MAKAN/HARI Humbelina 25.000 -> 35.000
-- Karyawan: Humbelina Febriani Imlana Putri (NIP FC.FC.2024.0001)
-- Scope: periode >= Oktober 2026. Hanya baris yang NILAINYA TEPAT 25.000.
--
-- Catatan:
--  - uang_makan_per_hari disimpan di payroll_employee_input (pei), per-periode.
--  - Summary utama menampilkan nilai ini apa adanya (tanpa perhitungan ulang), dan
--    total "Uang Makan" = per-hari x hari masuk dihitung saat render — jadi cukup
--    perbaiki pei.uang_makan_per_hari.
--  - Periode baru (via "+Tambah Payroll") otomatis clone nilai ini -> ikut 35.000.
--
-- Versi aplikasi: migrasi ini juga dijalankan OTOMATIS saat deploy (ledger-guarded,
-- key `humbelina-uangmakan-25k-to-35k-2026-10` di ensurePayrollSupportTables).
-- Skrip di bawah = setara manual / referensi.
-- ============================================================================

-- PREVIEW (read-only)
SELECT p.periode_tahun, p.periode_bulan, k.nama,
       pei.uang_makan_per_hari, pei.bpjs, pei.updated_at
FROM payroll p
JOIN karyawan k ON k.id = p.karyawan_id
LEFT JOIN payroll_employee_input pei ON pei.payroll_id = p.id
WHERE k.no_karyawan = 'FC.FC.2024.0001'
ORDER BY p.periode_tahun, p.periode_bulan;

-- UPDATE
UPDATE payroll_employee_input pei
JOIN payroll p ON p.id = pei.payroll_id
JOIN karyawan k ON k.id = p.karyawan_id
SET pei.uang_makan_per_hari = 35000.00
WHERE k.no_karyawan = 'FC.FC.2024.0001'
  AND pei.uang_makan_per_hari = 25000.00
  AND (p.periode_tahun > 2026 OR (p.periode_tahun = 2026 AND p.periode_bulan >= 10));
