import { cache } from "react";
import type { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import {
  getAdminPayrollSummarySheet,
  type AdminPayrollSummarySheetRow,
} from "@/lib/payroll-summary";
import { getPenjahitSheet } from "@/lib/payroll-penjahit";
import { getPartimeSheet, type PartimeComputedRow } from "@/lib/payroll-partime";
import { getFreelanceSheet } from "@/lib/payroll-freelance";
import { mapPenjahitRow } from "@/lib/payslip-row";

export type CombinedFinanceRows = {
  rows: AdminPayrollSummarySheetRow[];
  period: { month: number; year: number } | null;
};

type KaryawanMeta = {
  unit: string | null;
  penempatan: string | null;
  pembebanan: string | null;
  departemen: string;
};

// Partime → AdminPayrollSummarySheetRow untuk agregasi Finance.
// Potongan partime hanya telat (Rp5.000/telat); tidak ada kontrak/pinjaman/kerajinan.
function mapPartimeFinanceRow(r: PartimeComputedRow, meta?: KaryawanMeta): AdminPayrollSummarySheetRow {
  return {
    id: r.payrollId,
    employeeId: r.employeeId,
    number: 0,
    name: r.nama,
    role: r.jabatan,
    division: r.divisi,
    recapGroup: "",
    unit: meta?.unit ?? null,
    pembebanan: meta?.pembebanan ?? null,
    penempatan: meta?.penempatan ?? null,
    department: meta?.departemen ?? r.departemen,
    bank: r.bank,
    accountNumber: r.noRekening,
    payrollType: "non_sales",
    monthlyBaseSalary: r.totalGaji,
    dailyBaseSalary: r.insentifPerHari,
    positionAllowance: r.tunjanganJabatan,
    fixedMealAllowance: r.uangMakanPerHari,
    subsidy: r.subsidi,
    fixedDiligenceAllowance: 0,
    bpjs: r.bpjs,
    performanceBonus: 0,
    transportAllowance: 0,
    incentive: 0,
    vehicleAllowance: 0,
    travelReimbursement: 0,
    workDays: r.hariTetap,
    presentDays: r.masuk,
    totalBaseSalary: r.insentifTotal,
    omzetBonus: 0,
    mealAllowance: r.uangMakanTotal,
    diligenceAllowance: 0,
    overtimeHours: 0,
    overtimeBonus: 0,
    leaveCount: 0,
    sickCount: 0,
    sickWithoutNoteCount: 0,
    halfDayCount: 0,
    halfDayDeduction: 0,
    lateCount: r.telat,
    lateDeduction: r.potonganTelat,
    totalSalary: r.totalGaji,
    totalSalaryBeforeDeduction: r.totalGajiSebelumPotongan,
    contractDeduction: 0,
    companyLoan: 0,
    personalLoan: 0,
    remainingLoanBalance: 0,
    fineDeduction: r.potonganTelat,
    contractCut: 0,
    loanCut: 0,
    diligenceCut: 0,
    otherDeduction: 0,
    otherDeductionNote: null,
    contractReturn: 0,
    netIncome: r.totalGaji,
    inputGajiPerDay: r.inputInsentifPerHari,
    inputTunjanganJabatan: r.inputTunjanganJabatan,
    inputUangMakan: r.inputUangMakanPerHari,
    inputSubsidi: r.inputSubsidi,
    inputUangKerajinan: 0,
    inputBpjs: r.inputBpjs,
    inputBonusPerforma: 0,
    inputInsentif: 0,
    inputUangTransport: 0,
    inputKendaraan: 0,
    inputPerjalananDinasReimburse: 0,
    inputOverrideMasuk: null,
    inputOverrideLembur: null,
    inputOverrideIzin: null,
    inputOverrideSakit: null,
    inputOverrideSakitTanpaSurat: null,
    inputOverrideSetengahHari: null,
    inputOverrideKontrak: null,
    inputOverridePinjaman: null,
    inputOverridePinjamanPribadi: null,
    inputOverrideGajiPokok: null,
    inputOverridePotonganAbsensi: null,
    inputPotonganSp2: null,
    freelanceRateType: "per_hari",
    inputGajiPerJam: 0,
  };
}

// Freelance (jabatan 'freelance') → AdminPayrollSummarySheetRow untuk Finance.
// Take home = total freelance (jam/pengerjaan/harian/custom). Tidak ada potongan.
function mapFreelanceFinanceRow(
  employeeId: number,
  name: string,
  total: number,
  meta?: KaryawanMeta,
): AdminPayrollSummarySheetRow {
  return {
    id: 0,
    employeeId,
    number: 0,
    name,
    role: "Freelance",
    division: "",
    recapGroup: "",
    unit: meta?.unit ?? null,
    pembebanan: meta?.pembebanan ?? null,
    penempatan: meta?.penempatan ?? null,
    department: meta?.departemen ?? "-",
    bank: "-",
    accountNumber: "-",
    payrollType: "non_sales",
    monthlyBaseSalary: total,
    dailyBaseSalary: 0,
    positionAllowance: 0,
    fixedMealAllowance: 0,
    subsidy: 0,
    fixedDiligenceAllowance: 0,
    bpjs: 0,
    performanceBonus: 0,
    transportAllowance: 0,
    incentive: 0,
    vehicleAllowance: 0,
    travelReimbursement: 0,
    workDays: 0,
    presentDays: 0,
    totalBaseSalary: total,
    omzetBonus: 0,
    mealAllowance: 0,
    diligenceAllowance: 0,
    overtimeHours: 0,
    overtimeBonus: 0,
    leaveCount: 0,
    sickCount: 0,
    sickWithoutNoteCount: 0,
    halfDayCount: 0,
    halfDayDeduction: 0,
    lateCount: 0,
    lateDeduction: 0,
    totalSalary: total,
    totalSalaryBeforeDeduction: total,
    contractDeduction: 0,
    companyLoan: 0,
    personalLoan: 0,
    remainingLoanBalance: 0,
    fineDeduction: 0,
    contractCut: 0,
    loanCut: 0,
    diligenceCut: 0,
    otherDeduction: 0,
    otherDeductionNote: null,
    contractReturn: 0,
    netIncome: total,
    inputGajiPerDay: 0,
    inputTunjanganJabatan: 0,
    inputUangMakan: 0,
    inputSubsidi: 0,
    inputUangKerajinan: 0,
    inputBpjs: 0,
    inputBonusPerforma: 0,
    inputInsentif: 0,
    inputUangTransport: 0,
    inputKendaraan: 0,
    inputPerjalananDinasReimburse: 0,
    inputOverrideMasuk: null,
    inputOverrideLembur: null,
    inputOverrideIzin: null,
    inputOverrideSakit: null,
    inputOverrideSakitTanpaSurat: null,
    inputOverrideSetengahHari: null,
    inputOverrideKontrak: null,
    inputOverridePinjaman: null,
    inputOverridePinjamanPribadi: null,
    inputOverrideGajiPokok: null,
    inputOverridePotonganAbsensi: null,
    inputPotonganSp2: null,
    freelanceRateType: "per_hari",
    inputGajiPerJam: 0,
  };
}

// Gabungan SEMUA baris payroll untuk perhitungan Finance:
// - Main sheet (Summary Payroll + Solo + Sales Nasional + Freelance) — sudah termasuk.
// - Penjahit & Partime — di-exclude dari main sheet, jadi ditambahkan di sini,
//   diperkaya unit/penempatan/pembebanan dari tabel karyawan agar masuk grup unit Finance.
// Dibungkus React cache() supaya saat 4 fungsi Finance memanggilnya dengan
// argumen period yang sama (dalam satu request), sheet berat (main/penjahit/
// partime) hanya dihitung SEKALI — menghindari beban/deadlock ensurePayrollPeriodCloned.
export const getCombinedFinanceRows = cache(async function getCombinedFinanceRows(period?: {
  month?: number;
  year?: number;
}): Promise<CombinedFinanceRows> {
  const [mainSheet, penjahitSheet, partimeSheet, freelanceSheet] = await Promise.all([
    getAdminPayrollSummarySheet(period),
    getPenjahitSheet(period),
    getPartimeSheet(period),
    getFreelanceSheet(period),
  ]);

  const rows: AdminPayrollSummarySheetRow[] = mainSheet ? [...mainSheet.rows] : [];
  const mainIds = new Set(mainSheet ? mainSheet.rows.map((r) => r.employeeId) : []);

  const resolvedPeriod = mainSheet
    ? { month: mainSheet.periodMonth, year: mainSheet.periodYear }
    : penjahitSheet
      ? { month: penjahitSheet.periodMonth, year: penjahitSheet.periodYear }
      : partimeSheet
        ? { month: partimeSheet.periodMonth, year: partimeSheet.periodYear }
        : period?.month && period?.year
          ? { month: period.month, year: period.year }
          : null;

  // Freelance: total per karyawan (gabung semua tipe). Yang SUDAH ada di main sheet
  // (punya baris payroll) di-skip supaya tidak dobel.
  const freelanceTotal = new Map<number, { name: string; total: number }>();
  const addFreelance = (id: number, name: string, total: number) => {
    const cur = freelanceTotal.get(id);
    if (cur) cur.total += total;
    else freelanceTotal.set(id, { name, total });
  };
  for (const r of freelanceSheet.jam) addFreelance(r.employeeId, r.name, r.total);
  for (const r of freelanceSheet.pengerjaan) addFreelance(r.employeeId, r.name, r.total);
  for (const r of freelanceSheet.harian) addFreelance(r.employeeId, r.name, r.total);
  for (const r of freelanceSheet.custom) addFreelance(r.employeeId, r.name, r.grandTotal);
  const freelanceToAdd = [...freelanceTotal.keys()].filter((id) => !mainIds.has(id));

  const extraIds = [
    ...(penjahitSheet?.rows.map((r) => r.employeeId) ?? []),
    ...(partimeSheet?.rows.map((r) => r.employeeId) ?? []),
    ...freelanceToAdd,
  ];

  const metaMap = new Map<number, KaryawanMeta>();
  if (extraIds.length > 0) {
    const [metaRows] = await pool.query<
      (RowDataPacket & {
        id: number;
        unit: string | null;
        penempatan: string | null;
        pembebanan: string | null;
        departemen: string;
      })[]
    >(`SELECT id, unit, penempatan, pembebanan, departemen FROM karyawan WHERE id IN (?)`, [extraIds]);
    for (const m of metaRows) {
      metaMap.set(m.id, {
        unit: m.unit,
        penempatan: m.penempatan,
        pembebanan: m.pembebanan,
        departemen: m.departemen,
      });
    }
  }

  if (penjahitSheet) {
    for (const pr of penjahitSheet.rows) {
      const meta = metaMap.get(pr.employeeId);
      const mapped = mapPenjahitRow(pr);
      rows.push({
        ...mapped,
        unit: meta?.unit ?? mapped.unit,
        penempatan: meta?.penempatan ?? mapped.penempatan,
        pembebanan: meta?.pembebanan ?? mapped.pembebanan,
        department: meta?.departemen ?? mapped.department,
      });
    }
  }

  if (partimeSheet) {
    for (const pr of partimeSheet.rows) {
      rows.push(mapPartimeFinanceRow(pr, metaMap.get(pr.employeeId)));
    }
  }

  for (const id of freelanceToAdd) {
    const f = freelanceTotal.get(id)!;
    rows.push(mapFreelanceFinanceRow(id, f.name, f.total, metaMap.get(id)));
  }

  return { rows, period: resolvedPeriod };
});
