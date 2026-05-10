import Link from "next/link";

import EmployeeShell from "@/components/EmployeeShell";
import BonusSlipSheet from "@/components/BonusSlipSheet";
import { requireEmployeeSession } from "@/lib/auth";
import {
  getEmployeeBonusSlipForPeriod,
  listEmployeeDistributedBonusPeriods,
} from "@/lib/bonus-slip";
import { getEmployeeByUserId } from "@/lib/hris";

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

export default async function EmployeeBonusSlipsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const periods = await listEmployeeDistributedBonusPeriods(employee.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedMonth = parsePositiveInt(resolvedSearchParams.month);
  const requestedYear = parsePositiveInt(resolvedSearchParams.year);

  const fallbackPeriod = periods[0] ?? null;
  const selectedPeriod =
    requestedMonth && requestedYear && periods.some((p) => p.month === requestedMonth && p.year === requestedYear)
      ? { month: requestedMonth, year: requestedYear }
      : fallbackPeriod;

  const bonusRow = selectedPeriod
    ? await getEmployeeBonusSlipForPeriod(employee.id, selectedPeriod.month, selectedPeriod.year)
    : null;

  const selectedPeriodLabel = selectedPeriod
    ? formatPeriodLabel(selectedPeriod.month, selectedPeriod.year)
    : "—";

  return (
    <EmployeeShell
      title="Slip Bonus"
      description="Lihat slip bonus periode aktif maupun bulan-bulan sebelumnya."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/bonus-slips"
      employeeRole={employee.jabatan}
    >
      <div className="space-y-6">
        <section className="rounded-[28px] border border-[#e3d5a8] bg-[linear-gradient(180deg,#fffdf0_0%,#fff7d6_100%)] px-5 py-5 shadow-[0_18px_40px_rgba(124,91,0,0.06)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a07c00]">Periode Slip Bonus</p>
              <h2 className="mt-2 text-xl font-semibold text-[#3d2d00] sm:text-2xl">{selectedPeriodLabel}</h2>
              <p className="mt-1 text-sm text-[#7c5b00]">Pilih bulan untuk melihat slip bonus periode lain.</p>
            </div>

            {periods.length > 0 ? (
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#e3d5a8] bg-white px-4 py-2.5 text-sm font-semibold text-[#3d2d00] shadow-[0_10px_24px_rgba(124,91,0,0.08)] transition hover:border-[#a07c00] hover:text-[#7c5b00] [&::-webkit-details-marker]:hidden">
                  <CalendarIcon />
                  <span>{selectedPeriodLabel}</span>
                  <ChevronDownIcon />
                </summary>
                <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-[#e3d5a8] bg-white shadow-[0_24px_60px_rgba(124,91,0,0.18)]">
                  <ul className="max-h-72 overflow-y-auto py-1 text-sm">
                    {periods.map((p) => {
                      const isActive =
                        selectedPeriod?.month === p.month && selectedPeriod?.year === p.year;
                      return (
                        <li key={`${p.year}-${p.month}`}>
                          <Link
                            href={`/employee/bonus-slips?month=${p.month}&year=${p.year}`}
                            className={`flex items-center justify-between px-4 py-2.5 transition ${isActive ? "bg-[#fff7d6] text-[#7c5b00] font-semibold" : "text-[#3d2d00] hover:bg-[#fffdf0]"}`}
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

        {bonusRow && selectedPeriod ? (
          <BonusSlipSheet row={bonusRow} periodLabel={selectedPeriodLabel} />
        ) : (
          <div className="rounded-[28px] border border-[#ead7ce] bg-white px-6 py-10 text-sm text-[#7a6059]">
            {periods.length === 0
              ? "Belum ada slip bonus yang didistribusikan untuk Anda."
              : "Slip bonus untuk periode ini belum tersedia."}
          </div>
        )}
      </div>
    </EmployeeShell>
  );
}
