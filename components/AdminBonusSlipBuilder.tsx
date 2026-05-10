"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import BonusSlipSheet, { type BonusSlipRow } from "@/components/BonusSlipSheet";

type Props = {
  periodLabel: string;
  rows: BonusSlipRow[];
  selectedEmployeeId: number | null;
};

const selectClassName =
  "h-12 w-full appearance-none rounded-2xl border border-[#d9cbc5] bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%238a5d52' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:18px_18px] bg-[right_1rem_center] bg-no-repeat px-4 pr-11 text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_4px_rgba(201,127,91,0.14)]";

function buildLabel(row: BonusSlipRow) {
  return `${row.name.toUpperCase()} / ${row.role} / ${row.bonusTypeLabel}`;
}

export default function AdminBonusSlipBuilder({ periodLabel, rows, selectedEmployeeId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const defaultEmployeeId = useMemo(() => {
    if (!rows.length) return 0;
    if (selectedEmployeeId && rows.some((row) => row.employeeId === selectedEmployeeId)) {
      return selectedEmployeeId;
    }
    return rows[0].employeeId;
  }, [rows, selectedEmployeeId]);

  const [currentEmployeeId, setCurrentEmployeeId] = useState(defaultEmployeeId);

  useEffect(() => {
    setCurrentEmployeeId(defaultEmployeeId);
  }, [defaultEmployeeId]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.employeeId === currentEmployeeId) ?? rows[0] ?? null,
    [currentEmployeeId, rows],
  );

  function handleEmployeeChange(nextEmployeeId: number) {
    setCurrentEmployeeId(nextEmployeeId);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("employee", String(nextEmployeeId));
      router.replace(`/admin/bonus-slips?${params.toString()}`, { scroll: false });
    });
  }

  if (!rows.length) {
    return (
      <div className="rounded-[32px] border border-[#ead7ce] bg-white px-6 py-10 text-sm text-[#7a6059]">
        Belum ada data payroll bonus untuk periode ini.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <article className="rounded-[30px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Periode Slip Bonus</p>
          <h2 className="mt-3 text-2xl font-semibold text-[#241716]">{periodLabel}</h2>
          <p className="mt-2 text-sm text-[#7a6059]">Slip dibuat dari data payroll bonus per karyawan.</p>
        </article>

        <article className="rounded-[30px] border border-[#e3d5a8] bg-[linear-gradient(180deg,#fffdf0_0%,#fff7d6_100%)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7c5b00]">Catatan</p>
          <p className="mt-3 text-sm leading-7 text-[#5b4400]">
            Slip bonus terpisah dari slip gaji utama. Distribusi mengikuti menu Distribusi Slip Bonus.
          </p>
        </article>
      </div>

      <section className="rounded-[32px] border border-[#ead7ce] bg-white p-6 shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block space-y-2">
            <span className="block text-[13px] font-semibold text-[#466668]">Pilih Karyawan</span>
            <select
              value={String(currentEmployeeId)}
              onChange={(event) => handleEmployeeChange(Number(event.target.value))}
              className={selectClassName}
              disabled={isPending}
            >
              {rows.map((row) => (
                <option key={row.employeeId} value={row.employeeId}>
                  {buildLabel(row)}
                </option>
              ))}
            </select>
          </label>

          {selectedRow ? (
            <div className="rounded-full border border-[#e3d5a8] bg-[#fff7d6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7c5b00]">
              {selectedRow.bonusTypeLabel}
            </div>
          ) : null}
        </div>
      </section>

      {selectedRow ? <BonusSlipSheet row={selectedRow} periodLabel={periodLabel} /> : null}
    </div>
  );
}
