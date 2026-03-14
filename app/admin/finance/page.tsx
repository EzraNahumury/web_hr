import { Fragment } from "react";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  listFinanceByUnit,
  listFinancePembebanan,
  listFinancePencairanGaji,
  listKeteranganHutangKontrak,
  type FinanceUnitDeptData,
  type FinanceUnitGroup,
  type PencairanGajiByUnit,
  type KeteranganItem,
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
  const [{ unitGroups, period }, pembebanan, pencairan, keterangan] =
    await Promise.all([
      listFinanceByUnit(),
      listFinancePembebanan(),
      listFinancePencairanGaji(),
      listKeteranganHutangKontrak(),
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

      {/* ── PENCAIRAN GAJI + TOTAL GAJI PER UNIT ── */}
      {pencairan.units.length > 0 &&
        (() => {
          // Helper: hitung Total Gaji (sebelum dipotong) per unit
          const unitTotal = (unit: string) => {
            const d = pencairan.byUnit[unit];
            return (
              (d?.totalBersih ?? 0) +
              (d?.uangKontrak ?? 0) +
              (d?.potonganTerlambat ?? 0) +
              (d?.potonganSetengahHari ?? 0) +
              (d?.potonganKerajinan ?? 0) +
              (d?.hutangPerusahaan ?? 0)
            );
          };
          const avaTotal = unitTotal("AVA Sportivo");
          const ayresTotal = unitTotal("Ayres Apparel");
          const jneTotal = unitTotal("JNE");
          const avaAyres = avaTotal + ayresTotal;
          const allTotal = avaAyres + jneTotal;

          return (
            <div className="mt-6 flex flex-wrap items-start gap-6">
              {/* Tabel Pencairan Gaji */}
              <div className="w-fit overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
                <table className="border-collapse text-sm">
                  <thead>
                    {/* Row 1: PENCAIRAN GAJI header */}
                    <tr>
                      <th
                        colSpan={1 + pencairan.units.length}
                        className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]"
                      >
                        PENCAIRAN GAJI
                        {periodLabel && (
                          <span className="ml-2 text-xs font-medium text-[#9e7467]">
                            — {periodLabel}
                          </span>
                        )}
                      </th>
                    </tr>

                    {/* Row 2: column headers */}
                    <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                      <th className="w-56 border border-[#e0ccc5] px-4 py-3 text-left">
                        Kategori
                      </th>
                      {pencairan.units.map((unit) => (
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
                    {(
                      [
                        {
                          label: "Total bersih (sudah potongan)",
                          key: "totalBersih" as keyof PencairanGajiByUnit,
                        },
                        {
                          label: "Uang kontrak",
                          key: "uangKontrak" as keyof PencairanGajiByUnit,
                        },
                        {
                          label: "Pengembalian kontrak",
                          key: "pengembalianKontrak" as keyof PencairanGajiByUnit,
                        },
                        {
                          label: "Potongan uang terlambat",
                          key: "potonganTerlambat" as keyof PencairanGajiByUnit,
                        },
                        {
                          label: "Potongan uang setengah hari",
                          key: "potonganSetengahHari" as keyof PencairanGajiByUnit,
                        },
                        {
                          label: "Potongan uang kerajinan",
                          key: "potonganKerajinan" as keyof PencairanGajiByUnit,
                        },
                        {
                          label: "Hutang ke perusahaan",
                          key: "hutangPerusahaan" as keyof PencairanGajiByUnit,
                        },
                      ] as { label: string; key: keyof PencairanGajiByUnit }[]
                    ).map(({ label, key }, i) => (
                      <tr
                        key={label}
                        className={i % 2 === 0 ? "bg-white" : "bg-[#fffaf8]"}
                      >
                        <td className="w-56 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">
                          {label}
                        </td>
                        {pencairan.units.map((unit) => {
                          const data = pencairan.byUnit[unit];
                          const value = data?.[key] ?? 0;
                          return (
                            <td
                              key={unit}
                              className="w-40 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]"
                            >
                              {formatRp(value as number)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Total Gaji (sebelum dipotong) row */}
                    <tr className="bg-[#f5e8e4]">
                      <td className="w-56 border border-[#e0ccc5] px-4 py-3 font-bold text-[#7a3828]">
                        Total Gaji (sebelum dipotong)
                      </td>
                      {pencairan.units.map((unit) => {
                        const data = pencairan.byUnit[unit];
                        const total =
                          (data?.totalBersih ?? 0) +
                          (data?.uangKontrak ?? 0) +
                          (data?.potonganTerlambat ?? 0) +
                          (data?.potonganSetengahHari ?? 0) +
                          (data?.potonganKerajinan ?? 0) +
                          (data?.hutangPerusahaan ?? 0);
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

              {/* Tabel Total Gaji per Unit */}
              <div className="w-fit overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th
                        colSpan={2}
                        className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]"
                      >
                        TOTAL GAJI PER UNIT
                        {periodLabel && (
                          <span className="ml-2 text-xs font-medium text-[#9e7467]">
                            — {periodLabel}
                          </span>
                        )}
                      </th>
                    </tr>
                    <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                      <th className="w-52 border border-[#e0ccc5] px-4 py-3 text-left">
                        Keterangan
                      </th>
                      <th className="w-44 border border-[#e0ccc5] px-4 py-3 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="w-52 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">
                        AVA &amp; Ayres
                      </td>
                      <td className="w-44 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]">
                        {formatRp(avaAyres)}
                      </td>
                    </tr>
                    <tr className="bg-[#fffaf8]">
                      <td className="w-52 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">
                        Total AVA + Ayres + JNE
                      </td>
                      <td className="w-44 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]">
                        {formatRp(allTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      {/* ── KETERANGAN HUTANG DAN KONTRAK ── */}
      {(() => {
        const kontrakUnits = ["AVA Sportivo", "Ayres Apparel"];
        const hutangPerusahaanUnits = ["AVA Sportivo", "Ayres Apparel"];
        // Shorthand label untuk header kolom
        const unitLabel: Record<string, string> = {
          "AVA Sportivo": "AVA",
          "Ayres Apparel": "Ayres",
          JNE: "JNE",
        };

        // Kolom-kolom: [kategori, unit] pasangan
        const columns: {
          cat: "kontrak" | "hutangPerusahaan";
          unit: string;
        }[] = [
          ...kontrakUnits.map((u) => ({ cat: "kontrak" as const, unit: u })),
          ...hutangPerusahaanUnits.map((u) => ({
            cat: "hutangPerusahaan" as const,
            unit: u,
          })),
        ];

        const getList = (
          cat: "kontrak" | "hutangPerusahaan",
          unit: string,
        ): KeteranganItem[] => {
          return keterangan[cat][unit] ?? [];
        };

        const maxRows = Math.max(
          3,
          ...columns.map((c) => getList(c.cat, c.unit).length),
        );

        return (
          <div className="mt-6 w-fit overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
            <table className="border-collapse text-sm">
              <thead>
                {/* Row 1: judul */}
                <tr>
                  <th
                    colSpan={4}
                    className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]"
                  >
                    KETERANGAN HUTANG DAN KONTRAK
                    {periodLabel && (
                      <span className="ml-2 text-xs font-medium text-[#9e7467]">
                        — {periodLabel}
                      </span>
                    )}
                  </th>
                </tr>

                {/* Row 2: grup kategori */}
                <tr className="bg-[#fce9e2] text-xs font-bold uppercase tracking-[0.12em] text-[#8b3a2a]">
                  <th
                    colSpan={2}
                    className="border border-[#e0ccc5] px-4 py-2 text-center"
                  >
                    Kontrak
                  </th>
                  <th
                    colSpan={2}
                    className="border border-[#e0ccc5] px-4 py-2 text-center"
                  >
                    Hutang ke perusahaan
                  </th>
                </tr>

                {/* Row 3: sub-header unit */}
                <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className="w-40 border border-[#e0ccc5] px-4 py-2 text-center"
                    >
                      {unitLabel[col.unit] ?? col.unit}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: maxRows }, (_, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={rowIdx % 2 === 0 ? "bg-white" : "bg-[#fffaf8]"}
                  >
                    {columns.map((col, colIdx) => {
                      const item = getList(col.cat, col.unit)[rowIdx];
                      return (
                        <td
                          key={colIdx}
                          className="w-40 border border-[#e0ccc5] px-4 py-2 text-left text-[#241716]"
                        >
                          {item ? (
                            <span>
                              {item.name}{" "}
                              <span className="text-[#8b3a2a]">
                                ({formatRp(item.amount)})
                              </span>
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </AdminShell>
  );
}
