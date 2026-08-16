// Deskripsi EFEK GAJI per KODE absensi — akurat sesuai logika di lib/payroll-summary.ts.
// Modul PURE (tanpa DB) supaya bisa dipakai di client & server.
//
// Catatan penting: kategori payroll (status_absensi) tidak cukup untuk menjelaskan efek gaji,
// karena beberapa kode dalam kategori sama berperilaku beda:
//  - "hadir": O normal, T ada potongan telat, PA tidak dapat uang makan.
//  - "libur": hanya LN/LP/C yang DIBAYAR (gaji pokok); L & "-" TIDAK dibayar.

// Kode libur yang dibayar (dapat gaji pokok). Dicocokkan eksplisit di payroll-summary.ts.
export const PAID_LIBUR_CODES = new Set(["LN", "LP", "C"]);

export function describeAttendanceEffect(code: string, status: string): string {
  const c = (code || "").trim().toUpperCase();
  switch (status) {
    case "hadir":
      if (c === "T") return "Hadir — gaji pokok + uang makan, potongan telat Rp20.000/hari";
      if (c === "PA") return "Hadir — gaji pokok, TANPA uang makan (pulang awal)";
      return "Hadir — gaji pokok + uang makan";
    case "setengah_hari":
      return "Setengah hari — ½ gaji pokok, tanpa uang makan";
    case "sakit":
      if (c === "SX") return "Sakit tanpa surat — hari tidak dibayar, uang kerajinan hangus";
      return "Sakit — hari tidak dibayar (uang kerajinan aman bila ≤ 2 hari)";
    case "izin":
      return "Izin — hari tidak dibayar";
    case "alfa":
      return "Alfa — hari tidak dibayar, uang kerajinan hangus";
    case "libur":
      if (PAID_LIBUR_CODES.has(c)) return "Libur berbayar — gaji pokok, tanpa uang makan";
      return "Libur / tidak absen — TIDAK dibayar (tanpa gaji pokok & uang makan)";
    default:
      return status;
  }
}
