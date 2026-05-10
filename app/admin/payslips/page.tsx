import AdminPayslipBuilder from "@/components/AdminPayslipBuilder";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayrollPeriods } from "@/lib/payroll-admin";
import { getPenjahitSheet, type PenjahitComputedRow } from "@/lib/payroll-penjahit";
import {
  getAdminPayrollSummarySheet,
  type AdminPayrollSummarySheet,
  type AdminPayrollSummarySheetRow,
} from "@/lib/payroll-summary";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mapPenjahitRow(row: PenjahitComputedRow): AdminPayrollSummarySheetRow {
  return {
    id: row.payrollId,
    employeeId: row.employeeId,
    number: 0,
    name: row.nama,
    role: row.jabatan,
    division: row.divisi,
    recapGroup: row.pembagianRekapan ?? "",
    unit: null,
    pembebanan: null,
    department: row.departemen,
    bank: row.bank,
    accountNumber: row.noRekening,
    payrollType: "penjahit",
    penjahitInfo: {
      tipe: row.tipePayroll,
      pencairan: row.pencairan,
    },
    monthlyBaseSalary: row.gajiPokokMonthly,
    dailyBaseSalary: row.gajiPokokPerHari,
    positionAllowance: row.tunjanganJabatan,
    fixedMealAllowance: row.uangAbsensiPerHari,
    subsidy: 0,
    fixedDiligenceAllowance: row.uangKerajinanNominal,
    bpjs: row.bpjs,
    performanceBonus: row.bonusPerforma,
    transportAllowance: 0,
    incentive: 0,
    vehicleAllowance: 0,
    travelReimbursement: 0,
    workDays: row.hariKerja,
    presentDays: row.masuk,
    totalBaseSalary: row.totalGajiPokok,
    omzetBonus: 0,
    mealAllowance: row.uangAbsensiTotal,
    diligenceAllowance: row.kerajinanEarned,
    overtimeHours: row.lemburJam,
    overtimeBonus: row.bonusLembur,
    leaveCount: row.izin,
    sickCount: row.sakit,
    sickWithoutNoteCount: row.sakitTanpaSurat,
    halfDayCount: row.setengahHari,
    halfDayDeduction: row.potonganSetengahHari,
    lateCount: row.telat,
    lateDeduction: row.potonganTelat,
    totalSalary: row.totalGaji,
    totalSalaryBeforeDeduction: row.totalGajiSebelumPotongan,
    contractDeduction: row.potonganKontrak,
    companyLoan: row.potonganPinjaman,
    personalLoan: row.potonganLainLain,
    remainingLoanBalance: 0,
    fineDeduction: row.potonganDenda,
    contractCut: row.potonganKontrak,
    loanCut: row.potonganPinjaman + row.potonganLainLain,
    diligenceCut: row.uangKerajinanNominal - row.kerajinanEarned,
    netIncome: row.penerimaanBersih,
    inputGajiPerDay: row.inputGajiPerDay,
    inputTunjanganJabatan: row.inputTunjanganJabatan,
    inputUangMakan: row.inputUangMakan,
    inputSubsidi: 0,
    inputUangKerajinan: row.inputUangKerajinan,
    inputBpjs: row.inputBpjs,
    inputBonusPerforma: row.inputBonusPerforma,
    inputInsentif: 0,
    inputUangTransport: 0,
    inputKendaraan: 0,
    inputPerjalananDinasReimburse: 0,
    inputOverrideMasuk: row.inputOverrideMasuk,
    inputOverrideLembur: row.inputOverrideLembur,
    inputOverrideIzin: row.inputOverrideIzin,
    inputOverrideSakit: row.inputOverrideSakit,
    inputOverrideSakitTanpaSurat: row.inputOverrideSakitTanpaSurat,
    inputOverrideSetengahHari: row.inputOverrideSetengahHari,
    inputOverrideKontrak: row.inputOverrideKontrak,
    inputOverridePinjaman: row.inputOverridePinjaman,
    inputOverridePinjamanPribadi: row.inputPotonganLainLain,
    inputOverrideGajiPokok: row.inputOverrideGajiPokok,
  };
}

function mergeWithPenjahit(
  sheet: AdminPayrollSummarySheet | null,
  penjahitRows: PenjahitComputedRow[],
  fallbackPeriodMonth?: number,
  fallbackPeriodYear?: number,
  fallbackPeriodLabel?: string,
  fallbackRangeLabel?: string,
): AdminPayrollSummarySheet | null {
  if (!sheet && penjahitRows.length === 0) return sheet;

  const mappedPenjahit = penjahitRows.map(mapPenjahitRow);

  if (!sheet) {
    if (
      fallbackPeriodMonth === undefined ||
      fallbackPeriodYear === undefined ||
      !fallbackPeriodLabel ||
      !fallbackRangeLabel
    ) {
      return null;
    }
    const merged = [...mappedPenjahit].sort((a, b) => a.name.localeCompare(b.name));
    return {
      periodMonth: fallbackPeriodMonth,
      periodYear: fallbackPeriodYear,
      periodLabel: fallbackPeriodLabel,
      rangeLabel: fallbackRangeLabel,
      totalOmzet: 0,
      totalBonusOmzet: 0,
      totalNetIncome: merged.reduce((sum, r) => sum + r.netIncome, 0),
      totalDeduction: merged.reduce((sum, r) => sum + r.fineDeduction + r.contractCut + r.loanCut, 0),
      rows: merged.map((r, idx) => ({ ...r, number: idx + 1 })),
    };
  }

  const merged = [...sheet.rows, ...mappedPenjahit].sort((a, b) => a.name.localeCompare(b.name));
  return {
    ...sheet,
    rows: merged.map((r, idx) => ({ ...r, number: idx + 1 })),
    totalNetIncome: merged.reduce((sum, r) => sum + r.netIncome, 0),
    totalDeduction: merged.reduce((sum, r) => sum + r.fineDeduction + r.contractCut + r.loanCut, 0),
  };
}

export default async function AdminPayslipsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const adminPromise = requireAdminSession();
  const periodOptions = await listPayrollPeriods();
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedMonth = parsePositiveInt(resolvedSearchParams.month);
  const requestedYear = parsePositiveInt(resolvedSearchParams.year);
  const selectedEmployeeId = parsePositiveInt(resolvedSearchParams.employee);

  const loadCombinedSheet = async () => {
    const tryPeriod = async (month: number, year: number) => {
      const [sheet, penjahit] = await Promise.all([
        getAdminPayrollSummarySheet({ month, year }),
        getPenjahitSheet({ month, year }),
      ]);
      const penjahitRows = penjahit?.rows ?? [];
      return mergeWithPenjahit(
        sheet,
        penjahitRows,
        penjahit?.periodMonth ?? sheet?.periodMonth,
        penjahit?.periodYear ?? sheet?.periodYear,
        penjahit?.periodLabel ?? sheet?.periodLabel,
        penjahit?.rangeLabel ?? sheet?.rangeLabel,
      );
    };

    if (requestedMonth && requestedYear) {
      return tryPeriod(requestedMonth, requestedYear);
    }

    for (const option of periodOptions) {
      const merged = await tryPeriod(option.month, option.year);
      if (merged && merged.rows.length > 0) {
        return merged;
      }
    }

    return null;
  };

  const [admin, sheet] = await Promise.all([adminPromise, loadCombinedSheet()]);

  return (
    <AdminShell
      title="Slip Gaji"
      description="Pilih karyawan untuk menampilkan slip gaji normal atau sales dari hasil hitung payroll aktif."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payslips"
    >
      {sheet ? (
        <AdminPayslipBuilder
          periodLabel={sheet.periodLabel}
          rangeLabel={sheet.rangeLabel}
          rows={sheet.rows}
          selectedEmployeeId={selectedEmployeeId}
        />
      ) : (
        <div className="rounded-[32px] border border-[#ead7ce] bg-white px-6 py-10 text-sm text-[#7a6059]">
          Belum ada payroll yang tersimpan, jadi slip gaji belum bisa dibuat untuk periode yang dipilih.
        </div>
      )}
    </AdminShell>
  );
}
