"use client";

import { useMemo, useState } from "react";

import type { ContractDeductionPlanItem } from "@/lib/contract-deductions";

type Props = {
  initialRows: ContractDeductionPlanItem[];
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none shadow-[0_1px_2px_rgba(15,23,42,0.03)] placeholder:text-[#b1948d] focus:border-[#c8716d] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

function formatMoney(value: string | null) {
  if (!value) {
    return "-";
  }

  return Number(value).toLocaleString("id-ID");
}

function toNumber(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AdminContractDeductionsManager({ initialRows }: Props) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return initialRows;
    }

    return initialRows.filter((row) =>
      [
        row.employeeName,
        row.nip,
        row.role,
        row.division,
        row.department,
        row.contractDate ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [initialRows, search]);

  const summary = useMemo(
    () =>
      filteredRows.reduce(
        (total, row) => ({
          employees: total.employees + 1,
          planned: total.planned + toNumber(row.totalPlannedDeduction),
          deducted: total.deducted + toNumber(row.totalDeductedAmount),
          remaining: total.remaining + toNumber(row.remainingDeduction),
        }),
        { employees: 0, planned: 0, deducted: 0, remaining: 0 },
      ),
    [filteredRows],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.08),_transparent_36%),linear-gradient(180deg,#fffaf8_0%,#fff6f2_100%)] px-6 py-6">
          <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            Potongan Kontrak
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
            Rekap Otomatis 5 Bulan Pertama
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#7a6059]">
            Modul ini read only. Sistem membuat total tanggungan potongan kontrak 5 bulan pertama,
            lalu sisa tanggungan berkurang otomatis setiap kali payroll summary tersimpan.
          </p>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-4">
          <div className="rounded-[24px] border border-[#ead7ce] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
              Karyawan Aktif
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#241716]">{summary.employees}</p>
          </div>
          <div className="rounded-[24px] border border-[#ead7ce] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
              Total Tanggungan
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#241716]">Rp{formatMoney(String(summary.planned))}</p>
          </div>
          <div className="rounded-[24px] border border-[#ead7ce] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
              Sudah Terpotong
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#241716]">Rp{formatMoney(String(summary.deducted))}</p>
          </div>
          <div className="rounded-[24px] border border-[#ead7ce] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
              Sisa Tanggungan
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#8f1d22]">Rp{formatMoney(String(summary.remaining))}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
                Rekap Potongan
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
                5 Bulan Pertama Kontrak
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#7a6059]">
                Tanggungan awal mengikuti total 5 bulan potongan kontrak, lalu saldo sisa turun saat payroll summary dibuat.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIP, jabatan, departemen..."
              className={`${inputClassName} xl:max-w-sm`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#12dfe6] text-xs uppercase tracking-[0.16em] text-[#111111]">
                <th className="px-6 py-4 font-semibold">Nama</th>
                <th className="px-6 py-4 font-semibold">NIP</th>
                <th className="px-6 py-4 font-semibold">Jabatan</th>
                <th className="px-6 py-4 font-semibold">Divisi</th>
                <th className="px-6 py-4 font-semibold">Departemen</th>
                <th className="px-6 py-4 font-semibold">Kontrak</th>
                <th className="px-6 py-4 font-semibold">Potongan / Bulan</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Sudah Terpotong</th>
                <th className="px-6 py-4 font-semibold">Sisa</th>
                <th className="px-6 py-4 font-semibold text-center">1</th>
                <th className="px-6 py-4 font-semibold text-center">2</th>
                <th className="px-6 py-4 font-semibold text-center">3</th>
                <th className="px-6 py-4 font-semibold text-center">4</th>
                <th className="px-6 py-4 font-semibold text-center">5</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.employeeId} className="border-b border-[#f1e5de] text-sm text-[#513d39] hover:bg-[#fffaf7]">
                    <td className="px-6 py-4 font-semibold text-[#241716]">{row.employeeName}</td>
                    <td className="px-6 py-4">{row.nip}</td>
                    <td className="px-6 py-4">{row.role}</td>
                    <td className="px-6 py-4">{row.division}</td>
                    <td className="px-6 py-4">{row.department}</td>
                    <td className="px-6 py-4">
                      <div className="min-w-[150px]">
                        <div className="font-medium text-[#241716]">{row.contractDate || "-"}</div>
                        <div className="mt-1 text-xs text-[#7a6059]">
                          Aktif sampai {row.deductionEndDate || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#241716]">
                      Rp{formatMoney(row.monthlyDeduction)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#241716]">
                      Rp{formatMoney(row.totalPlannedDeduction)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1f6b5d]">
                      Rp{formatMoney(row.totalDeductedAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex min-w-[132px] justify-center rounded-2xl px-3 py-2 font-semibold ${toNumber(row.remainingDeduction) > 0 ? "bg-[#fff1ec] text-[#8f1d22]" : "bg-[#e7f9f0] text-[#17603b]"}`}>
                        {toNumber(row.remainingDeduction) > 0 ? `Rp${formatMoney(row.remainingDeduction)}` : "Lunas"}
                      </div>
                    </td>
                    {row.installments.map((installment) => {
                      const deductedAmount = toNumber(installment.deductedAmount);

                      return (
                        <td key={`${row.employeeId}-${installment.sequence}`} className="px-4 py-4">
                          <div className={`min-w-[128px] rounded-2xl px-3 py-2 text-center ${deductedAmount > 0 ? "bg-[#edf9f2]" : "bg-[#fff7f2]"}`}>
                            <div className="font-semibold text-[#241716]">
                              {formatMoney(installment.nominalDeduction)}
                            </div>
                            <div className="mt-1 text-xs text-[#7a6059]">
                              {installment.monthLabel}
                            </div>
                            <div className={`mt-1 text-[11px] font-semibold ${deductedAmount > 0 ? "text-[#17603b]" : "text-[#b1948d]"}`}>
                              {deductedAmount > 0
                                ? `Payroll: ${formatMoney(installment.deductedAmount)}`
                                : "Belum dipotong"}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={15} className="px-6 py-16 text-center">
                    <p className="text-base font-semibold text-[#3b2723]">
                      Belum ada potongan kontrak aktif
                    </p>
                    <p className="mt-2 text-sm text-[#8a6f68]">
                      Rekap akan terisi otomatis ketika karyawan masuk ke 5 bulan pertama masa kontrak.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
