"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type VisitReport = {
  id: number;
  employeeId: number;
  employeeName: string;
  role: string | null;
  division: string | null;
  tanggal: string;
  waktuSubmit: string;
  namaToko: string;
  fotoPath: string;
  latitude: number | null;
  longitude: number | null;
};

type Summary = {
  employeeId: number;
  employeeName: string;
  role: string | null;
  totalVisits: number;
  uniqueStores: number;
  activeDays: number;
};

type SalesEmployee = {
  id: number;
  name: string;
};

type Props = {
  initialReports: VisitReport[];
  initialSummary: Summary[];
  salesEmployees: SalesEmployee[];
  defaultStartDate: string;
  defaultEndDate: string;
  defaultMonth: number;
  defaultYear: number;
};

const monthNames = [
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

function formatDateLabel(tanggal: string) {
  const [year, month, day] = tanggal.split("-");
  if (!year || !month || !day) return tanggal;
  return `${day} ${monthNames[Number(month) - 1] ?? month} ${year}`;
}

function formatTime(dateTime: string) {
  const timePart = dateTime.split(" ")[1] ?? dateTime.split("T")[1];
  if (!timePart) return dateTime;
  return timePart.slice(0, 5);
}

export default function AdminVisitReports({
  initialReports,
  initialSummary,
  salesEmployees,
  defaultStartDate,
  defaultEndDate,
  defaultMonth,
  defaultYear,
}: Props) {
  const [tab, setTab] = useState<"timeline" | "summary">("timeline");

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [reports, setReports] = useState<VisitReport[]>(initialReports);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportError, setReportError] = useState("");

  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);
  const [summary, setSummary] = useState<Summary[]>(initialSummary);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  async function fetchReports() {
    setLoadingReports(true);
    setReportError("");
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (employeeId) params.set("employeeId", employeeId);
      const response = await fetch(`/api/admin/visit-reports?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { reports?: VisitReport[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? "Gagal memuat data.");
      setReports(data.reports ?? []);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Gagal memuat data.");
    } finally {
      setLoadingReports(false);
    }
  }

  async function fetchSummary() {
    setLoadingSummary(true);
    setSummaryError("");
    try {
      const response = await fetch(
        `/api/admin/visit-reports/summary?month=${month}&year=${year}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as { summary?: Summary[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? "Gagal memuat summary.");
      setSummary(data.summary ?? []);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Gagal memuat summary.");
    } finally {
      setLoadingSummary(false);
    }
  }

  const reportsByDateAndEmployee = useMemo(() => {
    const grouped = new Map<string, Map<number, VisitReport[]>>();
    for (const report of reports) {
      const dateMap = grouped.get(report.tanggal) ?? new Map<number, VisitReport[]>();
      const list = dateMap.get(report.employeeId) ?? [];
      list.push(report);
      dateMap.set(report.employeeId, list);
      grouped.set(report.tanggal, dateMap);
    }
    return grouped;
  }, [reports]);

  const orderedDates = useMemo(
    () => Array.from(reportsByDateAndEmployee.keys()).sort((a, b) => (a < b ? 1 : -1)),
    [reportsByDateAndEmployee],
  );

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-2xl border border-[#e4d6cf] bg-[#fff8f4] p-1">
        <button
          type="button"
          onClick={() => setTab("timeline")}
          className={
            tab === "timeline"
              ? "rounded-xl bg-[#8f1d22] px-4 py-2 text-sm font-semibold text-white"
              : "rounded-xl px-4 py-2 text-sm font-semibold text-[#7a6059]"
          }
        >
          Timeline Harian
        </button>
        <button
          type="button"
          onClick={() => setTab("summary")}
          className={
            tab === "summary"
              ? "rounded-xl bg-[#8f1d22] px-4 py-2 text-sm font-semibold text-white"
              : "rounded-xl px-4 py-2 text-sm font-semibold text-[#7a6059]"
          }
        >
          Summary Bulanan
        </button>
      </div>

      {tab === "timeline" ? (
        <section className="rounded-3xl border border-[#ead7ce] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold text-[#7a6059]">
              Dari Tanggal
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#ead7ce] bg-white px-3 py-2 text-sm text-[#241716] outline-none focus:border-[#c8716d]"
              />
            </label>
            <label className="text-xs font-semibold text-[#7a6059]">
              Sampai Tanggal
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#ead7ce] bg-white px-3 py-2 text-sm text-[#241716] outline-none focus:border-[#c8716d]"
              />
            </label>
            <label className="text-xs font-semibold text-[#7a6059]">
              Karyawan
              <select
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#ead7ce] bg-white px-3 py-2 text-sm text-[#241716] outline-none focus:border-[#c8716d]"
              >
                <option value="">Semua Sales Area</option>
                {salesEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={fetchReports}
                disabled={loadingReports}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#8f1d22] px-4 text-sm font-semibold text-white transition hover:bg-[#7a171c] disabled:opacity-60"
              >
                {loadingReports ? "Memuat..." : "Terapkan Filter"}
              </button>
            </div>
          </div>

          {reportError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {reportError}
            </p>
          ) : null}

          <div className="mt-5 space-y-5">
            {orderedDates.length === 0 && !loadingReports ? (
              <p className="rounded-xl border border-dashed border-[#ead7ce] bg-[#fffbf9] px-4 py-6 text-center text-[13px] text-[#7a6059]">
                Tidak ada laporan kunjungan dalam rentang ini.
              </p>
            ) : null}
            {orderedDates.map((date) => {
              const dateMap = reportsByDateAndEmployee.get(date);
              if (!dateMap) return null;
              return (
                <div key={date} className="rounded-2xl border border-[#ead7ce] bg-[#fffbf9] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                    {formatDateLabel(date)}
                  </p>
                  <div className="mt-3 space-y-3">
                    {Array.from(dateMap.entries()).map(([empId, list]) => (
                      <div
                        key={empId}
                        className="rounded-xl border border-[#f3ebe7] bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[13px] font-semibold text-[#241716]">
                            {list[0].employeeName}
                          </p>
                          <span className="rounded-full bg-[#fff3ef] px-2.5 py-0.5 text-[11px] font-semibold text-[#8f1d22]">
                            {list.length} kunjungan
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {list.map((report) => (
                            <div
                              key={report.id}
                              className="flex gap-2 rounded-lg border border-[#f3ebe7] bg-[#fffbf9] p-2"
                            >
                              <div className="h-16 w-16 flex-none overflow-hidden rounded-md bg-[#f7f1ec]">
                                {report.fotoPath ? (
                                  <Image
                                    src={report.fotoPath}
                                    alt={report.namaToko}
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-[#241716]">
                                  {report.namaToko}
                                </p>
                                <p className="text-[11px] tabular-nums text-[#7a6059]">
                                  {formatTime(report.waktuSubmit)}
                                </p>
                                {report.latitude !== null && report.longitude !== null ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block text-[11px] font-semibold text-[#8f1d22] hover:underline"
                                  >
                                    Buka peta
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-[#ead7ce] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-[#7a6059]">
              Bulan
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-[#ead7ce] bg-white px-3 py-2 text-sm text-[#241716] outline-none focus:border-[#c8716d]"
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#7a6059]">
              Tahun
              <input
                type="number"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-[#ead7ce] bg-white px-3 py-2 text-sm text-[#241716] outline-none focus:border-[#c8716d]"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={fetchSummary}
                disabled={loadingSummary}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#8f1d22] px-4 text-sm font-semibold text-white transition hover:bg-[#7a171c] disabled:opacity-60"
              >
                {loadingSummary ? "Memuat..." : "Terapkan"}
              </button>
            </div>
          </div>

          {summaryError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {summaryError}
            </p>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#ead7ce]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#fff3ef] text-[12px] uppercase tracking-[0.12em] text-[#a16f63]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Karyawan</th>
                  <th className="px-4 py-3 font-semibold">Jabatan</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Kunjungan</th>
                  <th className="px-4 py-3 text-right font-semibold">Toko Unik</th>
                  <th className="px-4 py-3 text-right font-semibold">Hari Aktif</th>
                </tr>
              </thead>
              <tbody>
                {summary.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-[13px] text-[#7a6059]"
                    >
                      Tidak ada data kunjungan untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  summary.map((row) => (
                    <tr key={row.employeeId} className="border-t border-[#f3ebe7]">
                      <td className="px-4 py-3 font-semibold text-[#241716]">
                        {row.employeeName}
                      </td>
                      <td className="px-4 py-3 text-[#7a6059]">{row.role ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#241716]">
                        {row.totalVisits}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#241716]">
                        {row.uniqueStores}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#241716]">
                        {row.activeDays}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export type { VisitReport as AdminVisitReport, Summary as AdminVisitSummary };
