import type { JadwalShift } from "@/lib/jadwal-karyawan";

export type ShiftOption = JadwalShift | "";

export const SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi", label: "Pagi" },
  { value: "lembur", label: "Lembur" },
  { value: "siang", label: "Siang" },
  { value: "setengah_1", label: "Setengah 1" },
  { value: "setengah_2", label: "Setengah 2" },
  { value: "libur", label: "Libur" },
];

export const TOKO_SOLO_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi", label: "Pagi" },
  { value: "setengah_1", label: "Setengah 1" },
  { value: "setengah_2", label: "Setengah 2" },
  { value: "libur", label: "Libur" },
];

export const MEDIA_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi", label: "Pagi" },
  { value: "siang", label: "Siang" },
  { value: "libur", label: "Libur" },
];

export const HOSTLIVE_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi", label: "Pagi" },
  { value: "siang", label: "Siang" },
  { value: "libur", label: "Libur" },
];

export const JNE_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "jne_pagi", label: "Pagi (08:00 - 16:00)" },
  { value: "jne_siang", label: "Siang (14:00 - 21:00)" },
  { value: "jne_minggu", label: "Minggu/Libur (13:00 - 20:00)" },
  { value: "libur", label: "Libur" },
];

export const IMEL_NIP = "MR.MM.2025.0002";
export const IMEL_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi_full", label: "08:30 - 17:00" },
  { value: "pagi", label: "08:30 - 16:30" },
  { value: "pagi_short", label: "08:30 - 15:00" },
  { value: "setengah_2", label: "08:30 - 12:00" },
  { value: "siang_sore", label: "12:00 - 17:00" },
  { value: "siang", label: "Siang (12:00 - 21:00)" },
  { value: "libur", label: "Libur" },
];

export function getShiftOptionsFor(
  penempatan: string,
  subDivisi: string | null,
  noKaryawan: string | null,
) {
  if (noKaryawan === IMEL_NIP) return IMEL_SHIFT_OPTIONS;
  if (penempatan === "JNE") return JNE_SHIFT_OPTIONS;
  if (penempatan.trim().toLowerCase() === "toko solo") return TOKO_SOLO_SHIFT_OPTIONS;
  const subDiv = (subDivisi ?? "").trim().toLowerCase();
  if (subDiv === "media") return MEDIA_SHIFT_OPTIONS;
  if (subDiv === "hostlive") return HOSTLIVE_SHIFT_OPTIONS;
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
