import { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import {
  ensurePayrollSupportTables,
  getActivePayrollPeriod,
  getPayrollDateRange,
  isSalesEmployeeFromValues,
} from "@/lib/payroll-admin";

type LatestPeriodRow = RowDataPacket & {
  periode_bulan: number;
  periode_tahun: number;
};

type PayrollSheetBaseRow = RowDataPacket & {
  payroll_id: number;
  employee_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  sub_divisi: string | null;
  departemen: string;
  pembagian_rekapan: string | null;
  bank: string | null;
  no_rekening: string | null;
  periode_bulan: number;
  periode_tahun: number;
  hari_kerja: number;
  total_masuk: number;
  total_lembur_jam: string;
  total_terlambat: number;
  total_setengah_hari: number;
  gaji_pokok: string;
  tunjangan_jabatan: string;
  tunjangan_lain: string;
  bonus_performa: string;
  bpjs: string;
  uang_makan: string;
  transport: string;
  insentif: string;
  potongan_kontrak: string;
  potongan_pinjaman: string;
  raw_payroll_type: "non_sales" | "sales" | null;
  raw_gaji_pokok_per_hari: string | null;
  raw_uang_makan_per_hari: string | null;
  raw_subsidi: string | null;
  raw_uang_kerajinan: string | null;
  raw_bpjs: string | null;
  raw_bonus_performa: string | null;
  raw_insentif: string | null;
  raw_uang_transport: string | null;
  total_omzet_global: string | null;
};

type PeriodAttendanceRow = RowDataPacket & {
  employee_id: number;
  status_absensi: string;
  kode_absensi: string | null;
  setengah_hari: number;
  terlambat_menit: number;
};

type PeriodOvertimeRow = RowDataPacket & {
  employee_id: number;
  total_jam: string;
};

type PeriodContractDeductionRow = RowDataPacket & {
  employee_id: number;
  nominal_potongan: string;
};

type PeriodLoanRow = RowDataPacket & {
  employee_id: number;
  angsuran_per_bulan: string;
};

export type AdminPayrollSummarySheetRow = {
  id: number;
  employeeId: number;
  number: number;
  name: string;
  role: string;
  division: string;
  recapGroup: string;
  department: string;
  bank: string;
  accountNumber: string;
  payrollType: "non_sales" | "sales";
  monthlyBaseSalary: number;
  dailyBaseSalary: number;
  positionAllowance: number;
  fixedMealAllowance: number;
  subsidy: number;
  fixedDiligenceAllowance: number;
  bpjs: number;
  performanceBonus: number;
  transportAllowance: number;
  incentive: number;
  workDays: number;
  presentDays: number;
  totalBaseSalary: number;
  omzetBonus: number;
  mealAllowance: number;
  diligenceAllowance: number;
  overtimeHours: number;
  overtimeBonus: number;
  leaveCount: number;
  sickCount: number;
  sickWithoutNoteCount: number;
  halfDayCount: number;
  halfDayDeduction: number;
  lateCount: number;
  lateDeduction: number;
  totalSalary: number;
  totalSalaryBeforeDeduction: number;
  contractDeduction: number;
  companyLoan: number;
  personalLoan: number;
  fineDeduction: number;
  contractCut: number;
  loanCut: number;
  diligenceCut: number;
  netIncome: number;
  inputGajiPerDay: number;
  inputTunjanganJabatan: number;
  inputUangMakan: number;
  inputSubsidi: number;
  inputUangKerajinan: number;
  inputBpjs: number;
  inputBonusPerforma: number;
  inputInsentif: number;
  inputUangTransport: number;
};

export type AdminPayrollSummarySheet = {
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  rangeLabel: string;
  totalOmzet: number;
  totalBonusOmzet: number;
  totalNetIncome: number;
  totalDeduction: number;
  rows: AdminPayrollSummarySheetRow[];
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPayrollMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(year, month - 1, 1));
}

function formatPayrollDateRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function getOmzetFactor(role: string) {
  const normalized = role.trim().toLowerCase();

  if (normalized.includes("secretary") || normalized.includes("manager") || normalized.includes("kepala")) {
    return 0.7;
  }

  if (normalized.includes("supervisor") || normalized.includes("admin")) {
    return 0.5;
  }

  if (normalized.includes("staff") || normalized.includes("staf")) {
    return 0.25;
  }

  return 0;
}

export async function getAdminPayrollSummarySheet(period?: { month?: number; year?: number }) {
  await ensurePayrollSupportTables();
  const activePeriod = {
    month: period?.month ?? getActivePayrollPeriod().month,
    year: period?.year ?? getActivePayrollPeriod().year,
  };
  const [latestRows] = await pool.query<LatestPeriodRow[]>(
    `
      SELECT periode_bulan, periode_tahun
      FROM payroll
      WHERE periode_bulan = ? AND periode_tahun = ?
      LIMIT 1
    `,
    [activePeriod.month, activePeriod.year],
  );

  const latest = latestRows[0];

  if (!latest) {
    return null;
  }

  const periodMonth = latest.periode_bulan;
  const periodYear = latest.periode_tahun;
  const range = getPayrollDateRange(periodMonth, periodYear);

  const [rows] = await pool.query<PayrollSheetBaseRow[]>(
    `
      SELECT
        p.id AS payroll_id,
        k.id AS employee_id,
        k.nama,
        k.jabatan,
        k.divisi,
        k.sub_divisi,
        k.departemen,
        k.pembagian_rekapan,
        k.bank,
        k.no_rekening,
        p.periode_bulan,
        p.periode_tahun,
        p.hari_kerja,
        p.total_masuk,
        p.total_lembur_jam,
        p.total_terlambat,
        p.total_setengah_hari,
        p.gaji_pokok,
        p.tunjangan_jabatan,
        p.tunjangan_lain,
        p.bonus_performa,
        p.bpjs,
        p.uang_makan,
        p.transport,
        p.insentif,
        p.potongan_kontrak,
        p.potongan_pinjaman,
        pei.payroll_type AS raw_payroll_type,
        pei.gaji_pokok_per_hari AS raw_gaji_pokok_per_hari,
        pei.uang_makan_per_hari AS raw_uang_makan_per_hari,
        pei.subsidi AS raw_subsidi,
        pei.uang_kerajinan AS raw_uang_kerajinan,
        pei.bpjs AS raw_bpjs,
        pei.bonus_performa AS raw_bonus_performa,
        pei.insentif AS raw_insentif,
        pei.uang_transport AS raw_uang_transport,
        ob.total_omzet AS total_omzet_global
      FROM payroll p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      LEFT JOIN payroll_employee_input pei ON pei.payroll_id = p.id
      LEFT JOIN omzet_bulanan ob
        ON ob.periode_bulan = p.periode_bulan
        AND ob.periode_tahun = p.periode_tahun
      WHERE p.periode_bulan = ? AND p.periode_tahun = ?
      ORDER BY k.nama ASC
    `,
    [periodMonth, periodYear],
  );

  if (!rows.length) {
    return null;
  }

  const employeeIds = rows.map((row) => row.employee_id);
  const placeholders = employeeIds.map(() => "?").join(", ");

  const [attendanceResult, overtimeResult, contractResult, loanResult] = await Promise.all([
    pool.query<PeriodAttendanceRow[]>(
      `
        SELECT
          karyawan_id AS employee_id,
          status_absensi,
          kode_absensi,
          setengah_hari,
          terlambat_menit
        FROM absensi
        WHERE karyawan_id IN (${placeholders})
          AND tanggal BETWEEN ? AND ?
      `,
      [...employeeIds, range.startSql, range.endSql],
    ),
    pool.query<PeriodOvertimeRow[]>(
      `
        SELECT
          karyawan_id AS employee_id,
          total_jam
        FROM lembur
        WHERE karyawan_id IN (${placeholders})
          AND tanggal BETWEEN ? AND ?
          AND status_approval = 'approved'
      `,
      [...employeeIds, range.startSql, range.endSql],
    ),
    pool.query<PeriodContractDeductionRow[]>(
      `
        SELECT
          karyawan_id AS employee_id,
          nominal_potongan
        FROM potongan_kontrak
        WHERE karyawan_id IN (${placeholders})
          AND bulan = ?
          AND tahun = ?
      `,
      [...employeeIds, periodMonth, periodYear],
    ),
    pool.query<PeriodLoanRow[]>(
      `
        SELECT
          karyawan_id AS employee_id,
          angsuran_per_bulan
        FROM pinjaman
        WHERE karyawan_id IN (${placeholders})
          AND status_pinjaman IN ('approved', 'berjalan')
        ORDER BY created_at DESC, id DESC
      `,
      employeeIds,
    ),
  ]);

  const attendanceMap = new Map<number, {
    present: number;
    leave: number;
    sick: number;
    sickWithoutNote: number;
    halfDay: number;
    late: number;
  }>();

  for (const row of attendanceResult[0]) {
    const current = attendanceMap.get(row.employee_id) ?? {
      present: 0,
      leave: 0,
      sick: 0,
      sickWithoutNote: 0,
      halfDay: 0,
      late: 0,
    };

    if (row.status_absensi === "hadir") {
      current.present += 1;
    }

    if (row.status_absensi === "izin") {
      current.leave += 1;
    }

    if (row.status_absensi === "sakit" && row.kode_absensi === "SX") {
      current.sickWithoutNote += 1;
    } else if (row.status_absensi === "sakit") {
      current.sick += 1;
    }

    if (row.status_absensi === "setengah_hari" || row.setengah_hari === 1) {
      current.halfDay += 1;
    }

    if (row.terlambat_menit > 0) {
      current.late += 1;
    }

    attendanceMap.set(row.employee_id, current);
  }

  const overtimeMap = new Map<number, number>();
  for (const row of overtimeResult[0]) {
    overtimeMap.set(row.employee_id, (overtimeMap.get(row.employee_id) ?? 0) + toNumber(row.total_jam));
  }

  const contractMap = new Map<number, number>();
  for (const row of contractResult[0]) {
    contractMap.set(row.employee_id, toNumber(row.nominal_potongan));
  }

  const loanMap = new Map<number, number>();
  for (const row of loanResult[0]) {
    if (!loanMap.has(row.employee_id)) {
      loanMap.set(row.employee_id, toNumber(row.angsuran_per_bulan));
    }
  }

  const totalOmzet = toNumber(rows[0]?.total_omzet_global);
  const totalEmployees = rows.length;
  const totalBonusOmzet = totalOmzet * 0.005;

  const mappedRows = rows.map<AdminPayrollSummarySheetRow>((row, index) => {
    const attendance = attendanceMap.get(row.employee_id) ?? {
      present: row.total_masuk ?? 0,
      leave: 0,
      sick: 0,
      sickWithoutNote: 0,
      halfDay: row.total_setengah_hari ?? 0,
      late: row.total_terlambat ?? 0,
    };
    const payrollType = row.raw_payroll_type ?? (isSalesEmployeeFromValues(row.jabatan, row.divisi, row.sub_divisi) ? "sales" : "non_sales");
    const workDays = row.hari_kerja ?? 0;
    const presentDays = attendance.present || row.total_masuk || 0;
    const dailyBaseSalary = toNumber(row.raw_gaji_pokok_per_hari) || (workDays > 0 ? toNumber(row.gaji_pokok) / workDays : 0);
    const monthlyBaseSalary = dailyBaseSalary * workDays;
    const positionAllowance = toNumber(row.tunjangan_jabatan);
    const fixedMealAllowance = toNumber(row.raw_uang_makan_per_hari) || (presentDays > 0 ? toNumber(row.uang_makan) / presentDays : 0);
    const subsidy = toNumber(row.raw_subsidi) || toNumber(row.tunjangan_lain);
    const fixedDiligenceAllowance = toNumber(row.raw_uang_kerajinan);
    const bpjs = toNumber(row.raw_bpjs) || toNumber(row.bpjs);
    const performanceBonus = payrollType === "sales" ? 0 : (toNumber(row.raw_bonus_performa) || toNumber(row.bonus_performa));
    const transportAllowance = payrollType === "sales" ? (toNumber(row.raw_uang_transport) || toNumber(row.transport)) : 0;
    const incentive = payrollType === "sales" ? (toNumber(row.raw_insentif) || toNumber(row.insentif)) : 0;
    const totalBaseSalary = dailyBaseSalary * presentDays;
    const roleFactor = getOmzetFactor(row.jabatan);
    const omzetBonus = payrollType === "non_sales"
      ? totalEmployees > 0
        ? (totalBonusOmzet / totalEmployees) * roleFactor
        : 0
      : incentive;
    const mealAllowance = fixedMealAllowance * presentDays;
    const diligenceAllowance = presentDays + attendance.sick >= workDays && workDays > 0
      ? fixedDiligenceAllowance
      : 0;
    const overtimeHours = overtimeMap.get(row.employee_id) ?? toNumber(row.total_lembur_jam);
    const overtimeBonus = overtimeHours * 20000;
    const halfDayCount = attendance.halfDay || row.total_setengah_hari || 0;
    const halfDayDeduction = (dailyBaseSalary / 2) * halfDayCount;
    const lateCount = attendance.late || row.total_terlambat || 0;
    const lateDeduction = lateCount * 20000;
    const totalSalaryBeforeDeduction = totalBaseSalary + positionAllowance + mealAllowance + subsidy + performanceBonus + diligenceAllowance + bpjs + overtimeBonus + omzetBonus + transportAllowance;
    const totalSalary = totalSalaryBeforeDeduction - halfDayDeduction - lateDeduction;
    const contractDeduction = contractMap.get(row.employee_id) ?? toNumber(row.potongan_kontrak);
    const companyLoan = loanMap.get(row.employee_id) ?? toNumber(row.potongan_pinjaman);
    const diligenceCut = Math.max(fixedDiligenceAllowance - diligenceAllowance, 0);
    const fineDeduction = halfDayDeduction + lateDeduction + diligenceCut;
    const netIncome = totalSalary - contractDeduction - companyLoan;

    return {
      id: row.payroll_id,
      employeeId: row.employee_id,
      number: index + 1,
      name: row.nama,
      role: row.jabatan,
      division: row.divisi,
      recapGroup: row.pembagian_rekapan || "-",
      department: row.departemen,
      bank: row.bank || "-",
      accountNumber: row.no_rekening || "-",
      payrollType,
      monthlyBaseSalary,
      dailyBaseSalary,
      positionAllowance,
      fixedMealAllowance,
      subsidy,
      fixedDiligenceAllowance,
      bpjs,
      performanceBonus,
      transportAllowance,
      incentive,
      workDays,
      presentDays,
      totalBaseSalary,
      omzetBonus,
      mealAllowance,
      diligenceAllowance,
      overtimeHours,
      overtimeBonus,
      leaveCount: attendance.leave,
      sickCount: attendance.sick,
      sickWithoutNoteCount: attendance.sickWithoutNote,
      halfDayCount,
      halfDayDeduction,
      lateCount,
      lateDeduction,
      totalSalary,
      totalSalaryBeforeDeduction,
      contractDeduction,
      companyLoan,
      personalLoan: 0,
      fineDeduction,
      contractCut: contractDeduction,
      loanCut: companyLoan,
      diligenceCut,
      netIncome,
      inputGajiPerDay: toNumber(row.raw_gaji_pokok_per_hari),
      inputTunjanganJabatan: toNumber(row.tunjangan_jabatan),
      inputUangMakan: toNumber(row.raw_uang_makan_per_hari),
      inputSubsidi: toNumber(row.raw_subsidi),
      inputUangKerajinan: toNumber(row.raw_uang_kerajinan),
      inputBpjs: toNumber(row.raw_bpjs),
      inputBonusPerforma: toNumber(row.raw_bonus_performa),
      inputInsentif: toNumber(row.raw_insentif),
      inputUangTransport: toNumber(row.raw_uang_transport),
    };
  });

  return {
    periodMonth,
    periodYear,
    periodLabel: formatPayrollMonthYear(periodMonth, periodYear),
    rangeLabel: formatPayrollDateRange(range.start, range.end),
    totalOmzet,
    totalBonusOmzet,
    totalNetIncome: mappedRows.reduce((total, row) => total + row.netIncome, 0),
    totalDeduction: mappedRows.reduce((total, row) => total + row.fineDeduction + row.contractCut + row.loanCut, 0),
    rows: mappedRows,
  };
}
