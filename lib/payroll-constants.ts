export const PAYROLL_OMZET_BONUS_RATE = 0.007;

// Program kenaikan gaji tahunan (Insentif Kehadiran & Gaji Kontrak) mulai TAHUN 2026.
// Setiap karyawan naik +1 tingkat pada ANNIVERSARY-nya sendiri (bulan & tanggal masuk pertama),
// dihitung hanya untuk anniversary pada/sesudah tahun ini. Anniversary tahun sebelumnya = baseline
// (TIDAK retroaktif): insentif/gaji tersimpan dianggap "nilai sekarang" sebelum program berjalan.
// Contoh: masuk 1 Sep 2023, kenaikan 100.000 → naik pertama pada anniversary 2026 (1 Sep 2026),
// jadi di payroll sebelum September 2026 BELUM naik. Masuk Mar 2021 → naik pertama Mar 2026.
export const RAISE_PROGRAM_FIRST_YEAR = 2026;
