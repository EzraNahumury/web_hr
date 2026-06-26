import { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";

function countPeriodWorkDays(start: Date, end: Date) {
  const cursor = new Date(start);
  let total = 0;
  while (cursor <= end) {
    if (cursor.getDay() !== 0) total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}
import {
  autoAttachLoanInstallmentsForPeriod,
  ensureLoanSupportTables,
  getLoanDeductionRowsForPeriod,
} from "@/lib/loans";
import { isHalfDayByTime } from "@/lib/attendance";
import {
  ensurePayrollPeriodCloned,
  ensurePayrollSupportTables,
  getActivePayrollPeriod,
  getOmzetGroupKeyForUnit,
  getPayrollDateRange,
  isSalesEmployeeFromValues,
} from "@/lib/payroll-admin";
import {
  ensureReimbursementSchema,
  getApprovedReimbursementRowsForPeriod,
} from "@/lib/reimbursements";
import { isSalesNasionalRole } from "@/lib/sales-roles";
import { PAYROLL_OMZET_BONUS_RATE } from "@/lib/payroll-constants";

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
  unit: string | null;
  departemen: string;
  pembagian_rekapan: string | null;
  pembebanan: string | null;
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
  raw_kendaraan: string | null;
  raw_perjalanan_dinas_reimburse: string | null;
  raw_override_masuk: number | null;
  raw_override_lembur: string | null;
  raw_override_izin: number | null;
  raw_override_sakit: number | null;
  raw_override_sakit_tanpa_surat: number | null;
  raw_override_setengah_hari: number | null;
  raw_override_kontrak: string | null;
  raw_override_pinjaman: string | null;
  raw_override_pinjaman_pribadi: string | null;
  raw_override_gaji_pokok: string | null;
  raw_freelance_rate_type: "per_hari" | "per_jam" | null;
  raw_gaji_pokok_per_jam: string | null;
  total_omzet_global: string | null;
  status_kepegawaian: string | null;
  tanggal_masuk_pertama: string | null;
};

type OmzetUnitRow = RowDataPacket & {
  unit: string;
  total_omzet: string;
  is_custom_bonus: number;
};

type EmployeeUnitCountRow = RowDataPacket & {
  unit: string | null;
  total: number;
};

type PeriodAttendanceRow = RowDataPacket & {
  employee_id: number;
  status_absensi: string;
  kode_absensi: string | null;
  setengah_hari: number;
  terlambat_menit: number;
  jam_masuk_str: string | null;
  jam_pulang_str: string | null;
  shift: string | null;
  scheduled_shift: string | null;
};

type PeriodOvertimeRow = RowDataPacket & {
  employee_id: number;
  total_jam: string;
};

type PeriodContractDeductionRow = RowDataPacket & {
  employee_id: number;
  nominal_potongan: string;
};

type RemainingLoanRow = RowDataPacket & {
  employee_id: number;
  remaining_total: string | number | null;
};

type TotalEmployeeCountRow = RowDataPacket & {
  total: number;
};

export type AdminPayrollSummarySheetRow = {
  id: number;
  employeeId: number;
  number: number;
  name: string;
  role: string;
  division: string;
  recapGroup: string;
  unit: string | null;
  pembebanan: string | null;
  department: string;
  bank: string;
  accountNumber: string;
  payrollType: "non_sales" | "sales" | "penjahit";
  penjahitInfo?: {
    tipe: "mingguan" | "bulanan";
    pencairan: {
      minggu1: number;
      minggu2: number;
      minggu3: number;
      minggu4: number;
    } | null;
  };
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
  vehicleAllowance: number;
  travelReimbursement: number;
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
  remainingLoanBalance: number;
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
  inputKendaraan: number;
  inputPerjalananDinasReimburse: number;
  inputOverrideMasuk: number | null;
  inputOverrideLembur: number | null;
  inputOverrideIzin: number | null;
  inputOverrideSakit: number | null;
  inputOverrideSakitTanpaSurat: number | null;
  inputOverrideSetengahHari: number | null;
  inputOverrideKontrak: number | null;
  inputOverridePinjaman: number | null;
  inputOverridePinjamanPribadi: number | null;
  inputOverrideGajiPokok: number | null;
  freelanceRateType: "per_hari" | "per_jam";
  inputGajiPerJam: number;
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

function getOmzetFactor(role: string | null | undefined, employmentStatus?: string | null) {
  const normalized = (role ?? "").trim().toLowerCase();
  const status = (employmentStatus ?? "").trim().toLowerCase();

  // CEO dan freelance tidak dapat bonus omzet
  if (normalized === "ceo" || normalized === "freelance" || status === "freelance") {
    return 0;
  }

  if (
    normalized.includes("secretary") ||
    normalized.includes("manager") ||
    normalized.includes("kepala")
  ) {
    return 0.7;
  }

  if (
    normalized.includes("supervisor") ||
    normalized.includes("admin") ||
    normalized.includes("sales area")
  ) {
    return 0.5;
  }

  if (normalized.includes("staff") || normalized.includes("staf")) {
    return 0.25;
  }

  return 0;
}

function isOmzetEligible(role: string | null | undefined, employmentStatus?: string | null) {
  const normalized = (role ?? "").trim().toLowerCase();
  const status = (employmentStatus ?? "").trim().toLowerCase();
  return !(normalized === "ceo" || normalized === "freelance" || status === "freelance");
}

export async function getAdminPayrollSummarySheet(period?: {
  month?: number;
  year?: number;
}, options?: { placementFilter?: string; excludePlacement?: string }) {
  const placementFilter = options?.placementFilter?.trim();
  const excludePlacement = options?.excludePlacement?.trim();
  await Promise.all([ensurePayrollSupportTables(), ensureLoanSupportTables(), ensureReimbursementSchema()]);
  const activePeriod = {
    month: period?.month ?? getActivePayrollPeriod().month,
    year: period?.year ?? getActivePayrollPeriod().year,
  };
  await ensurePayrollPeriodCloned(activePeriod.month, activePeriod.year);
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
  const periodWorkDays = countPeriodWorkDays(range.start, range.end);

  // Auto-catat cicilan pinjaman periode ini (karyawan yang ada di payroll otomatis terpotong,
  // tanpa perlu Simpan manual). Hanya untuk periode berjalan/lampau — periode masa depan
  // yang sedang di-browse admin tidak boleh ditandai terpotong duluan.
  const activeForLoan = getActivePayrollPeriod();
  if (periodYear * 100 + periodMonth <= activeForLoan.year * 100 + activeForLoan.month) {
    await autoAttachLoanInstallmentsForPeriod(periodMonth, periodYear);
  }

  const [rows] = await pool.query<PayrollSheetBaseRow[]>(
    `
      SELECT
        p.id AS payroll_id,
        k.id AS employee_id,
        k.nama,
        k.jabatan,
        k.divisi,
        k.sub_divisi,
        k.unit,
        k.departemen,
        k.pembagian_rekapan,
        k.pembebanan,
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
        pei.kendaraan AS raw_kendaraan,
        pei.perjalanan_dinas_reimburse AS raw_perjalanan_dinas_reimburse,
        pei.override_masuk AS raw_override_masuk,
        pei.override_lembur AS raw_override_lembur,
        pei.override_izin AS raw_override_izin,
        pei.override_sakit AS raw_override_sakit,
        pei.override_sakit_tanpa_surat AS raw_override_sakit_tanpa_surat,
        pei.override_setengah_hari AS raw_override_setengah_hari,
        pei.override_kontrak AS raw_override_kontrak,
        pei.override_pinjaman AS raw_override_pinjaman,
        pei.override_pinjaman_pribadi AS raw_override_pinjaman_pribadi,
        pei.override_gaji_pokok AS raw_override_gaji_pokok,
        pei.freelance_rate_type AS raw_freelance_rate_type,
        pei.gaji_pokok_per_jam AS raw_gaji_pokok_per_jam,
        NULL AS total_omzet_global,
        k.status_kepegawaian,
        DATE_FORMAT(k.tanggal_masuk_pertama, '%Y-%m-%d') AS tanggal_masuk_pertama
      FROM payroll p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      LEFT JOIN payroll_employee_input pei ON pei.payroll_id = p.id
      WHERE p.periode_bulan = ? AND p.periode_tahun = ?
        AND COALESCE(LOWER(k.sub_divisi), '') <> 'penjahit'
        AND k.status_data = 'aktif'
        ${placementFilter ? "AND LOWER(COALESCE(k.penempatan, '')) = LOWER(?)" : ""}
        ${excludePlacement ? "AND LOWER(COALESCE(k.penempatan, '')) <> LOWER(?)" : ""}
      ORDER BY k.nama ASC
    `,
    [
      periodMonth,
      periodYear,
      ...(placementFilter ? [placementFilter] : []),
      ...(excludePlacement ? [excludePlacement] : []),
    ],
  );

  if (!rows.length) {
    return null;
  }

  const employeeIds = rows.map((row) => row.employee_id);
  const placeholders = employeeIds.map(() => "?").join(", ");

  const [
    attendanceResult,
    overtimeResult,
    contractResult,
    loanResult,
    remainingLoanResult,
    reimbursementResult,
    totalEmployeeResult,
    omzetUnitResult,
    employeeUnitCountResult,
    freelanceHoursResult,
  ] = await Promise.all([
    pool.query<PeriodAttendanceRow[]>(
      `
        SELECT
          a.karyawan_id AS employee_id,
          a.status_absensi,
          a.kode_absensi,
          a.setengah_hari,
          a.terlambat_menit,
          DATE_FORMAT(a.jam_masuk, '%H:%i') AS jam_masuk_str,
          DATE_FORMAT(a.jam_pulang, '%H:%i') AS jam_pulang_str,
          a.shift,
          j.shift AS scheduled_shift
        FROM absensi a
        LEFT JOIN jadwal_karyawan j
          ON j.karyawan_id = a.karyawan_id
          AND j.tanggal = a.tanggal
        WHERE a.karyawan_id IN (${placeholders})
          AND a.tanggal BETWEEN ? AND ?
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
    getLoanDeductionRowsForPeriod(employeeIds, periodMonth, periodYear),
    pool.query<RemainingLoanRow[]>(
      `
        SELECT
          p.karyawan_id AS employee_id,
          COALESCE(SUM(pc.nominal_potongan), 0) AS remaining_total
        FROM pinjaman_cicilan pc
        INNER JOIN pinjaman p ON p.id = pc.pinjaman_id
        WHERE p.karyawan_id IN (${placeholders})
          AND p.status_pinjaman IN ('approved', 'berjalan', 'lunas')
          AND (pc.tahun * 100 + pc.bulan) > (? * 100 + ?)
        GROUP BY p.karyawan_id
      `,
      [...employeeIds, periodYear, periodMonth],
    ),
    getApprovedReimbursementRowsForPeriod(employeeIds, range.startSql, range.endSql),
    pool.query<TotalEmployeeCountRow[]>(
      `SELECT COUNT(*) AS total FROM karyawan
        WHERE status_data = 'aktif'
          AND COALESCE(LOWER(jabatan), '') NOT IN ('ceo', 'freelance')
          AND COALESCE(LOWER(sub_divisi), '') <> 'penjahit'
          AND COALESCE(LOWER(status_kepegawaian), '') <> 'freelance'`,
    ),
    pool.query<OmzetUnitRow[]>(
      `SELECT unit, total_omzet, is_custom_bonus
       FROM omzet_bulanan
       WHERE periode_bulan = ? AND periode_tahun = ?`,
      [periodMonth, periodYear],
    ),
    pool.query<EmployeeUnitCountRow[]>(
      `SELECT unit, COUNT(*) AS total FROM karyawan
        WHERE status_data = 'aktif'
          AND COALESCE(LOWER(jabatan), '') NOT IN ('ceo', 'freelance')
          AND COALESCE(LOWER(sub_divisi), '') <> 'penjahit'
          AND COALESCE(LOWER(status_kepegawaian), '') <> 'freelance'
        GROUP BY unit`,
    ),
    pool.query<RowDataPacket[]>(
      `SELECT karyawan_id AS employee_id,
              COALESCE(SUM(
                CASE
                  WHEN jam_masuk IS NOT NULL AND jam_pulang IS NOT NULL
                    THEN FLOOR(TIMESTAMPDIFF(MINUTE, jam_masuk, jam_pulang) / 30) * 30
                  WHEN jam_masuk IS NOT NULL
                    THEN 480
                  ELSE 0
                END
              ), 0) AS total_menit
       FROM absensi
       WHERE karyawan_id IN (${placeholders})
         AND tanggal BETWEEN ? AND ?
         AND status_absensi = 'hadir'
       GROUP BY karyawan_id`,
      [...employeeIds, range.startSql, range.endSql],
    ),
  ]);

  const freelanceMinutesMap = new Map<number, number>();
  for (const row of freelanceHoursResult[0] as Array<{ employee_id: number; total_menit: number | string }>) {
    freelanceMinutesMap.set(row.employee_id, Number(row.total_menit) || 0);
  }

  const attendanceMap = new Map<
    number,
    {
      present: number;
      leave: number;
      sick: number;
      sickWithoutNote: number;
      halfDay: number;
      late: number;
      holiday: number;
      alfa: number;
    }
  >();

  for (const row of attendanceResult[0]) {
    const current = attendanceMap.get(row.employee_id) ?? {
      present: 0,
      leave: 0,
      sick: 0,
      sickWithoutNote: 0,
      halfDay: 0,
      late: 0,
      holiday: 0,
      alfa: 0,
    };

    // Satu sumber kebenaran: hitung setengah hari berbasis jam (konsisten dgn rekap absensi).
    // Record setengah hari TIDAK dihitung sebagai hadir penuh & TIDAK dihitung telat.
    // hasShift dihitung SAMA PERSIS dengan rekap absensi (lib/hris.ts): pakai jadwal
    // terjadwal dulu, baru fallback ke absensi.shift — supaya klasifikasi shift vs non-shift
    // tidak pernah berbeda antara rekap & payroll (mis. media/JNE shift lebar pagi_full/jne_*).
    const hasShift =
      !!(row.scheduled_shift && row.scheduled_shift !== "libur") || !!row.shift;
    const isHalf =
      row.status_absensi === "setengah_hari" ||
      isHalfDayByTime(
        row.jam_masuk_str,
        row.jam_pulang_str,
        row.setengah_hari,
        hasShift,
      );

    if (isHalf) {
      current.halfDay += 1;
    } else if (row.status_absensi === "hadir") {
      current.present += 1;
      if (row.terlambat_menit > 0) {
        current.late += 1;
      }
    }

    if (row.status_absensi === "izin") {
      current.leave += 1;
    }

    if (row.status_absensi === "sakit" && row.kode_absensi === "SX") {
      current.sickWithoutNote += 1;
    } else if (row.status_absensi === "sakit") {
      current.sick += 1;
    }

    if (
      row.status_absensi === "libur" ||
      row.kode_absensi === "L" ||
      row.kode_absensi === "C"
    ) {
      current.holiday += 1;
    }

    if (row.status_absensi === "alfa") {
      current.alfa += 1;
    }

    attendanceMap.set(row.employee_id, current);
  }

  const overtimeMap = new Map<number, number>();
  for (const row of overtimeResult[0]) {
    overtimeMap.set(
      row.employee_id,
      (overtimeMap.get(row.employee_id) ?? 0) + toNumber(row.total_jam),
    );
  }

  const contractMap = new Map<number, number>();
  for (const row of contractResult[0]) {
    contractMap.set(row.employee_id, toNumber(row.nominal_potongan));
  }

  const loanMap = new Map<number, number>();
  for (const row of loanResult) {
    loanMap.set(row.employeeId, toNumber(row.totalDeduction));
  }

  const remainingLoanMap = new Map<number, number>();
  for (const row of remainingLoanResult[0]) {
    remainingLoanMap.set(row.employee_id, toNumber(row.remaining_total));
  }

  const reimbursementMap = new Map<number, number>();
  for (const row of reimbursementResult) {
    reimbursementMap.set(row.employeeId, toNumber(row.totalReimbursement));
  }

  // Bonus omzet di-pool per group (mis. "AVA+Ayres" gabung; "JNE" terpisah)
  const omzetByGroup = new Map<string, { totalOmzet: number; bonusPool: number; isCustomBonus: boolean }>();
  let totalOmzetAll = 0;
  let totalBonusOmzetAll = 0;
  for (const row of omzetUnitResult[0]) {
    const rawUnit = (row.unit ?? "").trim();
    if (!rawUnit) continue;
    const groupKey = getOmzetGroupKeyForUnit(rawUnit) ?? rawUnit;
    const omzet = toNumber(row.total_omzet);
    const isCustomBonus = !!row.is_custom_bonus;
    const bonusPool = isCustomBonus ? omzet : omzet * PAYROLL_OMZET_BONUS_RATE;
    const existing = omzetByGroup.get(groupKey);
    if (existing) {
      existing.totalOmzet += omzet;
      existing.bonusPool += bonusPool;
    } else {
      omzetByGroup.set(groupKey, { totalOmzet: omzet, bonusPool, isCustomBonus });
    }
    totalOmzetAll += omzet;
    totalBonusOmzetAll += bonusPool;
  }

  // Employee count per group (AVA + Ayres karyawan dijumlahkan; JNE sendiri)
  const employeeCountByGroup = new Map<string, number>();
  let totalEligibleEmployees = 0;
  for (const row of employeeUnitCountResult[0]) {
    const groupKey = getOmzetGroupKeyForUnit(row.unit);
    if (!groupKey) continue;
    const count = toNumber(row.total);
    employeeCountByGroup.set(groupKey, (employeeCountByGroup.get(groupKey) ?? 0) + count);
    totalEligibleEmployees += count;
  }
  if (totalEligibleEmployees === 0) {
    totalEligibleEmployees = toNumber(totalEmployeeResult[0]?.[0]?.total) || rows.length;
  }

  const totalOmzet = totalOmzetAll;
  const totalBonusOmzet = totalBonusOmzetAll;

  const mappedRows = rows.map<AdminPayrollSummarySheetRow>((row, index) => {
    const attendance = attendanceMap.get(row.employee_id) ?? {
      present: 0,
      leave: 0,
      sick: 0,
      sickWithoutNote: 0,
      halfDay: 0,
      late: 0,
      holiday: 0,
      alfa: 0,
    };

    const inputOverrideMasuk = row.raw_override_masuk ?? null;
    const inputOverrideLembur =
      row.raw_override_lembur !== null
        ? toNumber(row.raw_override_lembur)
        : null;
    const inputOverrideIzin = row.raw_override_izin ?? null;
    const inputOverrideSakit = row.raw_override_sakit ?? null;
    const inputOverrideSakitTanpaSurat =
      row.raw_override_sakit_tanpa_surat ?? null;
    const inputOverrideSetengahHari = row.raw_override_setengah_hari ?? null;
    const inputOverrideKontrak =
      row.raw_override_kontrak !== null
        ? toNumber(row.raw_override_kontrak)
        : null;
    const inputOverridePinjaman =
      row.raw_override_pinjaman !== null
        ? toNumber(row.raw_override_pinjaman)
        : null;
    const inputOverridePinjamanPribadi =
      row.raw_override_pinjaman_pribadi !== null
        ? toNumber(row.raw_override_pinjaman_pribadi)
        : null;
    const inputOverrideGajiPokok =
      row.raw_override_gaji_pokok !== null
        ? toNumber(row.raw_override_gaji_pokok)
        : null;

    const statusKepegawaianNorm = (row.status_kepegawaian ?? "").trim().toLowerCase();
    const isFreelance = statusKepegawaianNorm === "freelance";
    // Freelance selalu dihitung per jam: rate × total jam (dari absensi, dibulatkan per 30 menit)
    const freelanceRatePerJam = toNumber(row.raw_gaji_pokok_per_jam);
    const freelanceMinutes = freelanceMinutesMap.get(row.employee_id) ?? 0;

    const payrollType =
      row.raw_payroll_type ??
      (isSalesEmployeeFromValues(row.jabatan, row.divisi, row.sub_divisi)
        ? "sales"
        : "non_sales");
    const isSalesNasional = isSalesNasionalRole(row.jabatan);
    const workDays = periodWorkDays;
    const presentDays = inputOverrideMasuk ?? attendance.present;
    // Setengah hari: gaji pokok dihitung 1 hari penuh di base, lalu dipotong 1/2 hari
    // via halfDayDeduction → bersih = 1/2 hari (bukan dobel potong).
    const halfDayCount = isFreelance ? 0 : (inputOverrideSetengahHari ?? attendance.halfDay);

    // For freelance: Insentif Kehadiran adalah rate per jam. Tampilkan rate yang admin input
    // (entah dia saved di kolom per_jam atau per_hari — keduanya artinya sama: rate per jam).
    const dailyBaseSalary = isFreelance
      ? (freelanceRatePerJam || toNumber(row.raw_gaji_pokok_per_hari))
      : (toNumber(row.raw_gaji_pokok_per_hari) || (workDays > 0 ? toNumber(row.gaji_pokok) / workDays : 0));
    // Take Home Pay freelance = total jam dari absensi (dibulatkan per 30 menit) × rate per jam
    // Tidak pakai inputOverrideGajiPokok karena bisa = 0 dari clone period -> nullish coalescing tidak fallback.
    const monthlyBaseSalary = isFreelance
      ? (freelanceMinutes / 60) * dailyBaseSalary
      : (inputOverrideGajiPokok ?? dailyBaseSalary * workDays);

    const positionAllowance = isFreelance ? 0 : toNumber(row.tunjangan_jabatan);
    const fixedMealAllowance = isFreelance ? 0 :
      (toNumber(row.raw_uang_makan_per_hari) ||
      (presentDays > 0 ? toNumber(row.uang_makan) / presentDays : 0));
    const subsidy = isFreelance ? 0 : (toNumber(row.raw_subsidi) || toNumber(row.tunjangan_lain));
    const fixedDiligenceAllowance = isFreelance ? 0 : toNumber(row.raw_uang_kerajinan);
    const bpjs = isFreelance ? 0 : (toNumber(row.raw_bpjs) || toNumber(row.bpjs));
    const performanceBonus = isFreelance ? 0 :
      (payrollType === "sales" && !isSalesNasional
        ? 0
        : toNumber(row.raw_bonus_performa) || toNumber(row.bonus_performa));
    const transportAllowance = isFreelance ? 0 :
      (payrollType === "sales"
        ? toNumber(row.raw_uang_transport) || toNumber(row.transport)
        : 0);
    const incentive = isFreelance ? 0 :
      (payrollType === "sales"
        ? toNumber(row.raw_insentif) || toNumber(row.insentif)
        : 0);
    const vehicleAllowance = isFreelance ? 0 : (isSalesNasional ? toNumber(row.raw_kendaraan) : 0);
    const travelReimbursement = isFreelance ? 0 : (isSalesNasional ? (reimbursementMap.get(row.employee_id) ?? 0) : 0);
    const holidayDays = attendance.holiday;
    const alfaCount = attendance.alfa;
    const isNewEmployee =
      !!row.tanggal_masuk_pertama &&
      row.tanggal_masuk_pertama >= range.startSql &&
      row.tanggal_masuk_pertama <= range.endSql;
    const isNewEmployeeBelow15 = isNewEmployee && presentDays < 15;
    const prorateBase = isNewEmployeeBelow15
      ? (monthlyBaseSalary / 25) * (presentDays + halfDayCount)
      : null;
    const totalBaseSalary = isFreelance
      ? monthlyBaseSalary
      : (prorateBase ?? dailyBaseSalary * (presentDays + holidayDays + halfDayCount));
    const roleFactor = getOmzetFactor(row.jabatan, row.status_kepegawaian);
    const employeeGroupKey = getOmzetGroupKeyForUnit(row.unit);
    const groupOmzet = employeeGroupKey ? omzetByGroup.get(employeeGroupKey) : undefined;
    const groupEligibleCount = employeeGroupKey ? (employeeCountByGroup.get(employeeGroupKey) ?? 0) : 0;
    const omzetBonus =
      !isNewEmployee &&
      isOmzetEligible(row.jabatan, row.status_kepegawaian) &&
      groupOmzet &&
      groupEligibleCount > 0
        ? groupOmzet.isCustomBonus
          ? groupOmzet.bonusPool
          : (groupOmzet.bonusPool / groupEligibleCount) * roleFactor
        : 0;
    const mealAllowance = isFreelance ? 0 : fixedMealAllowance * presentDays;

    const leaveCount = isFreelance ? 0 : (inputOverrideIzin ?? attendance.leave);
    const sickCount = isFreelance ? 0 : (inputOverrideSakit ?? attendance.sick);
    const sickWithoutNoteCount = isFreelance ? 0 :
      (inputOverrideSakitTanpaSurat ?? attendance.sickWithoutNote);

    const overtimeHours = isFreelance ? 0 :
      (inputOverrideLembur ?? (overtimeMap.get(row.employee_id) ?? 0));
    const overtimeBonus = overtimeHours * 20000;

    const kerajinanNoIssue =
      sickCount <= 2 && sickWithoutNoteCount === 0 && alfaCount === 0;
    const kerajinanReachesWorkDays =
      presentDays + sickCount + halfDayCount + holidayDays >= workDays;
    const diligenceAllowance =
      workDays > 0 && kerajinanNoIssue && kerajinanReachesWorkDays
        ? fixedDiligenceAllowance
        : 0;
    const halfDayDeduction = isFreelance ? 0 : (dailyBaseSalary / 2) * halfDayCount;
    const lateCount = isFreelance ? 0 : attendance.late;
    const lateDeduction = isFreelance ? 0 : lateCount * 20000;
    const totalSalaryBeforeDeduction =
      totalBaseSalary +
      positionAllowance +
      mealAllowance +
      subsidy +
      performanceBonus +
      diligenceAllowance +
      bpjs +
      overtimeBonus +
      omzetBonus +
      incentive +
      transportAllowance +
      vehicleAllowance +
      travelReimbursement;
    const totalSalary =
      totalSalaryBeforeDeduction - halfDayDeduction - lateDeduction;
    const isContractWaived =
      statusKepegawaianNorm === "tetap" ||
      statusKepegawaianNorm === "freelance" ||
      isSalesNasional;
    const rawContractDeduction =
      inputOverrideKontrak ??
      contractMap.get(row.employee_id) ??
      toNumber(row.potongan_kontrak);
    const contractDeduction = isContractWaived ? 0 : rawContractDeduction;
    const companyLoan = isFreelance
      ? 0
      : (inputOverridePinjaman ?? loanMap.get(row.employee_id) ?? 0);
    const personalLoan = isFreelance ? 0 : (inputOverridePinjamanPribadi ?? 0);
    const diligenceCut = Math.max(
      fixedDiligenceAllowance - diligenceAllowance,
      0,
    );
    const fineDeduction = halfDayDeduction + lateDeduction + diligenceCut;
    const netIncome =
      totalSalary - contractDeduction - companyLoan - personalLoan;

    return {
      id: row.payroll_id,
      employeeId: row.employee_id,
      number: index + 1,
      name: row.nama,
      role: row.jabatan ?? "-",
      division: row.divisi ?? "-",
      recapGroup: row.pembagian_rekapan || "-",
      unit: row.unit ?? null,
      pembebanan: row.pembebanan ?? null,
      department: row.departemen ?? "-",
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
      vehicleAllowance,
      travelReimbursement,
      workDays,
      presentDays,
      totalBaseSalary,
      omzetBonus,
      mealAllowance,
      diligenceAllowance,
      overtimeHours,
      overtimeBonus,
      leaveCount,
      sickCount,
      sickWithoutNoteCount,
      halfDayCount,
      halfDayDeduction,
      lateCount,
      lateDeduction,
      totalSalary,
      totalSalaryBeforeDeduction,
      contractDeduction,
      companyLoan,
      personalLoan,
      remainingLoanBalance: remainingLoanMap.get(row.employee_id) ?? 0,
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
      inputKendaraan: toNumber(row.raw_kendaraan),
      inputPerjalananDinasReimburse: travelReimbursement,
      inputOverrideMasuk,
      inputOverrideLembur,
      inputOverrideIzin,
      inputOverrideSakit,
      inputOverrideSakitTanpaSurat,
      inputOverrideSetengahHari,
      inputOverrideKontrak,
      inputOverridePinjaman,
      inputOverridePinjamanPribadi,
      inputOverrideGajiPokok,
      freelanceRateType: (row.raw_freelance_rate_type ?? "per_hari") as "per_hari" | "per_jam",
      inputGajiPerJam: toNumber(row.raw_gaji_pokok_per_jam),
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
    totalDeduction: mappedRows.reduce(
      (total, row) => total + row.fineDeduction + row.contractCut + row.loanCut,
      0,
    ),
    rows: mappedRows,
  };
}
