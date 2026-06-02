"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { AttendanceDayDetail } from "@/lib/hris";

const ATTENDANCE_CODE_OPTIONS: { code: string; label: string }[] = [
  { code: "O", label: "Hadir (O)" },
  { code: "T", label: "Terlambat (T)" },
  { code: "H", label: "Setengah Hari (H)" },
  { code: "S", label: "Sakit + Surat (S)" },
  { code: "SX", label: "Sakit Tanpa Surat (SX)" },
  { code: "I", label: "Izin (I)" },
  { code: "A", label: "Alfa (A)" },
  { code: "L", label: "Libur (L)" },
  { code: "C", label: "Cuti (C)" },
];

type Row = {
  employeeId: number;
  name: string;
  nip: string;
  role: string;
  division: string;
  department: string;
  email: string;
  passwordLabel: string;
  daily: Record<number, AttendanceDayDetail>;
};

type Props = {
  days: number[];
  rows: Row[];
  month: number;
  year: number;
  holidayMap: Record<string, string>;
};

function buildDateIso(day: number, month: number, year: number) {
  if (day >= 26) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type SelectedAttendance = {
  employeeId: number;
  employeeName: string;
  day: number;
  detail: AttendanceDayDetail;
} | null;

function AttendanceDetailModal({
  selected,
  onClose,
}: {
  selected: SelectedAttendance;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pendingCode, setPendingCode] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    setPendingCode(selected?.detail.code || "");
    setFeedback(null);
  }, [selected]);

  if (!selected) {
    return null;
  }

  function handleSave() {
    if (!selected) return;
    if (!pendingCode) {
      setFeedback({ type: "error", text: "Pilih kode absensi terlebih dahulu." });
      return;
    }
    if (selected.detail.code && pendingCode === selected.detail.code) {
      setFeedback({ type: "error", text: "Kode tidak berubah." });
      return;
    }

    setFeedback(null);
    startSaveTransition(async () => {
      try {
        const response = await fetch("/api/admin/attendance/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: selected.employeeId,
            date: selected.detail.date,
            code: pendingCode,
          }),
        });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) {
          throw new Error(result.message || "Gagal memperbarui kode absensi.");
        }
        setFeedback({ type: "success", text: result.message || "Kode absensi diperbarui." });
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan.",
        });
      }
    });
  }

  const isSick = selected.detail.code === "S" || selected.detail.status === "sakit";
  const mapInput =
    selected.detail.latitudeIn !== null && selected.detail.longitudeIn !== null
      ? `${selected.detail.latitudeIn},${selected.detail.longitudeIn}`
      : selected.detail.latitudeOut !== null && selected.detail.longitudeOut !== null
        ? `${selected.detail.latitudeOut},${selected.detail.longitudeOut}`
        : null;
  const mapUrl = mapInput
    ? `https://www.google.com/maps?q=${mapInput}&z=18&output=embed`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e9dfda] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
              Detail Absensi
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#241716]">
              {selected.employeeName} - Tanggal {selected.day}
            </h3>
            <p className="mt-2 text-sm text-[#7a6059]">
              Status: {selected.detail.status || "-"} | Kode: {selected.detail.code || "-"}
            </p>
            <p className="mt-2 text-sm text-[#7a6059]">
              Jam masuk: {selected.detail.timeIn || "-"} | Jam pulang: {selected.detail.timeOut || "-"}
            </p>
            <p className="mt-2 text-sm text-[#7a6059]">
              Terlambat: {selected.detail.lateMinutes > 0 ? `${selected.detail.lateMinutes} menit` : "-"}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-[#3c2824]">
                {selected.detail.code ? "Ubah Kode:" : "Set Kode:"}
              </label>
              <select
                value={pendingCode}
                onChange={(event) => setPendingCode(event.target.value)}
                disabled={isSaving}
                className="h-10 rounded-xl border border-[#e8d5cc] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_3px_rgba(201,127,91,0.14)]"
              >
                <option value="">Pilih kode...</option>
                {ATTENDANCE_CODE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !pendingCode || (!!selected.detail.code && pendingCode === selected.detail.code)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#8f1d22] px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(143,29,34,0.22)] transition hover:bg-[#a12228] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
              {feedback ? (
                <span
                  className={`text-xs font-medium ${
                    feedback.type === "success" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {feedback.text}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#e8d5cc] bg-white px-4 py-2 text-sm font-semibold text-[#3c2824]"
          >
            Tutup
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#3c2824]">
                {isSick ? "Surat / Bukti Sakit" : "Foto Selfie Masuk"}
              </p>
              <div className="mt-3 overflow-hidden rounded-[22px] border border-[#ead7ce] bg-[#f8f3ef]">
                {selected.detail.photoIn ? (
                  /\.(pdf)$/i.test(selected.detail.photoIn) ? (
                    <iframe
                      title="Bukti sakit"
                      src={selected.detail.photoIn}
                      className="h-[280px] w-full border-0"
                    />
                  ) : (
                    <Image
                      src={selected.detail.photoIn}
                      alt={isSick ? "Bukti sakit" : "Foto selfie masuk"}
                      width={720}
                      height={900}
                      unoptimized
                      className="h-[280px] w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-[#8a6f68]">
                    {isSick ? "Bukti sakit belum tersedia." : "Foto masuk belum tersedia."}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#3c2824]">
                {isSick ? "Catatan Sakit" : "Foto Selfie Pulang"}
              </p>
              <div className="mt-3 overflow-hidden rounded-[22px] border border-[#ead7ce] bg-[#f8f3ef]">
                {isSick ? (
                  <div className="flex min-h-[280px] items-start justify-start p-5 text-sm leading-7 text-[#7a6059]">
                    {selected.detail.note || "Catatan sakit belum diisi."}
                  </div>
                ) : selected.detail.photoOut ? (
                  <Image
                    src={selected.detail.photoOut}
                    alt="Foto selfie pulang"
                    width={720}
                    height={900}
                    unoptimized
                    className="h-[280px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-[#8a6f68]">
                    Foto pulang belum tersedia.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[22px] border border-[#ead7ce] bg-[#fff8f4] p-4 text-sm text-[#7a6059]">
              <p>Jam masuk: {selected.detail.timeIn || "-"}</p>
              <p className="mt-2">Jam pulang: {selected.detail.timeOut || "-"}</p>
              <p className="mt-2">
                Terlambat: {selected.detail.lateMinutes > 0 ? `${selected.detail.lateMinutes} menit` : "-"}
              </p>
              {(isSick || selected.detail.isEarlyLeave) ? (
                <p className="mt-4">Keterangan: {selected.detail.note || "-"}</p>
              ) : null}
              <p className="mt-4">Latitude masuk: {selected.detail.latitudeIn ?? "-"}</p>
              <p className="mt-2">Longitude masuk: {selected.detail.longitudeIn ?? "-"}</p>
              <p className="mt-4">Latitude pulang: {selected.detail.latitudeOut ?? "-"}</p>
              <p className="mt-2">Longitude pulang: {selected.detail.longitudeOut ?? "-"}</p>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#ead7ce] bg-[#f8f3ef]">
              {mapUrl ? (
                <iframe
                  title="Lokasi absensi tersimpan"
                  src={mapUrl}
                  className="h-[360px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-[#8a6f68]">
                  Lokasi absensi belum tersedia.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAttendanceSheet({ days, rows, month, year, holidayMap }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedAttendance>(null);
  const [search, setSearch] = useState("");
  const [holidayTarget, setHolidayTarget] = useState<{ day: number; date: string } | null>(null);
  const [holidayDescription, setHolidayDescription] = useState("");
  const [holidayFeedback, setHolidayFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingHoliday, startHolidayTransition] = useTransition();
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const ghostScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [ghostBar, setGhostBar] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

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
  }, []);

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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter((row) =>
        [row.name, row.nip, row.role, row.division, row.department, row.email]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(normalizedSearch)),
      )
    : rows;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama, NIP, jabatan, divisi, email..."
          className="h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-sm text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)] sm:max-w-md"
        />
        {normalizedSearch && (
          <p className="text-xs font-semibold text-[#7a6059]">
            {filteredRows.length} dari {rows.length} karyawan
          </p>
        )}
      </div>
      <div ref={tableScrollRef} className="overflow-auto max-h-[calc(100vh-260px)]">
        <table className="min-w-[1800px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="sticky left-0 z-20 min-w-[200px] bg-[#fff8f4] px-4 py-4 shadow-[2px_0_0_0_#efe0d8]">
                Nama
              </th>
              <th className="px-4 py-4">NIP</th>
              <th className="px-4 py-4">Jabatan</th>
              <th className="px-4 py-4">Divisi</th>
              <th className="px-4 py-4">Departemen</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Password</th>
              {days.map((day) => {
                const iso = buildDateIso(day, month, year);
                const holidayDesc = holidayMap[iso];
                const isHolidayDay = Boolean(holidayDesc);
                return (
                  <th key={day} className="px-3 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setHolidayDescription(holidayDesc ?? "");
                        setHolidayFeedback(null);
                        setHolidayTarget({ day, date: iso });
                      }}
                      title={isHolidayDay ? `Libur: ${holidayDesc}` : "Klik untuk set libur nasional"}
                      className={
                        isHolidayDay
                          ? "rounded-md bg-[#fde2dd] px-2 py-1 font-semibold text-[#8f1d22] transition hover:bg-[#fdcfc7]"
                          : "rounded-md px-2 py-1 transition hover:bg-[#fdebda] hover:text-[#8f1d22]"
                      }
                    >
                      {day}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.employeeId} className="border-b border-[#f1e5de] text-[#513d39]">
                <td className="sticky left-0 z-10 min-w-[200px] bg-white px-4 py-4 font-semibold uppercase text-[#241716] shadow-[2px_0_0_0_#f1e5de]">
                  {row.name}
                </td>
                <td className="px-4 py-4">{row.nip}</td>
                <td className="px-4 py-4">{row.role}</td>
                <td className="px-4 py-4">{row.division}</td>
                <td className="px-4 py-4">{row.department}</td>
                <td className="px-4 py-4">{row.email}</td>
                <td className="px-4 py-4 text-[#9a7a72]">{row.passwordLabel}</td>
                {days.map((day) => {
                  const detail = row.daily[day];
                  const isClickable = !!detail;
                  const missingCheckout =
                    !!detail &&
                    detail.code === "O" &&
                    !!detail.timeIn &&
                    !detail.timeOut;
                  const earlyLeave =
                    !!detail &&
                    detail.code === "O" &&
                    !!detail.timeIn &&
                    !!detail.timeOut &&
                    detail.isEarlyLeave;
                  const displayCode = earlyLeave ? "PA" : detail?.code || "-";
                  const cellTitle = missingCheckout
                    ? "Belum presensi pulang"
                    : earlyLeave
                      ? "Pulang awal (sebelum jadwal selesai)"
                      : undefined;

                  return (
                    <td key={day} className="px-3 py-4 text-center font-medium">
                      {detail ? (
                        <button
                          type="button"
                          title={cellTitle}
                          onClick={() =>
                            isClickable
                              ? setSelected({
                                  employeeId: row.employeeId,
                                  employeeName: row.name,
                                  day,
                                  detail,
                                })
                              : undefined
                          }
                          className={
                            missingCheckout
                              ? "inline-flex min-w-8 items-center justify-center rounded-lg bg-[#fde2dd] px-2 py-1 text-xs font-bold text-[#c0392b] transition hover:bg-[#fbcec7]"
                              : earlyLeave
                                ? "inline-flex min-w-8 items-center justify-center rounded-lg bg-[#fff5d6] px-2 py-1 text-xs font-bold text-[#8d6200] transition hover:bg-[#fde9a4]"
                                : isClickable
                                  ? "inline-flex min-w-8 items-center justify-center rounded-lg bg-[#fff4ee] px-2 py-1 text-xs transition hover:bg-[#f5ddd2] hover:text-[#8f1d22]"
                                  : "inline-flex min-w-8 items-center justify-center rounded-lg bg-[#fff4ee] px-2 py-1 text-xs"
                          }
                        >
                          {displayCode}
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Input absensi manual"
                          onClick={() => {
                            const date = buildDateIso(day, month, year);
                            setSelected({
                              employeeId: row.employeeId,
                              employeeName: row.name,
                              day,
                              detail: {
                                code: "",
                                date,
                                status: null,
                                timeIn: null,
                                timeOut: null,
                                photoIn: null,
                                photoOut: null,
                                latitudeIn: null,
                                longitudeIn: null,
                                latitudeOut: null,
                                longitudeOut: null,
                                lateMinutes: 0,
                                note: null,
                                isEarlyLeave: false,
                              },
                            });
                          }}
                          className="inline-flex min-w-8 items-center justify-center rounded-lg border border-dashed border-[#e5d4ce] bg-[#fff4ee] px-2 py-1 text-xs text-[#b39086] transition hover:border-[#8f1d22] hover:bg-[#f5ddd2] hover:text-[#8f1d22]"
                        >
                          -
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        ref={ghostScrollRef}
        className="fixed z-40 overflow-x-auto border-t border-[#efe0d8] bg-[#fff8f4]/95 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur"
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

      <AttendanceDetailModal selected={selected} onClose={() => setSelected(null)} />

      {holidayTarget ? (() => {
        const isExistingHoliday = Boolean(holidayMap[holidayTarget.date]);

        return (
          <div
            className="fixed inset-0 z-[2000] flex items-center justify-center px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="holiday-dialog-title"
          >
            <button
              type="button"
              aria-label="Tutup dialog"
              onClick={isSavingHoliday ? undefined : () => setHolidayTarget(null)}
              className="absolute inset-0 h-full w-full cursor-default bg-[#1c0e0a]/55 backdrop-blur-sm"
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)] shadow-[0_30px_80px_rgba(58,24,12,0.28)] ring-1 ring-[#f3c8c2]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(192,57,43,0.18),transparent_70%)]" />
              <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(166,117,0,0.12),transparent_70%)]" />

              <div className="relative px-7 pt-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fdecea] text-[#c0392b] shadow-[0_10px_24px_rgba(58,24,12,0.08)]">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" />
                      <path d="M16 2v4" />
                      <path d="M8 2v4" />
                      <path d="M3 10h18" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 id="holiday-dialog-title" className="text-lg font-semibold text-[#241716]">
                      {isExistingHoliday ? "Batalkan Libur Nasional" : "Set Libur Nasional"}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#6e574f]">
                      Tanggal: <span className="font-semibold text-[#241716]">{holidayTarget.date}</span>.{" "}
                      {isExistingHoliday
                        ? "Tanggal ini sudah ditandai libur nasional. Klik tombol di bawah untuk membatalkan dan menghapus absensi kode L yang dibuat otomatis."
                        : "Semua karyawan aktif akan ditandai libur (kode L) untuk tanggal ini. Karyawan yang sudah punya absensi di tanggal ini tidak akan tertimpa."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <label className="block text-[13px] font-semibold text-[#6f5a54]">Keterangan Libur</label>
                  <input
                    type="text"
                    value={holidayDescription}
                    onChange={(event) => setHolidayDescription(event.target.value)}
                    placeholder="Contoh: Hari Raya Idul Fitri"
                    maxLength={255}
                    disabled={isSavingHoliday || isExistingHoliday}
                    className="h-11 w-full rounded-xl border border-[#e8d5cc] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_3px_rgba(201,127,91,0.14)] disabled:bg-[#f8eee8]"
                  />
                </div>

                {holidayFeedback ? (
                  <div
                    className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                      holidayFeedback.type === "success"
                        ? "border border-[#cfe8d4] bg-[#f2fbf4] text-[#267344]"
                        : "border border-[#f2c4c4] bg-[#fff4f4] text-[#b13232]"
                    }`}
                  >
                    {holidayFeedback.text}
                  </div>
                ) : null}
              </div>

              <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[#f1e1d8] bg-white/60 px-7 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setHolidayTarget(null)}
                  disabled={isSavingHoliday}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#e2cfc6] bg-white px-5 text-sm font-semibold text-[#5a443d] transition hover:bg-[#fdf6f1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tutup
                </button>
                {isExistingHoliday ? (
                  <button
                    type="button"
                    disabled={isSavingHoliday}
                    onClick={() => {
                      if (!holidayTarget) return;
                      setHolidayFeedback(null);
                      startHolidayTransition(async () => {
                        try {
                          const response = await fetch(
                            `/api/admin/attendance/holiday?date=${encodeURIComponent(holidayTarget.date)}`,
                            { method: "DELETE" },
                          );
                          const result = (await response.json()) as { message?: string };
                          if (!response.ok) {
                            throw new Error(result.message || "Gagal membatalkan libur nasional.");
                          }
                          setHolidayFeedback({ type: "success", text: result.message || "Libur nasional dibatalkan." });
                          router.refresh();
                          setTimeout(() => setHolidayTarget(null), 600);
                        } catch (error) {
                          setHolidayFeedback({
                            type: "error",
                            text: error instanceof Error ? error.message : "Terjadi kesalahan saat membatalkan.",
                          });
                        }
                      });
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#8d6200] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(141,98,0,0.28)] transition hover:bg-[#7c5b00] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingHoliday ? "Memproses..." : "Batalkan Libur Nasional"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSavingHoliday || !holidayDescription.trim()}
                    onClick={() => {
                      if (!holidayTarget) return;
                      const desc = holidayDescription.trim();
                      if (!desc) {
                        setHolidayFeedback({ type: "error", text: "Keterangan libur wajib diisi." });
                        return;
                      }
                      setHolidayFeedback(null);
                      startHolidayTransition(async () => {
                        try {
                          const response = await fetch("/api/admin/attendance/holiday", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ date: holidayTarget.date, description: desc }),
                          });
                          const result = (await response.json()) as { message?: string };
                          if (!response.ok) {
                            throw new Error(result.message || "Gagal menyimpan libur nasional.");
                          }
                          setHolidayFeedback({ type: "success", text: result.message || "Libur nasional tersimpan." });
                          router.refresh();
                          setTimeout(() => setHolidayTarget(null), 600);
                        } catch (error) {
                          setHolidayFeedback({
                            type: "error",
                            text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan.",
                          });
                        }
                      });
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#c0392b] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(192,57,43,0.28)] transition hover:bg-[#a82d20] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingHoliday ? "Memproses..." : "Set Libur Nasional"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })() : null}
    </>
  );
}
