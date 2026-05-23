"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import {
  type JadwalKaryawanItem,
  type JadwalShift,
  type TokoGudangKaryawan,
} from "@/lib/jadwal-karyawan";
import { useConfirm } from "@/components/ConfirmDialog";

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

// Sub divisi Media hanya pakai shift Pagi & Siang (plus Libur untuk hari off).
const MEDIA_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi", label: "Pagi" },
  { value: "siang", label: "Siang" },
  { value: "libur", label: "Libur" },
];

// JNE pakai 2 shift unik dengan toleransi 10 menit di check-in.
const JNE_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "jne_pagi", label: "Pagi (08:00 - 16:00)" },
  { value: "jne_siang", label: "Siang (14:00 - 21:00)" },
  { value: "libur", label: "Libur" },
];

// Imel (NIP MR.MM.2025.0002) — jadwal khusus per hari, dropdown pakai jam-jam langsung.
const IMEL_NIP = "MR.MM.2025.0002";
const IMEL_SHIFT_OPTIONS: { value: ShiftOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "pagi_full", label: "08:30 - 17:00" },
  { value: "pagi", label: "08:30 - 16:30" },
  { value: "pagi_short", label: "08:30 - 15:00" },
  { value: "setengah_2", label: "08:30 - 12:00" },
  { value: "siang_sore", label: "12:00 - 17:00" },
  { value: "siang", label: "Siang (12:00 - 21:00)" },
  { value: "libur", label: "Libur" },
];

function getShiftOptionsFor(
  penempatan: string,
  subDivisi: string | null,
  noKaryawan: string | null,
) {
  if (noKaryawan === IMEL_NIP) return IMEL_SHIFT_OPTIONS;
  if (penempatan === "JNE") return JNE_SHIFT_OPTIONS;
  if (penempatan === "Toko Solo") return TOKO_SOLO_SHIFT_OPTIONS;
  if ((subDivisi ?? "").trim().toLowerCase() === "media") return MEDIA_SHIFT_OPTIONS;
  return SHIFT_OPTIONS;
}

const SHIFT_COLOR: Record<JadwalShift, string> = {
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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type PeriodDay = {
  day: number;
  month: number;
  year: number;
  date: string; // YYYY-MM-DD
};

// Periode payroll: tgl 26 bulan sebelumnya s/d tgl 25 bulan dipilih (matches absensi admin).
function buildPeriodDays(year: number, month: number): PeriodDay[] {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrev = new Date(prevYear, prevMonth, 0).getDate();
  const list: PeriodDay[] = [];

  for (let d = 26; d <= daysInPrev; d++) {
    list.push({
      day: d,
      month: prevMonth,
      year: prevYear,
      date: `${prevYear}-${pad(prevMonth)}-${pad(d)}`,
    });
  }
  for (let d = 1; d <= 25; d++) {
    list.push({
      day: d,
      month,
      year,
      date: `${year}-${pad(month)}-${pad(d)}`,
    });
  }

  return list;
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
  const pathname = usePathname();
  const basePath = pathname?.startsWith("/admin")
    ? "/admin/jadwal"
    : pathname?.startsWith("/employee")
      ? "/employee/jadwal"
      : "/spv/jadwal";
  const confirm = useConfirm();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [jadwalMap, setJadwalMap] = useState<Map<string, JadwalShift>>(
    () => buildJadwalMap(initialJadwal),
  );
  const [dirty, setDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const tableScrollRef = useRef<HTMLElement | null>(null);
  const ghostScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [ghostBar, setGhostBar] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  useEffect(() => {
    setJadwalMap(buildJadwalMap(initialJadwal));
    setDirty(false);
  }, [initialJadwal]);

  const periodDays = useMemo(() => buildPeriodDays(year, month), [year, month]);

  useEffect(() => {
    const tableEl = tableScrollRef.current;
    if (!tableEl) return;

    const recompute = () => {
      const rect = tableEl.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const hasOverflow = tableEl.scrollWidth - tableEl.clientWidth > 1;
      const tableScrollbarVisible = rect.bottom <= viewportH;
      const inView = rect.top < viewportH && rect.bottom > 0;
      setTableScrollWidth(tableEl.scrollWidth);
      setGhostBar({
        left: rect.left,
        width: rect.width,
        visible: hasOverflow && inView && !tableScrollbarVisible,
      });
    };

    recompute();

    const ro = new ResizeObserver(recompute);
    ro.observe(tableEl);
    const inner = tableEl.firstElementChild;
    if (inner) ro.observe(inner);

    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);

    let lock = false;
    const syncFromTable = () => {
      const ghostEl = ghostScrollRef.current;
      if (!ghostEl || lock) return;
      lock = true;
      ghostEl.scrollLeft = tableEl.scrollLeft;
      requestAnimationFrame(() => {
        lock = false;
      });
    };
    tableEl.addEventListener("scroll", syncFromTable, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
      tableEl.removeEventListener("scroll", syncFromTable);
    };
  }, [periodDays.length, karyawanList.length]);

  useEffect(() => {
    const ghostEl = ghostScrollRef.current;
    const tableEl = tableScrollRef.current;
    if (!ghostEl || !tableEl) return;
    let lock = false;
    const syncFromGhost = () => {
      if (lock) return;
      lock = true;
      tableEl.scrollLeft = ghostEl.scrollLeft;
      requestAnimationFrame(() => {
        lock = false;
      });
    };
    ghostEl.addEventListener("scroll", syncFromGhost, { passive: true });
    return () => ghostEl.removeEventListener("scroll", syncFromGhost);
  }, [ghostBar.visible]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  function handleMonthChange(value: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return;
    const newYear = Number(match[1]);
    const newMonth = Number(match[2]);
    if (!Number.isInteger(newYear) || !Number.isInteger(newMonth)) return;
    if (newMonth < 1 || newMonth > 12) return;
    changePeriod(newYear, newMonth);
  }

  async function changePeriod(newYear: number, newMonth: number) {
    if (dirty) {
      const ok = await confirm({
        tone: "warning",
        title: "Pindah bulan tanpa simpan?",
        description: "Ada perubahan jadwal yang belum disimpan. Pindah bulan akan membuangnya.",
        confirmLabel: "Pindah",
        cancelLabel: "Batal",
      });
      if (!ok) return;
    }
    setYear(newYear);
    setMonth(newMonth);
    const params = new URLSearchParams({ year: String(newYear), month: String(newMonth) });
    router.push(`${basePath}?${params.toString()}`);
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
      for (const periodDay of periodDays) {
        const key = `${karyawanId}|${periodDay.date}`;
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
                Periode
              </span>
              <input
                type="month"
                value={`${year}-${pad(month)}`}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="mt-1 h-11 rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none focus:border-[#c8716d]"
              />
              <span className="mt-1 block text-[11px] text-[#a16f63]">
                {periodDays.length > 0 ? `${MONTH_LABELS[periodDays[0].month - 1]} ${periodDays[0].day} – ${MONTH_LABELS[periodDays[periodDays.length - 1].month - 1]} ${periodDays[periodDays.length - 1].day}, ${year}` : ""}
              </span>
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
        <section
          ref={tableScrollRef}
          className="overflow-auto max-h-[calc(100vh-300px)] rounded-[24px] border border-[#ead7ce] bg-white shadow-[0_10px_30px_rgba(96,45,34,0.06)]"
        >
          <table className="min-w-full border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-[#fff2ec]">
              <tr className="border-b border-[#efe0d8] bg-[#fff2ec] text-xs uppercase tracking-[0.12em] text-[#7a6059]">
                <th className="sticky left-0 z-30 min-w-[220px] bg-[#fff2ec] px-4 py-3 font-semibold">
                  Karyawan
                </th>
                <th className="min-w-[140px] px-3 py-3 font-semibold">Quick Fill</th>
                {periodDays.map((pd) => {
                  const date = new Date(pd.year, pd.month - 1, pd.day);
                  const dow = date.getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const dayShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][dow];
                  return (
                    <th
                      key={pd.date}
                      className={`min-w-[88px] px-1 py-2 text-center font-semibold ${
                        isWeekend ? "bg-[#ffe8e0] text-[#8f1d22]" : "bg-[#fff2ec]"
                      }`}
                    >
                      <div className="text-[10px] tracking-[0.06em]">{dayShort}</div>
                      <div className="text-sm">{pd.day}</div>
                      <div className="text-[9px] text-[#a16f63]">{MONTH_LABELS[pd.month - 1].slice(0, 3)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {karyawanList.map((k) => {
                const shiftOptions = getShiftOptionsFor(k.penempatan, k.subDivisi, k.noKaryawan);
                return (
                <tr
                  key={k.id}
                  className="border-b border-[#f1e5de] text-sm hover:bg-[#fffaf7]"
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#241716]">{k.nama}</span>
                      {(k.subDivisi ?? "").trim().toLowerCase() === "media" ? (
                        <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200">
                          Media
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-[#7a6059]">
                      {k.penempatan}
                      {k.subDivisi ? ` · ${k.subDivisi}` : ""}
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
                  {periodDays.map((pd) => {
                    const value = jadwalMap.get(`${k.id}|${pd.date}`) ?? "";
                    return (
                      <td key={pd.date} className="px-1 py-1">
                        <select
                          value={value}
                          onChange={(e) => setCell(k.id, pd.date, e.target.value as ShiftOption)}
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
        periode dengan shift yang sama, lalu sesuaikan tanggal libur per karyawan.
      </p>

      <div
        ref={ghostScrollRef}
        className="fixed z-40 overflow-x-auto border-t border-[#ead7ce] bg-white/95 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur"
        aria-hidden="true"
        style={{
          left: ghostBar.left,
          width: ghostBar.width,
          bottom: 0,
          display: ghostBar.visible ? "block" : "none",
        }}
      >
        <div style={{ width: tableScrollWidth, height: 1 }} aria-hidden="true" />
      </div>
    </div>
  );
}
