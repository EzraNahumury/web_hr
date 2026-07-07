import type { JadwalShift } from "@/lib/jadwal-karyawan";

export type ShiftOption = JadwalShift | "";

// Dropdown standar (disamakan untuk semua non-ekspedisi): Pagi, Lembur, Siang, Libur.
export const SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi", label: "Pagi" },
  { value: "lembur", label: "Lembur" },
  { value: "siang", label: "Siang" },
  { value: "libur", label: "Libur" },
];

// Ekspedisi (JNE) tetap pakai dropdown khusus.
export const JNE_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "jne_pagi", label: "Pagi (08:00 - 16:00)" },
  { value: "jne_siang", label: "Siang (14:00 - 21:00)" },
  { value: "jne_minggu", label: "Minggu/Libur (13:00 - 20:00)" },
  { value: "libur", label: "Libur" },
];

// Nilai shift yang valid per dropdown (untuk validasi server).
export const STANDARD_SHIFT_VALUES = ["pagi", "lembur", "siang", "libur"] as const;
export const JNE_SHIFT_VALUES = ["jne_pagi", "jne_siang", "jne_minggu", "libur"] as const;

export function isEkspedisiPlacement(penempatan: string | null | undefined): boolean {
  return (penempatan ?? "").trim() === "JNE";
}

export function getShiftOptionsFor(penempatan: string) {
  if (isEkspedisiPlacement(penempatan)) return JNE_SHIFT_OPTIONS;
  return SHIFT_OPTIONS;
}

export const SHIFT_COLOR: Record<JadwalShift, string> = {
  pagi: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lembur: "bg-amber-50 text-amber-700 border-amber-200",
  siang: "bg-sky-50 text-sky-700 border-sky-200",
  setengah_1: "bg-violet-50 text-violet-700 border-violet-200",
  setengah_2: "bg-pink-50 text-pink-700 border-pink-200",
  libur: "bg-gray-100 text-gray-600 border-gray-300",
  pagi_full: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pagi_short: "bg-teal-50 text-teal-700 border-teal-200",
  siang_sore: "bg-sky-50 text-sky-700 border-sky-200",
  jne_pagi: "bg-orange-50 text-orange-700 border-orange-200",
  jne_siang: "bg-rose-50 text-rose-700 border-rose-200",
  jne_minggu: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
};
