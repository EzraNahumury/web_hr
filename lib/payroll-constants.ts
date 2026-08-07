export const PAYROLL_OMZET_BONUS_RATE = 0.007;

// Program kenaikan gaji tahunan (Insentif Kehadiran & Gaji Kontrak) EFEKTIF sejak 1 Juni 2026.
// Setiap karyawan naik +1 tingkat pada ANNIVERSARY-nya (bulan & tanggal masuk pertama), TAPI
// hanya untuk anniversary yang jatuh SESUDAH tanggal efektif ini. Anniversary pada/sebelum
// 1 Juni 2026 = baseline (TIDAK retroaktif): insentif/gaji tersimpan = nilai manual "sekarang".
// Akibatnya:
//   - Anniversary Jun–Des → naik mulai 2026 (di bulan anniversary-nya). Mis. masuk 1 Sep → naik Sep 2026.
//   - Anniversary Jan–Mei → 2026 masih baseline (TETAP), naik pertama di anniversary 2027.
//   - Anniversary tepat 1 Juni → 2026 baseline, naik 2027.
export const RAISE_EFFECTIVE_FROM = "2026-06-01";
