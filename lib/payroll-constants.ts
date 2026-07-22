export const PAYROLL_OMZET_BONUS_RATE = 0.007;

// Tanggal mulai berlakunya aturan kenaikan Insentif Kehadiran per tahun.
// Tahun kerja untuk menghitung kenaikan dihitung dari MAX(tanggal masuk pertama, tanggal ini),
// sehingga kenaikan TIDAK retroaktif ke tahun-tahun sebelum aturan berlaku — insentif tersimpan
// dianggap baseline "nilai sekarang", lalu naik bertahap +1 tahun sejak tanggal ini.
// (Dipilih ~1 tahun sebelum periode berjalan agar tahun pertama sudah berlaku sekarang.)
export const INSENTIF_RAISE_EFFECTIVE_FROM = "2025-06-26";
