import { Fragment } from "react";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  listFinanceByUnit,
  type FinanceUnitDeptData,
  type FinanceUnitGroup,
} from "@/lib/hris";
import { EMPLOYEE_DEPARTMENTS } from "@/lib/employees";

const MONTHS_ID = [
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

function formatRp(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPeriod(month: number, year: number): string {
  return `${MONTHS_ID[month - 1]} ${year}`;
}

/** 5 data cells for a department that has real data */
function DataCells({ data }: { data: FinanceUnitDeptData }) {
  return (
    <>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#241716]">
        {formatRp(data.totalGaji)}
      </td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#241716]">
        {formatRp(data.totalPotonganDenda)}
      </td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#241716]">
        {formatRp(data.totalPotonganKontrak)}
      </td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#241716]">
        {formatRp(data.totalPotonganPinjaman)}
      </td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums font-semibold text-[#8b3a2a]">
        {formatRp(data.total)}
      </td>
    </>
  );
}

/** 5 zero cells when unit has no data for this department */
function ZeroCells() {
  return (
    <>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">
        0
      </td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">
        0
      </td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">
        0
      </td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">
        0
      </td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">
        0
      </td>
    </>
  );
}

/** Fixed department list per unit keyword */
const UNIT_DEPARTMENTS: Record<string, string[]> = {
  ava: ["Logistik", "Penjualan", "Umum"],
  ayres: ["Produksi", "Penjualan", "Umum"],
};

/** Return the fixed department list for a given unit name */
function getDepartmentsForUnit(unit: string): string[] {
  const key = unit.toLowerCase();
  for (const [keyword, depts] of Object.entries(UNIT_DEPARTMENTS)) {
    if (key.includes(keyword)) return depts;
  }
  // Fallback: use the global list
  return [...EMPLOYEE_DEPARTMENTS].sort();
}

export default async function AdminFinancePage() {
  const admin = await requireAdminSession();
  const { unitGroups, period } = await listFinanceByUnit();

  const periodLabel = period ? formatPeriod(period.month, period.year) : null;

  // 6 columns per unit: Departemen + Gaji + Pot.Denda + Pot.Kontrak + Pot.Pinjaman + Total
  const totalCols = unitGroups.length * 6;

  // (departments resolved per-unit inside the render loop)

  return (
    <AdminShell
      title="Perhitungan untuk Finance"
      description={
        periodLabel
          ? `Pembagian rekapan per unit dan departemen untuk periode ${periodLabel}.`
          : "Pembagian rekapan per unit dan departemen dari tabel payroll."
      }
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/finance"
    >
      {unitGroups.length === 0 ? (
        <div className="rounded-[24px] border border-[#ead7ce] bg-white px-8 py-12 text-center text-[#9e7467]">
          <p className="text-lg font-semibold">Belum ada data payroll</p>
          <p className="mt-1 text-sm">
            Pastikan sudah ada data payroll yang diproses sebelum melihat
            rekapan finance.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              {/* ── Row 1: PEMBAGIAN REKAPAN ── */}
              <tr>
                <th
                  colSpan={totalCols}
                  className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]"
                >
                  PEMBAGIAN REKAPAN
                  {periodLabel && (
                    <span className="ml-2 text-xs font-medium text-[#9e7467]">
                      — {periodLabel}
                    </span>
                  )}
                </th>
              </tr>

              {/* ── Row 2: Unit name headers ── */}
              <tr>
                {unitGroups.map((group) => (
                  <th
                    key={group.unit}
                    colSpan={6}
                    className="border border-[#e0ccc5] bg-[#fce9e2] px-4 py-2 text-center text-sm font-bold tracking-wide text-[#8b3a2a]"
                  >
                    {group.unit}
                  </th>
                ))}
              </tr>

              {/* ── Row 3: Column labels (repeated per unit) ── */}
              <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                {unitGroups.map((group) => (
                  <Fragment key={group.unit}>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-left">
                      Departemen
                    </th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">
                      Gaji
                    </th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">
                      Potongan Denda
                    </th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">
                      Potongan Kontrak
                    </th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">
                      Potongan Pinjaman
                    </th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">
                      Total
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* ── Department rows — per-unit fixed dept list ── */}
              {(() => {
                // Build the max row count across all units using their fixed dept list
                const maxRows = Math.max(
                  0,
                  ...unitGroups.map(
                    (g) => getDepartmentsForUnit(g.unit).length,
                  ),
                );
                return Array.from({ length: maxRows }, (_, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-white" : "bg-[#fffaf8]"}
                  >
                    {unitGroups.map((group) => {
                      const fixedDepts = getDepartmentsForUnit(group.unit);
                      const deptName = fixedDepts[i];
                      if (!deptName) {
                        // This unit has fewer rows — render blank cells
                        return (
                          <Fragment key={group.unit}>
                            <td className="border border-[#e0ccc5] px-3 py-2" />
                            <ZeroCells />
                          </Fragment>
                        );
                      }
                      const deptData = group.departments.find(
                        (d) => d.departemen === deptName,
                      );
                      return (
                        <Fragment key={group.unit}>
                          <td className="border border-[#e0ccc5] px-3 py-2 font-medium text-[#241716]">
                            {deptName}
                          </td>
                          {deptData ? (
                            <DataCells data={deptData} />
                          ) : (
                            <ZeroCells />
                          )}
                        </Fragment>
                      );
                    })}
                  </tr>
                ));
              })()}

              {/* ── Total row — sum only the fixed depts shown in rows ── */}
              <tr className="bg-[#f5e8e4]">
                {unitGroups.map((group) => {
                  const fixedDepts = getDepartmentsForUnit(group.unit);
                  const visibleDepts = fixedDepts
                    .map((name) =>
                      group.departments.find((d) => d.departemen === name),
                    )
                    .filter(
                      Boolean,
                    ) as import("@/lib/hris").FinanceUnitDeptData[];

                  const tGaji = visibleDepts.reduce(
                    (s, d) => s + d.totalGaji,
                    0,
                  );
                  const tDenda = visibleDepts.reduce(
                    (s, d) => s + d.totalPotonganDenda,
                    0,
                  );
                  const tKontrak = visibleDepts.reduce(
                    (s, d) => s + d.totalPotonganKontrak,
                    0,
                  );
                  const tPinjaman = visibleDepts.reduce(
                    (s, d) => s + d.totalPotonganPinjaman,
                    0,
                  );
                  const tTotal = tGaji + tDenda + tKontrak + tPinjaman;

                  return (
                    <Fragment key={group.unit}>
                      <td className="border border-[#e0ccc5] px-3 py-3 font-bold text-[#7a3828]">
                        Total
                      </td>
                      <td className="border border-[#e0ccc5] px-3 py-3 text-right tabular-nums font-bold text-[#241716]">
                        {formatRp(tGaji)}
                      </td>
                      <td className="border border-[#e0ccc5] px-3 py-3 text-right tabular-nums font-bold text-[#241716]">
                        {formatRp(tDenda)}
                      </td>
                      <td className="border border-[#e0ccc5] px-3 py-3 text-right tabular-nums font-bold text-[#241716]">
                        {formatRp(tKontrak)}
                      </td>
                      <td className="border border-[#e0ccc5] px-3 py-3 text-right tabular-nums font-bold text-[#241716]">
                        {formatRp(tPinjaman)}
                      </td>
                      <td className="border border-[#e0ccc5] px-3 py-3 text-right tabular-nums font-bold text-[#8b3a2a]">
                        {formatRp(tTotal)}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="mt-4 rounded-[20px] border border-[#ead7ce] bg-[#fffaf8] px-6 py-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9e7467]">
          Keterangan Kolom
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {/* Gaji */}
          <div className="flex items-start gap-3 rounded-[14px] border border-[#ead7ce] bg-white px-4 py-3">
            <span className="mt-0.5 shrink-0 rounded-md bg-[#e8f5e9] px-2 py-0.5 text-[11px] font-bold text-[#2e7d32]">
              Gaji
            </span>
            <p className="text-[12px] leading-snug text-[#6b4c46]">
              Penerimaan bersih karyawan — sama dengan kolom{" "}
              <span className="font-medium text-[#241716]">
                Penerimaan Bersih
              </span>{" "}
              di Payroll Summary.
            </p>
          </div>

          {/* Potongan Denda */}
          <div className="flex items-start gap-3 rounded-[14px] border border-[#ead7ce] bg-white px-4 py-3">
            <span className="mt-0.5 shrink-0 rounded-md bg-[#fff3e0] px-2 py-0.5 text-[11px] font-bold text-[#e65100]">
              Pot. Denda
            </span>
            <p className="text-[12px] leading-snug text-[#6b4c46]">
              Total potongan{" "}
              <span className="font-medium text-[#241716]">
                keterlambatan + setengah hari + kerajinan
              </span>
              .
            </p>
          </div>

          {/* Potongan Kontrak */}
          <div className="flex items-start gap-3 rounded-[14px] border border-[#ead7ce] bg-white px-4 py-3">
            <span className="mt-0.5 shrink-0 rounded-md bg-[#fce4ec] px-2 py-0.5 text-[11px] font-bold text-[#c62828]">
              Pot. Kontrak
            </span>
            <p className="text-[12px] leading-snug text-[#6b4c46]">
              Potongan biaya kontrak karyawan training{" "}
              <span className="font-medium text-[#241716]">
                (bulan ke‑4 s/d ke‑8)
              </span>
              .
            </p>
          </div>

          {/* Potongan Pinjaman */}
          <div className="flex items-start gap-3 rounded-[14px] border border-[#ead7ce] bg-white px-4 py-3">
            <span className="mt-0.5 shrink-0 rounded-md bg-[#ede7f6] px-2 py-0.5 text-[11px] font-bold text-[#4527a0]">
              Pot. Pinjaman
            </span>
            <p className="text-[12px] leading-snug text-[#6b4c46]">
              Cicilan{" "}
              <span className="font-medium text-[#241716]">
                pinjaman perusahaan
              </span>{" "}
              yang dipotong dari gaji bulan ini.
            </p>
          </div>

          {/* Total */}
          <div className="flex items-start gap-3 rounded-[14px] border border-[#ead7ce] bg-white px-4 py-3">
            <span className="mt-0.5 shrink-0 rounded-md bg-[#fbe9e7] px-2 py-0.5 text-[11px] font-bold text-[#8b3a2a]">
              Total
            </span>
            <p className="text-[12px] leading-snug text-[#6b4c46]">
              Gaji + semua potongan ={" "}
              <span className="font-medium text-[#241716]">
                total beban bruto
              </span>{" "}
              per departemen.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
