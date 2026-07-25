// Rumus Perhitungan KPI — file MURNI (tanpa dependensi server/DB) supaya bisa
// diimpor baik dari server (lib/kpi-rnd.ts) maupun dari komponen client.

// Rumus Perhitungan (%) per baris KPI, dihitung dari Aktual Data.
//   - workdays   : aktual / Hari Kerja × 100  (default; mis. absensi, seragam)
//   - fixed      : aktual / divisor × 100     (mis. briefing ÷ 25, piket ÷ 8)
//   - late       : (threshold − aktual) / threshold × 100, minimal 0  (mis. keterlambatan ≤5)
//   - zeroBest   : aktual = 0 → 100%, aktual > 0 → 0%  (mis. jumlah pelanggaran/keluhan/teguran)
export type KpiFormula =
  | { type: "workdays" }
  | { type: "fixed"; divisor: number }
  | { type: "late"; threshold: number }
  | { type: "zeroBest" };

// Hasil dalam persen (0-100+, tidak dibatasi 100). Pembatasan "maks = bobot" dilakukan di Hasil Bobot.
export function computeKpiPerhitungan(
  formula: KpiFormula | undefined,
  aktual: number,
  hariKerja: number,
): number {
  const f = formula ?? { type: "workdays" };
  switch (f.type) {
    case "fixed":
      return f.divisor > 0 ? (aktual / f.divisor) * 100 : 0;
    case "late":
      return f.threshold > 0 ? Math.max(((f.threshold - aktual) / f.threshold) * 100, 0) : 0;
    case "zeroBest":
      return aktual <= 0 ? 100 : 0;
    case "workdays":
    default:
      return hariKerja > 0 ? (aktual / hariKerja) * 100 : 0;
  }
}
