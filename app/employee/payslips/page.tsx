import Link from "next/link";
import type { RowDataPacket } from "mysql2";

import EmployeeShell from "@/components/EmployeeShell";
import PayslipSheet from "@/components/PayslipSheet";
import { requireEmployeeSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getEmployeeByUserId } from "@/lib/hris";
import { getPenjahitSheet } from "@/lib/payroll-penjahit";
import {
  getAdminPayrollSummarySheet,
  type AdminPayrollSummarySheetRow,
} from "@/lib/payroll-summary";
import { mapPenjahitRow } from "@/lib/payslip-row";

type DistributedPeriodRow = RowDataPacket & {
  month: number;
  year: number;
};

const MONTH_NAMES = [
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

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatPeriodLabel(month: number, year: number) {
  const idx = Math.max(0, Math.min(11, month - 1));
  return `${MONTH_NAMES[idx]} ${year}`;
}

async function getDistributedPeriods(employeeId: number): Promise<{ month: number; year: number }[]> {
  const [rows] = await pool.query<DistributedPeriodRow[]>(
    `
      SELECT DISTINCT p.periode_bulan AS month, p.periode_tahun AS year
      FROM slip_gaji sg
      INNER JOIN payroll p ON p.id = sg.payroll_id
      WHERE p.karyawan_id = ?
        AND sg.status_distribusi IN ('didistribusikan', 'dibaca')
      ORDER BY p.periode_tahun DESC, p.periode_bulan DESC
    `,
    [employeeId],
  );
  return rows.map((r) => ({ month: r.month, year: r.year }));
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default async function EmployeePayslipsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const periods = await getDistributedPeriods(employee.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedMonth = parsePositiveInt(resolvedSearchParams.month);
  const requestedYear = parsePositiveInt(resolvedSearchParams.year);

  const fallbackPeriod = periods[0] ?? null;
  const selectedPeriod =
    requestedMonth && requestedYear && periods.some((p) => p.month === requestedMonth && p.year === requestedYear)
      ? { month: requestedMonth, year: requestedYear }
      : fallbackPeriod;

  const isPenjahit = (employee.jabatan ?? "").trim().toLowerCase() === "penjahit";

  const payslipRow: AdminPayrollSummarySheetRow | null = await (async () => {
    if (!selectedPeriod) return null;

    if (isPenjahit) {
      const sheet = await getPenjahitSheet({ month: selectedPeriod.month, year: selectedPeriod.year });
      const found = sheet?.rows.find((r) => r.employeeId === employee.id);
      return found ? mapPenjahitRow(found) : null;
    }

    const sheet = await getAdminPayrollSummarySheet({ month: selectedPeriod.month, year: selectedPeriod.year });
    return sheet?.rows.find((r) => r.employeeId === employee.id) ?? null;
  })();

  const selectedPeriodLabel = selectedPeriod
    ? formatPeriodLabel(selectedPeriod.month, selectedPeriod.year)
    : "—";

  const rangeLabel = (() => {
    if (!selectedPeriod) return "";
    const start = new Date(selectedPeriod.year, selectedPeriod.month - 2, 26);
    const end = new Date(selectedPeriod.year, selectedPeriod.month - 1, 25);
    const fmt = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    return `${fmt.format(start)} - ${fmt.format(end)}`;
  })();

  return (
    <EmployeeShell
      title="Slip Gaji"
      description="Lihat slip gaji periode aktif maupun bulan-bulan sebelumnya."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/payslips"
      employeeRole={employee.jabatan}
    >
      <div className="space-y-6">
        <section className="rounded-[28px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)] px-5 py-5 shadow-[0_18px_40px_rgba(96,45,34,0.06)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Periode Slip</p>
              <h2 className="mt-2 text-xl font-semibold text-[#241716] sm:text-2xl">{selectedPeriodLabel}</h2>
              <p className="mt-1 text-sm text-[#7b665d]">Pilih bulan untuk melihat slip gaji periode lain.</p>
            </div>

            {periods.length > 0 ? (
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#ead7ce] bg-white px-4 py-2.5 text-sm font-semibold text-[#241716] shadow-[0_10px_24px_rgba(96,45,34,0.08)] transition hover:border-[#c97f5b] hover:text-[#8f1d22] [&::-webkit-details-marker]:hidden">
                  <CalendarIcon />
                  <span>{selectedPeriodLabel}</span>
                  <ChevronDownIcon />
                </summary>
                <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-[#ead7ce] bg-white shadow-[0_24px_60px_rgba(96,45,34,0.18)]">
                  <ul className="max-h-72 overflow-y-auto py-1 text-sm">
                    {periods.map((p) => {
                      const isActive =
                        selectedPeriod?.month === p.month && selectedPeriod?.year === p.year;
                      return (
                        <li key={`${p.year}-${p.month}`}>
                          <Link
                            href={`/employee/payslips?month=${p.month}&year=${p.year}`}
                            className={`flex items-center justify-between px-4 py-2.5 transition ${isActive ? "bg-[#fff3ed] text-[#8f1d22] font-semibold" : "text-[#241716] hover:bg-[#fdf6f1]"}`}
                          >
                            <span>{formatPeriodLabel(p.month, p.year)}</span>
                            {isActive ? <span aria-hidden="true">•</span> : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            ) : null}
          </div>
        </section>

        {payslipRow && selectedPeriod ? (
          <PayslipSheet row={payslipRow} periodLabel={selectedPeriodLabel} rangeLabel={rangeLabel} />
        ) : (
          <div className="rounded-[28px] border border-[#ead7ce] bg-white px-6 py-10 text-sm text-[#7a6059]">
            {periods.length === 0
              ? "Belum ada slip gaji yang didistribusikan untuk Anda."
              : "Slip gaji untuk periode ini belum tersedia."}
          </div>
        )}
      </div>
    </EmployeeShell>
  );
}
