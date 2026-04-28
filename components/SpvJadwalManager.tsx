"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type JadwalKaryawanItem,
  type JadwalShift,
  type TokoGudangKaryawan,
} from "@/lib/jadwal-karyawan";

type Props = {
  initialYear: number;
  initialMonth: number;
  karyawanList: TokoGudangKaryawan[];
  initialJadwal: JadwalKaryawanItem[];
};

type ShiftOption = JadwalShift | "";

const SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi", label: "Pagi" },
  { value: "lembur", label: "Lembur" },
  { value: "siang", label: "Siang" },
  { value: "setengah_1", label: "Setengah 1" },
  { value: "setengah_2", label: "Setengah 2" },
  { value: "libur", label: "Libur" },
];

// Toko Solo hanya beroperasi shift Pagi (08.30-16.30); Libur dipertahankan
// supaya bisa menandai hari off karyawan.
const TOKO_SOLO_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi", label: "Pagi" },
  { value: "libur", label: "Libur" },
];

function getShiftOptionsForPenempatan(penempatan: string) {
  return penempatan === "Toko Solo" ? TOKO_SOLO_SHIFT_OPTIONS : SHIFT_OPTIONS;
}

const SHIFT_COLOR: Record<JadwalShift, string> = {
  pagi: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lembur: "bg-amber-50 text-amber-700 border-amber-200",
  siang: "bg-sky-50 text-sky-700 border-sky-200",
  setengah_1: "bg-violet-50 text-violet-700 border-violet-200",
  setengah_2: "bg-pink-50 text-pink-700 border-pink-200",
  libur: "bg-gray-100 text-gray-600 border-gray-300",
};

const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function buildJadwalMap(rows: JadwalKaryawanItem[]) {
  const map = new Map<string, JadwalShift>();
  for (const row of rows) {
    map.set(`${row.karyawanId}|${row.tanggal}`, row.shift);
  }
  return map;
}

export default function SpvJadwalManager({
  initialYear,
  initialMonth,
  karyawanList,
  initialJadwal,
}: Props) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [jadwalMap, setJadwalMap] = useState<Map<string, JadwalShift>>(
    () => buildJadwalMap(initialJadwal),
  );
  const [dirty, setDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setJadwalMap(buildJadwalMap(initialJadwal));
    setDirty(false);
  }, [initialJadwal]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const dayList = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  );

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current - 1; y <= current + 2; y++) years.push(y);
    return years;
  }, []);

  function changePeriod(newYear: number, newMonth: number) {
    if (dirty && !window.confirm("Ada perubahan belum disimpan. Pindah bulan akan membuangnya. Lanjut?")) {
      return;
    }
    setYear(newYear);
    setMonth(newMonth);
    const params = new URLSearchParams({ year: String(newYear), month: String(newMonth) });
    router.push(`/spv/jadwal?${params.toString()}`);
    router.refresh();
  }

  function setCell(karyawanId: number, tanggal: string, value: ShiftOption) {
    setJadwalMap((prev) => {
      const next = new Map(prev);
      const key = `${karyawanId}|${tanggal}`;
      if (value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
    setDirty(true);
  }

  function fillRow(karyawanId: number, value: ShiftOption) {
    setJadwalMap((prev) => {
      const next = new Map(prev);
      for (const day of dayList) {
        const tanggal = dateKey(year, month, day);
        const key = `${karyawanId}|${tanggal}`;
        if (value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    setIsSubmitting(true);
    try {
      const entries: { karyawanId: number; tanggal: string; shift: JadwalShift }[] = [];
      const removeKeys: { karyawanId: number; tanggal: string }[] = [];

      const initialMap = buildJadwalMap(initialJadwal);
      const seenKeys = new Set<string>();

      for (const [key, shift] of jadwalMap.entries()) {
        seenKeys.add(key);
        const [kIdStr, tanggal] = key.split("|");
        const karyawanId = Number(kIdStr);
        if (initialMap.get(key) !== shift) {
          entries.push({ karyawanId, tanggal, shift });
        }
      }
      for (const key of initialMap.keys()) {
        if (!seenKeys.has(key)) {
          const [kIdStr, tanggal] = key.split("|");
          removeKeys.push({ karyawanId: Number(kIdStr), tanggal });
        }
      }

      const response = await fetch("/api/spv/jadwal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, entries, removeKeys }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Gagal menyimpan.");

      setToast({ message: result.message || "Jadwal berhasil disimpan.", type: "success" });
      setDirty(false);
      router.refresh();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="fixed right-6 top-24 z-[70] max-w-sm rounded-[22px] border bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <p
            className={`text-sm font-semibold ${
              toast.type === "success" ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {toast.message}
          </p>
        </div>
      ) : null}

      <section className="rounded-[24px] border border-[#ead7ce] bg-white p-5 shadow-[0_10px_30px_rgba(96,45,34,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7a6059]">
                Bulan
              </span>
              <select
                value={month}
                onChange={(e) => changePeriod(year, Number(e.target.value))}
                className="mt-1 h-11 rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none focus:border-[#c8716d]"
              >
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7a6059]">
                Tahun
              </span>
              <select
                value={year}
                onChange={(e) => changePeriod(Number(e.target.value), month)}
                className="mt-1 h-11 rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none focus:border-[#c8716d]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[#ead7ce] bg-[#fff7f3] px-4 py-2.5 text-sm text-[#7a6059]">
              Karyawan: <span className="font-semibold text-[#241716]">{karyawanList.length}</span>
              <span className="mx-2 text-[#ead7ce]">|</span>
              Jadwal terisi:{" "}
              <span className="font-semibold text-emerald-700">{jadwalMap.size}</span>
              {dirty ? (
                <>
                  <span className="mx-2 text-[#ead7ce]">|</span>
                  <span className="font-semibold text-amber-700">Belum disimpan</span>
                </>
              ) : null}
            </div>
            <button
              type="button"
              disabled={isSubmitting || !dirty}
              onClick={handleSave}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#8f1d22] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(143,29,34,0.22)] transition hover:bg-[#7a171c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
          {SHIFT_OPTIONS.filter((o) => o.value !== "").map((o) => (
            <span
              key={o.value}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold ${
                SHIFT_COLOR[o.value as JadwalShift]
              }`}
            >
              {o.label}
            </span>
          ))}
        </div>
      </section>

      {karyawanList.length === 0 ? (
        <section className="rounded-[24px] border border-[#ead7ce] bg-white p-10 text-center shadow-[0_10px_30px_rgba(96,45,34,0.06)]">
          <p className="text-base font-semibold text-[#3b2723]">
            Belum ada karyawan Toko/Gudang aktif
          </p>
          <p className="mt-2 text-sm text-[#8a6f68]">
            Minta admin untuk menambah karyawan dengan penempatan Toko atau Gudang terlebih dahulu.
          </p>
        </section>
      ) : (
        <section className="overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-[0_10px_30px_rgba(96,45,34,0.06)]">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff2ec] text-xs uppercase tracking-[0.12em] text-[#7a6059]">
                <th className="sticky left-0 z-10 min-w-[220px] bg-[#fff2ec] px-4 py-3 font-semibold">
                  Karyawan
                </th>
                <th className="min-w-[140px] px-3 py-3 font-semibold">Quick Fill</th>
                {dayList.map((day) => {
                  const date = new Date(year, month - 1, day);
                  const dow = date.getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const dayShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][dow];
                  return (
                    <th
                      key={day}
                      className={`min-w-[88px] px-1 py-2 text-center font-semibold ${
                        isWeekend ? "bg-[#ffe8e0] text-[#8f1d22]" : ""
                      }`}
                    >
                      <div className="text-[10px] tracking-[0.06em]">{dayShort}</div>
                      <div className="text-sm">{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {karyawanList.map((k) => {
                const shiftOptions = getShiftOptionsForPenempatan(k.penempatan);
                return (
                <tr
                  key={k.id}
                  className="border-b border-[#f1e5de] text-sm hover:bg-[#fffaf7]"
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-2">
                    <div className="font-semibold text-[#241716]">{k.nama}</div>
                    <div className="text-[11px] text-[#7a6059]">
                      {k.penempatan}
                      {k.jabatan ? ` · ${k.jabatan}` : ""}
                      {k.noKaryawan ? ` · ${k.noKaryawan}` : ""}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value as ShiftOption;
                        if (v === "") return;
                        fillRow(k.id, v);
                        e.currentTarget.value = "";
                      }}
                      className="h-9 w-full rounded-xl border border-[#ead7ce] bg-white px-2 text-xs text-[#2d1b18]"
                    >
                      <option value="">Isi semua...</option>
                      {shiftOptions.filter((o) => o.value !== "").map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {dayList.map((day) => {
                    const tanggal = dateKey(year, month, day);
                    const value = jadwalMap.get(`${k.id}|${tanggal}`) ?? "";
                    return (
                      <td key={day} className="px-1 py-1">
                        <select
                          value={value}
                          onChange={(e) => setCell(k.id, tanggal, e.target.value as ShiftOption)}
                          className={`h-9 w-full rounded-lg border px-1 text-[11px] font-semibold focus:outline-none ${
                            value
                              ? SHIFT_COLOR[value as JadwalShift]
                              : "border-[#ead7ce] bg-white text-[#a3958f]"
                          }`}
                        >
                          {shiftOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-center text-xs text-[#8a6f68]">
        Tip: gunakan kolom <span className="font-semibold">Quick Fill</span> untuk mengisi seluruh
        bulan dengan shift yang sama, lalu sesuaikan tanggal libur per karyawan.
      </p>
    </div>
  );
}
