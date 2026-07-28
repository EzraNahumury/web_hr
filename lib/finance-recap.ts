import {
  listFinanceByUnit,
  listFinanceLemburTambahan,
  listFinancePembebanan,
  listFinancePencairanGaji,
  listKeteranganHutangKontrak,
  type FinanceUnitDeptData,
  type PencairanGajiByUnit,
  type KeteranganItem,
} from "@/lib/hris";
import { listPayrollPeriods } from "@/lib/payroll-admin";
import { listEmployees } from "@/lib/employees";

export type FinanceRecapData = Awaited<ReturnType<typeof loadFinanceRecapData>>;
export type { FinanceUnitDeptData, PencairanGajiByUnit, KeteranganItem };

// Muat semua data rekap Finance untuk satu periode. Dipakai halaman admin (editable)
// dan halaman karyawan departemen Finance (read-only) supaya tampilannya identik.
export async function loadFinanceRecapData(periodInput?: { month: number; year: number }) {
  const [{ unitGroups, period }, pembebanan, pencairan, keterangan, periodOptions] =
    await Promise.all([
      listFinanceByUnit(periodInput),
      listFinancePembebanan(periodInput),
      listFinancePencairanGaji(periodInput),
      listKeteranganHutangKontrak(periodInput),
      listPayrollPeriods(),
    ]);

  const activePeriod =
    period ??
    (periodOptions[0]
      ? { month: periodOptions[0].month, year: periodOptions[0].year }
      : null);
  const selectedMonth =
    activePeriod?.month ?? periodOptions[0]?.month ?? new Date().getMonth() + 1;
  const selectedYear =
    activePeriod?.year ?? periodOptions[0]?.year ?? new Date().getFullYear();

  const lemburMap = await listFinanceLemburTambahan({ month: selectedMonth, year: selectedYear });
  const lemburInitial: Record<string, { nominal: number; catatan: string | null }> = {};
  for (const [unit, value] of lemburMap.entries()) {
    lemburInitial[unit] = value;
  }
  const lemburUnits = pencairan.units.length
    ? pencairan.units
    : ["AVA Sportivo", "Ayres Apparel", "Ayres Solo", "JNE"];

  const allEmployees = await listEmployees();
  const employeesByUnit: Record<string, string[]> = {};
  for (const unit of lemburUnits) {
    employeesByUnit[unit] = allEmployees
      .filter((emp) => (emp.unit ?? "").toLowerCase() === unit.toLowerCase())
      .map((emp) => emp.name)
      .sort((a, b) => a.localeCompare(b, "id-ID"));
  }

  return {
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
  };
}
