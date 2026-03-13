import { Fragment } from "react";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  listFinanceByUnit,
  listFinancePembebanan,
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
  const [{ unitGroups, period }, pembebanan] = await Promise.all([
    listFinanceByUnit(),
    listFinancePembebanan(),
  ]);

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

      {/* ── PEMBEBANAN ── */}
      {pembebanan.rows.length > 0 && (
        <div className="mt-6 w-fit overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
          <table className="border-collapse text-sm">
            <thead>
              {/* Row 1: PEMBEBANAN header */}
              <tr>
                <th
                  colSpan={1 + pembebanan.units.length}
                  className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]"
                >
                  PEMBEBANAN
                  {periodLabel && (
                    <span className="ml-2 text-xs font-medium text-[#9e7467]">
                      — {periodLabel}
                    </span>
                  )}
                </th>
              </tr>

              {/* Row 2: column headers */}
              <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                <th className="w-48 border border-[#e0ccc5] px-4 py-3 text-left">
                  Departemen
                </th>
                {pembebanan.units.map((unit) => (
                  <th
                    key={unit}
                    className="w-40 border border-[#e0ccc5] px-4 py-3 text-right"
                  >
                    {unit}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pembebanan.rows.map((row, i) => (
                <tr
                  key={row.typeKey}
                  className={i % 2 === 0 ? "bg-white" : "bg-[#fffaf8]"}
                >
                  {/* Departemen label */}
                  <td className="w-48 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">
                    {row.label}
                  </td>

                  {/* Value per unit */}
                  {pembebanan.units.map((unit) => {
                    const cell = row.byUnit[unit];
                    return (
                      <td
                        key={unit}
                        className="w-40 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]"
                      >
                        {cell ? (
                          <span className="font-medium">
                            {formatRp(cell.amount)}
                          </span>
                        ) : (
                          <span className="text-[#c0a89e]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Total row */}
              <tr className="bg-[#f5e8e4]">
                <td className="w-48 border border-[#e0ccc5] px-4 py-3 font-bold text-[#7a3828]">
                  Total
                </td>
                {pembebanan.units.map((unit) => {
                  const total = pembebanan.rows.reduce((sum, row) => {
                    const cell = row.byUnit[unit];
                    return sum + (cell?.amount ?? 0);
                  }, 0);
                  return (
                    <td
                      key={unit}
                      className="w-40 border border-[#e0ccc5] px-4 py-3 text-right tabular-nums font-bold text-[#8b3a2a]"
                    >
                      {formatRp(total)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
