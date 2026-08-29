import { Fragment } from "react";

import FinancePeriodSelector from "@/components/FinancePeriodSelector";
import FinanceLemburCustom from "@/components/FinanceLemburCustom";
import FinanceNominalCell from "@/components/FinanceNominalCell";
import type {
  FinanceRecapData,
  FinanceUnitDeptData,
  PencairanGajiByUnit,
  KeteranganItem,
} from "@/lib/finance-recap";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
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

function DataCells({ data, unit }: { data: FinanceUnitDeptData; unit: string }) {
  const ctx = `${data.departemen} — ${unit}`;
  const td = "border border-[#e0ccc5] px-3 py-2";
  const map = (pick: (m: FinanceUnitDeptData["members"][number]) => number) =>
    data.members.map((m) => ({ name: m.name, amount: pick(m) }));
  return (
    <>
      <FinanceNominalCell className={td} value={data.totalGaji} title={`Gaji · ${ctx}`} members={map((m) => m.gaji)} />
      <FinanceNominalCell className={td} value={data.totalPotonganDenda} title={`Potongan Denda · ${ctx}`} members={map((m) => m.denda)} />
      <FinanceNominalCell className={td} value={data.totalPotonganKontrak} title={`Potongan Kontrak · ${ctx}`} members={map((m) => m.kontrak)} />
      <FinanceNominalCell className={td} value={data.totalPotonganPinjaman} title={`Potongan Pinjaman · ${ctx}`} members={map((m) => m.pinjaman)} />
      <FinanceNominalCell className={td} value={data.totalPotonganLain} title={`Potongan Lain-lain · ${ctx}`} members={map((m) => m.lain)} />
      <FinanceNominalCell className={td} value={data.total} title={`Total · ${ctx}`} members={map((m) => m.total)} strong />
    </>
  );
}

function ZeroCells() {
  return (
    <>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">0</td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">0</td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">0</td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">0</td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">0</td>
      <td className="border border-[#e0ccc5] px-3 py-2 text-right tabular-nums text-[#c0a89e]">0</td>
    </>
  );
}

// Rekap Finance (read-only bila editable=false — tanpa input Lembur Custom).
export default function FinanceRecap({
  data,
  editable,
}: {
  data: FinanceRecapData;
  editable: boolean;
}) {
  const {
    unitGroups,
    activePeriod,
    selectedMonth,
    selectedYear,
    periodOptions,
    pembebanan,
    pencairan,
    keterangan,
    lemburInitial,
    lemburUnits,
    employeesByUnit,
  } = data;

  const periodLabel = activePeriod ? formatPeriod(activePeriod.month, activePeriod.year) : null;
  const totalCols = unitGroups.length * 7;

  const deptNamesByUnit = new Map<string, string[]>();
  for (const g of unitGroups) {
    deptNamesByUnit.set(g.unit, g.departments.map((d) => d.departemen));
  }
  const deptsForUnit = (unit: string) => deptNamesByUnit.get(unit) ?? [];

  return (
    <>
      {/* ── PERIOD SELECTOR + DOWNLOAD FINANCE ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <FinancePeriodSelector options={periodOptions} selectedMonth={selectedMonth} selectedYear={selectedYear} />
        {/* Download Finance: Excel yang SAMA dengan tombol di Summary Payroll (server-generated). */}
        <a
          href={`/api/admin/payroll-summary/finance-export?month=${selectedMonth}&year=${selectedYear}`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0d7f86] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(13,127,134,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0a6a70]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          Download Finance
        </a>
      </div>

      {/* ── LEMBUR CUSTOM (hanya editable/admin) ── */}
      {editable ? (
        <div className="mb-6">
          <FinanceLemburCustom
            month={selectedMonth}
            year={selectedYear}
            units={lemburUnits}
            initial={lemburInitial}
            employeesByUnit={employeesByUnit}
          />
        </div>
      ) : null}

      {unitGroups.length === 0 ? (
        <div className="rounded-[24px] border border-[#ead7ce] bg-white px-8 py-12 text-center text-[#9e7467]">
          <p className="text-lg font-semibold">Belum ada data payroll</p>
          <p className="mt-1 text-sm">Pastikan sudah ada data payroll yang diproses sebelum melihat rekapan finance.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th colSpan={totalCols} className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]">
                  PEMBAGIAN REKAPAN
                  {periodLabel && <span className="ml-2 text-xs font-medium text-[#9e7467]">— {periodLabel}</span>}
                </th>
              </tr>
              <tr>
                {unitGroups.map((group) => (
                  <th key={group.unit} colSpan={7} className="border border-[#e0ccc5] bg-[#fce9e2] px-4 py-2 text-center text-sm font-bold tracking-wide text-[#8b3a2a]">
                    {group.unit}
                  </th>
                ))}
              </tr>
              <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                {unitGroups.map((group) => (
                  <Fragment key={group.unit}>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-left">Departemen</th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">Gaji</th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">Potongan Denda</th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">Potongan Kontrak</th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">Potongan Pinjaman</th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">Potongan Lain-lain</th>
                    <th className="border border-[#e0ccc5] px-3 py-3 text-right">Total</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const maxRows = Math.max(0, ...unitGroups.map((g) => deptsForUnit(g.unit).length));
                return Array.from({ length: maxRows }, (_, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#fffaf8]"}>
                    {unitGroups.map((group) => {
                      const fixedDepts = deptsForUnit(group.unit);
                      const deptName = fixedDepts[i];
                      if (!deptName) {
                        return (
                          <Fragment key={group.unit}>
                            <td className="border border-[#e0ccc5] px-3 py-2" />
                            <ZeroCells />
                          </Fragment>
                        );
                      }
                      const deptData = group.departments.find((d) => d.departemen === deptName);
                      return (
                        <Fragment key={group.unit}>
                          <td className="border border-[#e0ccc5] px-3 py-2 font-medium text-[#241716]">{deptName}</td>
                          {deptData ? <DataCells data={deptData} unit={group.unit} /> : <ZeroCells />}
                        </Fragment>
                      );
                    })}
                  </tr>
                ));
              })()}
              <tr className="bg-[#f5e8e4]">
                {unitGroups.map((group) => {
                  const fixedDepts = deptsForUnit(group.unit);
                  const visibleDepts = fixedDepts
                    .map((name) => group.departments.find((d) => d.departemen === name))
                    .filter(Boolean) as FinanceUnitDeptData[];
                  const tGaji = visibleDepts.reduce((s, d) => s + d.totalGaji, 0);
                  const tDenda = visibleDepts.reduce((s, d) => s + d.totalPotonganDenda, 0);
                  const tKontrak = visibleDepts.reduce((s, d) => s + d.totalPotonganKontrak, 0);
                  const tPinjaman = visibleDepts.reduce((s, d) => s + d.totalPotonganPinjaman, 0);
                  const tLain = visibleDepts.reduce((s, d) => s + d.totalPotonganLain, 0);
                  const tTotal = tGaji + tDenda + tKontrak + tPinjaman + tLain;
                  const tMembers = visibleDepts.flatMap((d) => d.members);
                  const tMap = (pick: (m: FinanceUnitDeptData["members"][number]) => number) =>
                    tMembers.map((m) => ({ name: m.name, amount: pick(m) }));
                  const tTd = "border border-[#e0ccc5] px-3 py-3";
                  return (
                    <Fragment key={group.unit}>
                      <td className="border border-[#e0ccc5] px-3 py-3 font-bold text-[#7a3828]">Total</td>
                      <FinanceNominalCell className={tTd} value={tGaji} title={`Gaji · Total ${group.unit}`} members={tMap((m) => m.gaji)} strong />
                      <FinanceNominalCell className={tTd} value={tDenda} title={`Potongan Denda · Total ${group.unit}`} members={tMap((m) => m.denda)} strong />
                      <FinanceNominalCell className={tTd} value={tKontrak} title={`Potongan Kontrak · Total ${group.unit}`} members={tMap((m) => m.kontrak)} strong />
                      <FinanceNominalCell className={tTd} value={tPinjaman} title={`Potongan Pinjaman · Total ${group.unit}`} members={tMap((m) => m.pinjaman)} strong />
                      <FinanceNominalCell className={tTd} value={tLain} title={`Potongan Lain-lain · Total ${group.unit}`} members={tMap((m) => m.lain)} strong />
                      <FinanceNominalCell className={tTd} value={tTotal} title={`Total · ${group.unit}`} members={tMap((m) => m.total)} strong />
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
              <tr>
                <th colSpan={1 + pembebanan.units.length} className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]">
                  PEMBEBANAN
                  {periodLabel && <span className="ml-2 text-xs font-medium text-[#9e7467]">— {periodLabel}</span>}
                </th>
              </tr>
              <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                <th className="w-48 border border-[#e0ccc5] px-4 py-3 text-left">Departemen</th>
                {pembebanan.units.map((unit) => (
                  <th key={unit} className="w-40 border border-[#e0ccc5] px-4 py-3 text-right">{unit}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pembebanan.rows.map((row, i) => (
                <tr key={row.typeKey} className={i % 2 === 0 ? "bg-white" : "bg-[#fffaf8]"}>
                  <td className="w-48 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">{row.label}</td>
                  {pembebanan.units.map((unit) => {
                    const cell = row.byUnit[unit];
                    return (
                      <td key={unit} className="w-40 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]">
                        {cell ? <span className="font-medium">{formatRp(cell.amount)}</span> : <span className="text-[#c0a89e]">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-[#f5e8e4]">
                <td className="w-48 border border-[#e0ccc5] px-4 py-3 font-bold text-[#7a3828]">Total</td>
                {pembebanan.units.map((unit) => {
                  const total = pembebanan.rows.reduce((sum, row) => sum + (row.byUnit[unit]?.amount ?? 0), 0);
                  return (
                    <td key={unit} className="w-40 border border-[#e0ccc5] px-4 py-3 text-right tabular-nums font-bold text-[#8b3a2a]">{formatRp(total)}</td>
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
          const unitTotal = (unit: string) => {
            const d = pencairan.byUnit[unit];
            return (
              (d?.totalBersih ?? 0) +
              (d?.uangKontrak ?? 0) +
              (d?.potonganTerlambat ?? 0) +
              (d?.potonganLain ?? 0) +
              (d?.potonganKerajinan ?? 0) +
              (d?.hutangPerusahaan ?? 0) +
              (d?.lemburTambahan ?? 0)
            );
          };
          const avaTotal = unitTotal("AVA Sportivo");
          const ayresTotal = unitTotal("Ayres Apparel");
          const ayresSoloTotal = unitTotal("Ayres Solo");
          const jneTotal = unitTotal("JNE");
          const avaAyres = avaTotal + ayresTotal + ayresSoloTotal;
          const allTotal = avaAyres + jneTotal;

          const rows: { label: string; key: keyof PencairanGajiByUnit }[] = [
            { label: "Total bersih (sudah potongan)", key: "totalBersih" },
            { label: "Uang kontrak", key: "uangKontrak" },
            { label: "Potongan uang terlambat", key: "potonganTerlambat" },
            { label: "Potongan lain-lain", key: "potonganLain" },
            { label: "Potongan uang kerajinan", key: "potonganKerajinan" },
            { label: "Hutang ke perusahaan", key: "hutangPerusahaan" },
            { label: "Lembur (custom)", key: "lemburTambahan" },
          ];

          return (
            <div className="mt-6 flex flex-wrap items-start gap-6">
              <div className="w-fit overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th colSpan={1 + pencairan.units.length} className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]">
                        PENCAIRAN GAJI
                        {periodLabel && <span className="ml-2 text-xs font-medium text-[#9e7467]">— {periodLabel}</span>}
                      </th>
                    </tr>
                    <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                      <th className="w-56 border border-[#e0ccc5] px-4 py-3 text-left">Kategori</th>
                      {pencairan.units.map((unit) => (
                        <th key={unit} className="w-40 border border-[#e0ccc5] px-4 py-3 text-right">{unit}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ label, key }, i) => (
                      <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-[#fffaf8]"}>
                        <td className="w-56 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">{label}</td>
                        {pencairan.units.map((unit) => {
                          const value = pencairan.byUnit[unit]?.[key] ?? 0;
                          return (
                            <td key={unit} className="w-40 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]">{formatRp(value as number)}</td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-[#f5e8e4]">
                      <td className="w-56 border border-[#e0ccc5] px-4 py-3 font-bold text-[#7a3828]">Total Gaji (sebelum dipotong)</td>
                      {pencairan.units.map((unit) => {
                        const d = pencairan.byUnit[unit];
                        const total =
                          (d?.totalBersih ?? 0) +
                          (d?.uangKontrak ?? 0) +
                          (d?.potonganTerlambat ?? 0) +
                          (d?.potonganLain ?? 0) +
                          (d?.potonganKerajinan ?? 0) +
                          (d?.hutangPerusahaan ?? 0) +
                          (d?.lemburTambahan ?? 0);
                        return (
                          <td key={unit} className="w-40 border border-[#e0ccc5] px-4 py-3 text-right tabular-nums font-bold text-[#8b3a2a]">{formatRp(total)}</td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="w-fit overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th colSpan={2} className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]">
                        TOTAL GAJI PER UNIT
                        {periodLabel && <span className="ml-2 text-xs font-medium text-[#9e7467]">— {periodLabel}</span>}
                      </th>
                    </tr>
                    <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                      <th className="w-52 border border-[#e0ccc5] px-4 py-3 text-left">Keterangan</th>
                      <th className="w-44 border border-[#e0ccc5] px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="w-52 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">AVA &amp; Ayres</td>
                      <td className="w-44 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]">{formatRp(avaAyres)}</td>
                    </tr>
                    <tr className="bg-[#fffaf8]">
                      <td className="w-52 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">Total AVA + Ayres + JNE</td>
                      <td className="w-44 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]">{formatRp(allTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── KETERANGAN (Pengembalian Kontrak per unit) ── */}
              <div className="w-fit overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th colSpan={1 + pencairan.units.length} className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]">
                        KETERANGAN
                        {periodLabel && <span className="ml-2 text-xs font-medium text-[#9e7467]">— {periodLabel}</span>}
                      </th>
                    </tr>
                    <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                      <th className="w-56 border border-[#e0ccc5] px-4 py-3 text-left">Kategori</th>
                      {pencairan.units.map((unit) => (
                        <th key={unit} className="w-40 border border-[#e0ccc5] px-4 py-3 text-right">{unit}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="w-56 border border-[#e0ccc5] px-4 py-2 font-semibold text-[#241716]">Pengembalian kontrak</td>
                      {pencairan.units.map((unit) => (
                        <td key={unit} className="w-40 border border-[#e0ccc5] px-4 py-2 text-right tabular-nums text-[#241716]">
                          {formatRp(pencairan.byUnit[unit]?.pengembalianKontrak ?? 0)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      {/* ── KETERANGAN HUTANG DAN KONTRAK ── */}
      {(() => {
        const kontrakUnits = ["AVA Sportivo", "Ayres Apparel", "Ayres Solo"];
        const hutangPerusahaanUnits = ["AVA Sportivo", "Ayres Apparel", "Ayres Solo"];
        const unitLabel: Record<string, string> = {
          "AVA Sportivo": "AVA",
          "Ayres Apparel": "Ayres",
          "Ayres Solo": "Ayres Solo",
          JNE: "JNE",
        };
        const columns: { cat: "kontrak" | "hutangPerusahaan"; unit: string }[] = [
          ...kontrakUnits.map((u) => ({ cat: "kontrak" as const, unit: u })),
          ...hutangPerusahaanUnits.map((u) => ({ cat: "hutangPerusahaan" as const, unit: u })),
        ];
        const getList = (cat: "kontrak" | "hutangPerusahaan", unit: string): KeteranganItem[] =>
          keterangan[cat][unit] ?? [];
        const maxRows = Math.max(3, ...columns.map((c) => getList(c.cat, c.unit).length));

        return (
          <div className="mt-6 w-fit overflow-x-auto rounded-[24px] border border-[#ead7ce] bg-white shadow-sm">
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  <th colSpan={columns.length} className="border border-[#e0ccc5] bg-[#f5e8e4] px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-[#7a3828]">
                    KETERANGAN HUTANG DAN KONTRAK
                    {periodLabel && <span className="ml-2 text-xs font-medium text-[#9e7467]">— {periodLabel}</span>}
                  </th>
                </tr>
                <tr className="bg-[#fce9e2] text-xs font-bold uppercase tracking-[0.12em] text-[#8b3a2a]">
                  <th colSpan={kontrakUnits.length} className="border border-[#e0ccc5] px-4 py-2 text-center">Kontrak</th>
                  <th colSpan={hutangPerusahaanUnits.length} className="border border-[#e0ccc5] px-4 py-2 text-center">Hutang ke perusahaan</th>
                </tr>
                <tr className="bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                  {columns.map((col, i) => (
                    <th key={i} className="w-40 border border-[#e0ccc5] px-4 py-2 text-center">{unitLabel[col.unit] ?? col.unit}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }, (_, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-[#fffaf8]"}>
                    {columns.map((col, colIdx) => {
                      const item = getList(col.cat, col.unit)[rowIdx];
                      return (
                        <td key={colIdx} className="w-40 border border-[#e0ccc5] px-4 py-2 text-left text-[#241716]">
                          {item ? (
                            <span>{item.name} <span className="text-[#8b3a2a]">({formatRp(item.amount)})</span></span>
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
    </>
  );
}
