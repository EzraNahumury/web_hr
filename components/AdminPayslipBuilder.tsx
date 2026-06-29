"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PayslipSheet from "@/components/PayslipSheet";
import type { AdminPayrollSummarySheetRow } from "@/lib/payroll-summary";

type Props = {
  periodLabel: string;
  rangeLabel: string;
  rows: AdminPayrollSummarySheetRow[];
  selectedEmployeeId: number | null;
  periodMonth: number;
  periodYear: number;
};

function buildEmployeeLabel(row: AdminPayrollSummarySheetRow) {
  const typeLabel = row.payrollType === "sales" ? "Sales" : row.payrollType === "penjahit" ? "Penjahit" : "Non Sales";
  return `${row.name.toUpperCase()} / ${row.role} / ${typeLabel}`;
}

export default function AdminPayslipBuilder({ periodLabel, rangeLabel, rows, selectedEmployeeId, periodMonth, periodYear }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentMonthInputValue = `${periodYear}-${String(periodMonth).padStart(2, "0")}`;

  function handlePeriodChange(value: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month)) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", String(month));
      params.set("year", String(year));
      router.replace(`/admin/payslips?${params.toString()}`, { scroll: false });
    });
  }

  const defaultEmployeeId = useMemo(() => {
    if (!rows.length) {
      return 0;
    }

    if (selectedEmployeeId && rows.some((row) => row.employeeId === selectedEmployeeId)) {
      return selectedEmployeeId;
    }

    return rows[0].employeeId;
  }, [rows, selectedEmployeeId]);

  const [currentEmployeeId, setCurrentEmployeeId] = useState(defaultEmployeeId);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentEmployeeId(defaultEmployeeId);
  }, [defaultEmployeeId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => buildEmployeeLabel(r).toLowerCase().includes(q));
  }, [rows, search]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.employeeId === currentEmployeeId) ?? rows[0] ?? null,
    [currentEmployeeId, rows],
  );

  function handleEmployeeChange(nextEmployeeId: number) {
    setCurrentEmployeeId(nextEmployeeId);

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("employee", String(nextEmployeeId));
      router.replace(`/admin/payslips?${params.toString()}`, { scroll: false });
    });
  }

  if (!rows.length) {
    return (
      <div className="rounded-[32px] border border-[#ead7ce] bg-white px-6 py-10 text-sm text-[#7a6059]">
        Belum ada payroll yang siap dijadikan slip gaji untuk periode ini.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <article className="rounded-[30px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Periode Slip</p>
          <h2 className="mt-3 text-2xl font-semibold text-[#241716]">{periodLabel}</h2>
          <p className="mt-2 text-sm text-[#7a6059]">Rentang payroll {rangeLabel}</p>
          <div className="mt-4">
            <label className="block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">Pilih Periode</label>
            <input
              type="month"
              value={currentMonthInputValue}
              onChange={(event) => handlePeriodChange(event.target.value)}
              disabled={isPending}
              className="mt-2 h-11 w-full rounded-2xl border border-[#d9cbc5] bg-white px-4 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_4px_rgba(201,127,91,0.14)] disabled:opacity-60"
            />
          </div>
        </article>

        <article className="rounded-[30px] border border-[#d9ebe9] bg-[linear-gradient(180deg,#f8ffff_0%,#effaf8_100%)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4f7d73]">Aturan Slip</p>
          <p className="mt-3 text-sm leading-7 text-[#35585b]">
            Uang makan, BPJS, bonus omzet, uang kerajinan, dan subsidi tidak ditampilkan terpisah di slip.
            Semua komponen tersebut sudah digabung ke dalam Tunjangan Lain-Lain.
          </p>
        </article>
      </div>

      <section className="rounded-[32px] border border-[#ead7ce] bg-white p-6 shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="block space-y-2">
            <span className="block text-[13px] font-semibold text-[#466668]">Pilih Karyawan</span>
            <div ref={dropdownRef} className="relative">
              <input
                type="text"
                value={dropdownOpen ? search : (selectedRow ? buildEmployeeLabel(selectedRow) : "")}
                onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
                onFocus={() => { setSearch(""); setDropdownOpen(true); }}
                placeholder="Cari nama karyawan..."
                disabled={isPending}
                className="h-12 w-full rounded-2xl border border-[#d9cbc5] bg-white px-4 pr-10 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_4px_rgba(201,127,91,0.14)] disabled:opacity-60"
              />
              <svg className="pointer-events-none absolute right-3.5 top-3.5 h-5 w-5 text-[#8a5d52]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
              </svg>
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#d9cbc5] bg-white shadow-xl">
                  {filteredRows.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[#9e7a72]">Tidak ditemukan.</p>
                  ) : filteredRows.map((row) => (
                    <button
                      key={row.employeeId}
                      type="button"
                      onClick={() => { handleEmployeeChange(row.employeeId); setDropdownOpen(false); setSearch(""); }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#fff0e8] ${row.employeeId === currentEmployeeId ? "bg-[#fff0e8] font-semibold text-[#8f1d22]" : "text-[#241716]"}`}
                    >
                      {buildEmployeeLabel(row)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedRow ? (
            <div className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${selectedRow.payrollType === "penjahit" ? "border-[#e3d5a8] bg-[#fff7d6] text-[#7c5b00]" : selectedRow.payrollType === "sales" ? "border-[#c8d8ca] bg-[#eef6ef] text-[#4b6d51]" : "border-[#ead7ce] bg-[#fff7f2] text-[#8a5d52]"}`}>
              {selectedRow.payrollType === "sales" ? "Sales" : selectedRow.payrollType === "penjahit" ? "Penjahit" : "Non Sales"}
            </div>
          ) : null}
        </div>
      </section>

      {selectedRow ? <PayslipSheet row={selectedRow} periodLabel={periodLabel} rangeLabel={rangeLabel} /> : null}
    </div>
  );
}
