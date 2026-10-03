// Auto-Alfa: hari kerja yang SUDAH lewat tapi tidak terisi absensi dihitung sebagai ALFA (A).
// Berlaku mulai 1 Oktober 2026 (revisi per tgl 1). Logika ini MURNI (tanpa DB) supaya dipakai
// konsisten di rekap absensi (lib/hris.ts) dan perhitungan payroll (summary + penjahit),
// sehingga rekap & payroll tidak pernah berbeda.
//
// Aturan hari jadi Alfa:
// - Tanggal >= AUTO_ALFA_EFFECTIVE_FROM dan < hari ini (tanggal depan & hari ini tidak dihitung).
// - Tidak ada absensi/record apa pun di hari itu (existingDates).
// - Hari KERJA bagi karyawan tsb:
//     * Ada jadwal shift hari itu: shift != 'libur' -> hari kerja; 'libur' -> off (skip).
//     * Tidak ada jadwal: karyawan shift (is_shift) dianggap TIDAK dijadwalkan -> off (skip);
//       karyawan non-shift -> hari kerja kecuali hari Minggu.
// - Dalam masa kerja (>= tanggal masuk).
//
// Pengecualian ROLE (freelance, sales nasional, partime) ditangani oleh pemanggil — fungsi ini
// hanya dipanggil untuk karyawan yang memang presensi harian.

export const AUTO_ALFA_EFFECTIVE_FROM = "2026-10-01";

export function enumerateDates(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return out;
  for (let t = start; t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export type AutoAlfaParams = {
  periodDays: string[]; // daftar tanggal 'YYYY-MM-DD' dalam periode payroll
  today: string; // 'YYYY-MM-DD' (Asia/Jakarta)
  joinDate?: string | null; // tanggal masuk pertama 'YYYY-MM-DD'
  isShift: boolean; // karyawan berbasis shift (jadwal) atau tidak
  existingDates: Set<string>; // tanggal yang SUDAH ada record/daily entry
  jadwalShiftByDate: Map<string, string>; // tanggal -> shift terjadwal (termasuk 'libur')
};

export function computeAutoAlfaDates(params: AutoAlfaParams): string[] {
  const { periodDays, today, joinDate, isShift, existingDates, jadwalShiftByDate } = params;
  const out: string[] = [];
  for (const d of periodDays) {
    if (d < AUTO_ALFA_EFFECTIVE_FROM) continue; // belum berlaku
    if (d >= today) continue; // hanya hari yang sudah lewat
    if (joinDate && d < joinDate) continue; // sebelum masuk kerja
    if (existingDates.has(d)) continue; // sudah ada record (hadir/izin/sakit/libur/alfa/dll)

    const scheduled = jadwalShiftByDate.get(d);
    if (scheduled != null) {
      if (scheduled === "libur") continue; // dijadwalkan libur -> bukan hari kerja
      // dijadwalkan shift kerja tapi tidak presensi -> alfa
    } else {
      // tidak ada jadwal hari itu
      if (isShift) continue; // karyawan shift yang tidak dijadwalkan -> off
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      if (dow === 0) continue; // Minggu -> libur untuk non-shift
    }
    out.push(d);
  }
  return out;
}
