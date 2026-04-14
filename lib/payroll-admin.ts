import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";
import {
  attachLoanInstallmentsToPayroll,
  detachLoanInstallmentsFromPayroll,
  ensureLoanSupportTables,
  getLoanDeductionForPeriod,
} from "@/lib/loans";

type PayrollEmployeeOptionRow = RowDataPacket & {
  employee_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  sub_divisi: string | null;
  departemen: string;
  pembagian_rekapan: string | null;
};

type AttendanceAggregateRow = RowDataPacket & {
  present_count: number;
  leave_count: number;
  sick_count: number;
  sick_without_note_count: number;
  half_day_count: number;
  late_count: number;
};

type OvertimeAggregateRow = RowDataPacket & {
  total_jam: string | null;
};

type ContractAggregateRow = RowDataPacket & {
  nominal_potongan: string | null;
};

type PayrollEmployeeRow = RowDataPacket & {
  employee_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  sub_divisi: string | null;
};

type OmzetMonthlyRow = RowDataPacket & {
  id: number;
  periode_bulan: number;
  periode_tahun: number;
  unit: string;
  total_omzet: string;
  is_custom_bonus: number;
};

type PeriodRow = RowDataPacket & {
  periode_bulan: number;
  periode_tahun: number;
};

type PayrollIdentityRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  periode_bulan: number;
  periode_tahun: number;
  nama: string;
};

export type PayrollEmployeeOption = {
  employeeId: number;
  name: string;
  role: string;
  division: string;
  department: string;
  recapGroup: string;
  isSales: boolean;
};

export type PayrollFormPayload = {
  employeeId: number;
  payrollType: "non_sales" | "sales";
  gajiPerDay: number;
  tunjanganJabatan: number;
  uangMakan: number;
  subsidi: number;
  uangKerajinan: number;
  bpjs: number;
  bonusPerforma: number;
  totalOmzet: number;
  insentif: number;
  uangTransport: number;
  overrideMasuk?: number | null;
  overrideLembur?: number | null;
  overrideIzin?: number | null;
  overrideSakit?: number | null;
  overrideSakitTanpaSurat?: number | null;
  overrideSetengahHari?: number | null;
  overrideKontrak?: number | null;
  overridePinjaman?: number | null;
  overridePinjamanPribadi?: number | null;
  overrideGajiPokok?: number | null;
};

export type PayrollOmzetUnitEntry = {
  unit: string;
  label: string;
  totalOmzet: number;
  bonusOmzet: number;
  isCustomBonus: boolean;
  isLocked: boolean;
};

export type OmzetGroupConfig = {
  key: string;
  label: string;
  units: string[];
  defaultCustomBonus: boolean;
};

export const OMZET_GROUPS: OmzetGroupConfig[] = [
  {
    key: "AVA+Ayres",
    label: "AVA + Ayres",
    units: ["AVA Sportivo", "Ayres Apparel"],
    defaultCustomBonus: false,
  },
  {
    key: "JNE",
    label: "JNE",
    units: ["JNE"],
    defaultCustomBonus: true,
  },
];

export function getOmzetGroupKeyForUnit(unit: string | null | undefined): string | null {
  const normalized = (unit ?? "").trim().toLowerCase();
  if (!normalized) return null;
  for (const group of OMZET_GROUPS) {
    if (group.key.toLowerCase() === normalized) return group.key;
    if (group.units.some((u) => u.toLowerCase() === normalized)) return group.key;
  }
  return null;
}

export type PayrollOmzetPeriod = {
  periodMonth: number;
  periodYear: number;
  totalOmzet: number;
  bonusOmzet: number;
  isLocked: boolean;
  units: PayrollOmzetUnitEntry[];
};

export type PayrollPeriodOption = {
  month: number;
  year: number;
  label: string;
};

type PayrollPeriodInput = {
  month?: number;
  year?: number;
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

function getJakartaNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [yearRaw, monthRaw, dayRaw] = formatter.format(now).split("-");
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
    day: Number(dayRaw),
  };
}

export function getActivePayrollPeriod() {
  const now = getJakartaNow();
  return {
    month: now.month,
    year: now.year,
  };
}

function resolvePayrollPeriod(period?: PayrollPeriodInput) {
  const active = getActivePayrollPeriod();
  return {
    month: period?.month ?? active.month,
    year: period?.year ?? active.year,
  };
}

export function getPayrollDateRange(periodMonth: number, periodYear: number) {
  const start = new Date(periodYear, periodMonth - 2, 26);
  const end = new Date(periodYear, periodMonth - 1, 25);

  const toSqlDate = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start,
    end,
    startSql: toSqlDate(start),
    endSql: toSqlDate(end),
  };
}

export function formatPayrollPeriodLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(year, month - 1, 1));
}

function countWorkDays(start: Date, end: Date) {
  const cursor = new Date(start);
  let total = 0;

  while (cursor <= end) {
    if (cursor.getDay() !== 0) {
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

export function isSalesEmployeeFromValues(role: string | null | undefined, division: string | null | undefined, subDivision?: string | null) {
  const roleText = (role ?? "").trim().toLowerCase();
  const divisionText = (division ?? "").trim().toLowerCase();
  const subDivisionText = (subDivision ?? "").trim().toLowerCase();

  if (["secretary", "manager", "admin", "supervisor"].some((keyword) => roleText.includes(keyword))) {
    return false;
  }

  return [roleText, divisionText, subDivisionText].some((value) =>
    ["sales", "retail", "marketplace"].some((keyword) => value.includes(keyword)),
  );
}

export async function ensurePayrollSupportTables(connection?: any) {
  const executor = connection ?? pool;

  await executor.query(`
    CREATE TABLE IF NOT EXISTS omzet_bulanan (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      periode_bulan TINYINT UNSIGNED NOT NULL,
      periode_tahun SMALLINT UNSIGNED NOT NULL,
      unit VARCHAR(100) NOT NULL DEFAULT '',
      total_omzet DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      is_custom_bonus TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_omzet_bulanan_periode_unit (periode_bulan, periode_tahun, unit)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const safeMigrateOmzet = async (sql: string, ignoreCode: string, label: string) => {
    try {
      await executor.query(sql);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code !== ignoreCode) {
        console.error(`Migration warning ${label}:`, err);
      }
    }
  };

  await safeMigrateOmzet(
    `ALTER TABLE omzet_bulanan ADD COLUMN unit VARCHAR(100) NOT NULL DEFAULT '' AFTER periode_tahun`,
    "ER_DUP_FIELDNAME",
    "omzet_bulanan.unit",
  );
  await safeMigrateOmzet(
    `ALTER TABLE omzet_bulanan ADD COLUMN is_custom_bonus TINYINT(1) NOT NULL DEFAULT 0 AFTER total_omzet`,
    "ER_DUP_FIELDNAME",
    "omzet_bulanan.is_custom_bonus",
  );
  await safeMigrateOmzet(
    `ALTER TABLE omzet_bulanan DROP INDEX uq_omzet_bulanan_periode`,
    "ER_CANT_DROP_FIELD_OR_KEY",
    "omzet_bulanan drop old unique",
  );
  await safeMigrateOmzet(
    `ALTER TABLE omzet_bulanan ADD UNIQUE KEY uq_omzet_bulanan_periode_unit (periode_bulan, periode_tahun, unit)`,
    "ER_DUP_KEYNAME",
    "omzet_bulanan unique unit",
  );

  await executor.query(`
    CREATE TABLE IF NOT EXISTS payroll_employee_input (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      payroll_id BIGINT UNSIGNED NOT NULL,
      karyawan_id BIGINT UNSIGNED NOT NULL,
      payroll_type ENUM('non_sales', 'sales') NOT NULL DEFAULT 'non_sales',
      gaji_pokok_per_hari DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      uang_makan_per_hari DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      subsidi DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      uang_kerajinan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      bpjs DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      bonus_performa DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      insentif DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      uang_transport DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      override_masuk INT NULL DEFAULT NULL,
      override_lembur DECIMAL(14,2) NULL DEFAULT NULL,
      override_izin INT NULL DEFAULT NULL,
      override_sakit INT NULL DEFAULT NULL,
      override_sakit_tanpa_surat INT NULL DEFAULT NULL,
      override_setengah_hari INT NULL DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_payroll_employee_input_payroll (payroll_id),
      KEY idx_payroll_employee_input_karyawan (karyawan_id),
      CONSTRAINT fk_payroll_employee_input_payroll
        FOREIGN KEY (payroll_id) REFERENCES payroll (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT fk_payroll_employee_input_karyawan
        FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input 
      ADD COLUMN override_masuk INT NULL DEFAULT NULL,
      ADD COLUMN override_lembur DECIMAL(14,2) NULL DEFAULT NULL,
      ADD COLUMN override_izin INT NULL DEFAULT NULL,
      ADD COLUMN override_sakit INT NULL DEFAULT NULL,
      ADD COLUMN override_sakit_tanpa_surat INT NULL DEFAULT NULL,
      ADD COLUMN override_setengah_hari INT NULL DEFAULT NULL
    `);
  } catch (err: any) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for payroll_employee_input:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input 
      ADD COLUMN override_kontrak DECIMAL(14,2) NULL DEFAULT NULL,
      ADD COLUMN override_pinjaman DECIMAL(14,2) NULL DEFAULT NULL,
      ADD COLUMN override_pinjaman_pribadi DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: any) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for deduction overrides:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input 
      ADD COLUMN override_gaji_pokok DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: any) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for override_gaji_pokok:", err);
    }
  }
}

export async function listPayrollEmployeeOptions() {
  const [rows] = await pool.query<PayrollEmployeeOptionRow[]>(
    `
      SELECT
        k.id AS employee_id,
        k.nama,
        k.jabatan,
        k.divisi,
        k.sub_divisi,
        k.departemen,
        k.pembagian_rekapan
      FROM karyawan k
      WHERE k.status_data = 'aktif'
      ORDER BY k.nama ASC
    `,
  );

  return rows.map((row) => ({
    employeeId: row.employee_id,
    name: row.nama,
    role: row.jabatan,
    division: row.divisi,
    department: row.departemen,
    recapGroup: row.pembagian_rekapan ?? "-",
    isSales: isSalesEmployeeFromValues(row.jabatan, row.divisi, row.sub_divisi),
  }));
}

export async function listPayrollPeriods() {
  await ensurePayrollSupportTables();

  const [rows] = await pool.query<PeriodRow[]>(
    `
      SELECT periode_bulan, periode_tahun FROM payroll
      UNION
      SELECT periode_bulan, periode_tahun FROM omzet_bulanan
      ORDER BY periode_tahun DESC, periode_bulan DESC
    `,
  );

  if (!rows.length) {
    const active = getActivePayrollPeriod();
    return [{ month: active.month, year: active.year, label: formatPayrollPeriodLabel(active.month, active.year) }];
  }

  return rows.map((row) => ({
    month: row.periode_bulan,
    year: row.periode_tahun,
    label: formatPayrollPeriodLabel(row.periode_bulan, row.periode_tahun),
  }));
}

export async function getPayrollOmzetPeriod(period?: PayrollPeriodInput): Promise<PayrollOmzetPeriod> {
  const resolved = resolvePayrollPeriod(period);
  await ensurePayrollSupportTables();

  const [rows] = await pool.query<OmzetMonthlyRow[]>(
    `
      SELECT id, periode_bulan, periode_tahun, unit, total_omzet, is_custom_bonus
      FROM omzet_bulanan
      WHERE periode_bulan = ? AND periode_tahun = ?
    `,
    [resolved.month, resolved.year],
  );

  // Map data tersimpan ke group key (mendukung data lama yang masih pakai nama unit asli)
  const savedByGroup = new Map<string, OmzetMonthlyRow>();
  for (const row of rows) {
    const unitName = (row.unit ?? "").trim();
    if (!unitName) continue;
    const groupKey = getOmzetGroupKeyForUnit(unitName) ?? unitName;
    savedByGroup.set(groupKey, row);
  }

  const units: PayrollOmzetUnitEntry[] = OMZET_GROUPS.map((group) => {
    const saved = savedByGroup.get(group.key);
    const totalOmzet = toNumber(saved?.total_omzet);
    const isCustomBonus = saved ? Boolean(saved.is_custom_bonus) : group.defaultCustomBonus;
    const bonusOmzet = isCustomBonus ? totalOmzet : totalOmzet * 0.005;
    return {
      unit: group.key,
      label: group.label,
      totalOmzet,
      bonusOmzet,
      isCustomBonus,
      isLocked: Boolean(saved),
    };
  });

  // Sertakan grup lain yang sudah tersimpan tapi tidak ada di daftar default
  for (const row of rows) {
    const unitName = (row.unit ?? "").trim();
    if (!unitName) continue;
    const groupKey = getOmzetGroupKeyForUnit(unitName) ?? unitName;
    if (OMZET_GROUPS.some((g) => g.key === groupKey)) continue;
    const totalOmzet = toNumber(row.total_omzet);
    const isCustomBonus = Boolean(row.is_custom_bonus);
    units.push({
      unit: groupKey,
      label: groupKey,
      totalOmzet,
      bonusOmzet: isCustomBonus ? totalOmzet : totalOmzet * 0.005,
      isCustomBonus,
      isLocked: true,
    });
  }

  const totalOmzet = units.reduce((sum, item) => sum + item.totalOmzet, 0);
  const bonusOmzet = units.reduce((sum, item) => sum + item.bonusOmzet, 0);
  const isLocked = units.some((item) => item.isLocked);

  return {
    periodMonth: resolved.month,
    periodYear: resolved.year,
    totalOmzet,
    bonusOmzet,
    isLocked,
    units,
  };
}

export type OmzetUnitInput = {
  unit: string;
  totalOmzet: number;
  isCustomBonus: boolean;
};

export async function upsertPayrollPeriodOmzet(
  inputs: OmzetUnitInput[] | number,
  period?: PayrollPeriodInput,
) {
  const resolved = resolvePayrollPeriod(period);
  await ensurePayrollSupportTables();

  // Backward compat: jika dipanggil dengan single number, taruh ke group pertama (legacy)
  const normalizedInputs: OmzetUnitInput[] = Array.isArray(inputs)
    ? inputs
    : [{ unit: OMZET_GROUPS[0].key, totalOmzet: inputs, isCustomBonus: false }];

  let isUpdateAny = false;

  for (const item of normalizedInputs) {
    const rawUnitName = item.unit.trim();
    if (!rawUnitName) continue;
    // Normalisasi ke group key (kalau user kirim "AVA Sportivo", auto map ke "AVA+Ayres")
    const unitName = getOmzetGroupKeyForUnit(rawUnitName) ?? rawUnitName;

    const [existingRows] = await pool.query<OmzetMonthlyRow[]>(
      `
        SELECT id FROM omzet_bulanan
        WHERE periode_bulan = ? AND periode_tahun = ? AND unit = ?
        LIMIT 1
      `,
      [resolved.month, resolved.year, unitName],
    );

    if (existingRows[0]) {
      isUpdateAny = true;
      await pool.query<ResultSetHeader>(
        `
          UPDATE omzet_bulanan
          SET total_omzet = ?, is_custom_bonus = ?
          WHERE periode_bulan = ? AND periode_tahun = ? AND unit = ?
        `,
        [item.totalOmzet, item.isCustomBonus ? 1 : 0, resolved.month, resolved.year, unitName],
      );
    } else {
      await pool.query<ResultSetHeader>(
        `
          INSERT INTO omzet_bulanan (periode_bulan, periode_tahun, unit, total_omzet, is_custom_bonus)
          VALUES (?, ?, ?, ?, ?)
        `,
        [resolved.month, resolved.year, unitName, item.totalOmzet, item.isCustomBonus ? 1 : 0],
      );
    }
  }

  const refreshed = await getPayrollOmzetPeriod({ month: resolved.month, year: resolved.year });

  return {
    periodMonth: resolved.month,
    periodYear: resolved.year,
    totalOmzet: refreshed.totalOmzet,
    bonusOmzet: refreshed.bonusOmzet,
    units: refreshed.units,
    isLocked: refreshed.isLocked,
    isUpdate: isUpdateAny,
  };
}

export async function upsertPayrollFromForm(payload: PayrollFormPayload, period?: PayrollPeriodInput) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensurePayrollSupportTables(connection);
    await ensureLoanSupportTables(connection);

    const [employees] = await connection.query<PayrollEmployeeRow[]>(
      `
        SELECT
          id AS employee_id,
          nama,
          jabatan,
          divisi,
          sub_divisi
        FROM karyawan
        WHERE id = ?
        LIMIT 1
      `,
      [payload.employeeId],
    );

    const employee = employees[0];

    if (!employee) {
      throw new Error("Karyawan tidak ditemukan.");
    }

    const payrollType = isSalesEmployeeFromValues(employee.jabatan, employee.divisi, employee.sub_divisi)
      ? "sales"
      : "non_sales";
    const resolved = resolvePayrollPeriod(period);
    const range = getPayrollDateRange(resolved.month, resolved.year);
    const workDays = countWorkDays(range.start, range.end);

    const [attendanceRows] = await connection.query<AttendanceAggregateRow[]>(
      `
        SELECT
          SUM(CASE WHEN status_absensi = 'hadir' THEN 1 ELSE 0 END) AS present_count,
          SUM(CASE WHEN status_absensi = 'izin' THEN 1 ELSE 0 END) AS leave_count,
          SUM(CASE WHEN status_absensi = 'sakit' AND kode_absensi <> 'SX' THEN 1 ELSE 0 END) AS sick_count,
          SUM(CASE WHEN status_absensi = 'sakit' AND kode_absensi = 'SX' THEN 1 ELSE 0 END) AS sick_without_note_count,
          SUM(CASE WHEN status_absensi = 'setengah_hari' OR setengah_hari = 1 THEN 1 ELSE 0 END) AS half_day_count,
          SUM(CASE WHEN terlambat_menit > 0 THEN 1 ELSE 0 END) AS late_count
        FROM absensi
        WHERE karyawan_id = ?
          AND tanggal BETWEEN ? AND ?
      `,
      [payload.employeeId, range.startSql, range.endSql],
    );

    const attendance = attendanceRows[0] ?? {
      present_count: 0,
      leave_count: 0,
      sick_count: 0,
      sick_without_note_count: 0,
      half_day_count: 0,
      late_count: 0,
    };

    const [overtimeRows] = await connection.query<OvertimeAggregateRow[]>(
      `
        SELECT COALESCE(SUM(total_jam), 0) AS total_jam
        FROM lembur
        WHERE karyawan_id = ?
          AND tanggal BETWEEN ? AND ?
          AND status_approval = 'approved'
      `,
      [payload.employeeId, range.startSql, range.endSql],
    );

    const [contractRows] = await connection.query<ContractAggregateRow[]>(
      `
        SELECT nominal_potongan
        FROM potongan_kontrak
        WHERE karyawan_id = ? AND bulan = ? AND tahun = ?
        LIMIT 1
      `,
      [payload.employeeId, resolved.month, resolved.year],
    );

    const automaticLoanCut = await getLoanDeductionForPeriod(
      payload.employeeId,
      resolved.month,
      resolved.year,
      connection,
    );

    const presentDays = payload.overrideMasuk ?? attendance.present_count ?? 0;
    const leaveCount = payload.overrideIzin ?? attendance.leave_count ?? 0;
    const sickCount = payload.overrideSakit ?? attendance.sick_count ?? 0;
    const sickWithoutNoteCount = payload.overrideSakitTanpaSurat ?? attendance.sick_without_note_count ?? 0;
    const halfDayCount = payload.overrideSetengahHari ?? attendance.half_day_count ?? 0;
    const lateCount = attendance.late_count ?? 0;
    const overtimeHours = payload.overrideLembur ?? toNumber(overtimeRows[0]?.total_jam);
    const contractCut = payload.overrideKontrak ?? toNumber(contractRows[0]?.nominal_potongan);
    const loanCut = payload.overridePinjaman ?? automaticLoanCut;
    const personalLoanCut = payload.overridePinjamanPribadi ?? 0;
    const gajiPerDay = payload.gajiPerDay;
    const monthlyBaseSalary = payload.overrideGajiPokok ?? gajiPerDay * workDays;
    const tunjanganJabatan = payload.tunjanganJabatan;
    const subsidi = payload.subsidi;
    const uangMakanPerDay = payload.uangMakan;
    const uangMakanTotal = uangMakanPerDay * presentDays;
    const uangKerajinan = payload.uangKerajinan;
    const bpjs = payload.bpjs;
    const bonusPerforma = payrollType === "sales" ? 0 : payload.bonusPerforma;
    const diligenceAllowance = presentDays + sickCount >= workDays ? uangKerajinan : 0;
    const diligenceCut = Math.max(uangKerajinan - diligenceAllowance, 0);
    const overtimeBonus = overtimeHours * 20000;
    const halfDayDeduction = (gajiPerDay / 2) * halfDayCount;
    const lateDeduction = lateCount * 20000;
    const totalBaseSalary = gajiPerDay * presentDays;
    const totalSalaryBeforeDeduction =
      totalBaseSalary +
      tunjanganJabatan +
      uangMakanTotal +
      subsidi +
      bonusPerforma +
      diligenceAllowance +
      bpjs +
      overtimeBonus +
      (payrollType === "sales" ? payload.insentif + payload.uangTransport : 0);
    const totalSalary = totalSalaryBeforeDeduction - halfDayDeduction - lateDeduction;
    const totalPotongan = halfDayDeduction + lateDeduction + diligenceCut + contractCut + loanCut + personalLoanCut;
    const netIncome = totalSalary - contractCut - loanCut - personalLoanCut;

    const [payrollResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO payroll (
          karyawan_id,
          periode_bulan,
          periode_tahun,
          hari_kerja,
          total_masuk,
          total_lembur_jam,
          total_terlambat,
          total_setengah_hari,
          gaji_pokok,
          tunjangan_jabatan,
          tunjangan_lain,
          bonus_performa,
          bpjs,
          uang_makan,
          transport,
          insentif,
          upah_lembur,
          potongan_keterlambatan,
          potongan_setengah_hari,
          potongan_kontrak,
          potongan_pinjaman,
          potongan_kerajinan,
          total_potongan,
          gaji_bersih,
          status_payroll
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        ON DUPLICATE KEY UPDATE
          hari_kerja = VALUES(hari_kerja),
          total_masuk = VALUES(total_masuk),
          total_lembur_jam = VALUES(total_lembur_jam),
          total_terlambat = VALUES(total_terlambat),
          total_setengah_hari = VALUES(total_setengah_hari),
          gaji_pokok = VALUES(gaji_pokok),
          tunjangan_jabatan = VALUES(tunjangan_jabatan),
          tunjangan_lain = VALUES(tunjangan_lain),
          bonus_performa = VALUES(bonus_performa),
          bpjs = VALUES(bpjs),
          uang_makan = VALUES(uang_makan),
          transport = VALUES(transport),
          insentif = VALUES(insentif),
          upah_lembur = VALUES(upah_lembur),
          potongan_keterlambatan = VALUES(potongan_keterlambatan),
          potongan_setengah_hari = VALUES(potongan_setengah_hari),
          potongan_kontrak = VALUES(potongan_kontrak),
          potongan_pinjaman = VALUES(potongan_pinjaman),
          potongan_kerajinan = VALUES(potongan_kerajinan),
          total_potongan = VALUES(total_potongan),
          gaji_bersih = VALUES(gaji_bersih),
          status_payroll = 'draft'
      `,
      [
        payload.employeeId,
        resolved.month,
        resolved.year,
        workDays,
        presentDays,
        overtimeHours,
        lateCount,
        halfDayCount,
        monthlyBaseSalary,
        tunjanganJabatan,
        subsidi,
        bonusPerforma,
        bpjs,
        uangMakanTotal,
        payrollType === "sales" ? payload.uangTransport : 0,
        payrollType === "sales" ? payload.insentif : 0,
        overtimeBonus,
        lateDeduction,
        halfDayDeduction,
        contractCut,
        loanCut,
        diligenceCut,
        totalPotongan,
        netIncome,
      ],
    );

    const [payrollRows] = await connection.query<(RowDataPacket & { id: number })[]>(
      `
        SELECT id
        FROM payroll
        WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ?
        LIMIT 1
      `,
      [payload.employeeId, resolved.month, resolved.year],
    );

    const payrollId = payrollRows[0]?.id ?? payrollResult.insertId;

    await connection.query(
      `
        INSERT INTO payroll_employee_input (
          payroll_id,
          karyawan_id,
          payroll_type,
          gaji_pokok_per_hari,
          uang_makan_per_hari,
          subsidi,
          uang_kerajinan,
          bpjs,
          bonus_performa,
          insentif,
          uang_transport,
          override_masuk,
          override_lembur,
          override_izin,
          override_sakit,
          override_sakit_tanpa_surat,
          override_setengah_hari,
          override_kontrak,
          override_pinjaman,
          override_pinjaman_pribadi,
          override_gaji_pokok
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          payroll_type = VALUES(payroll_type),
          gaji_pokok_per_hari = VALUES(gaji_pokok_per_hari),
          uang_makan_per_hari = VALUES(uang_makan_per_hari),
          subsidi = VALUES(subsidi),
          uang_kerajinan = VALUES(uang_kerajinan),
          bpjs = VALUES(bpjs),
          bonus_performa = VALUES(bonus_performa),
          insentif = VALUES(insentif),
          uang_transport = VALUES(uang_transport),
          override_masuk = VALUES(override_masuk),
          override_lembur = VALUES(override_lembur),
          override_izin = VALUES(override_izin),
          override_sakit = VALUES(override_sakit),
          override_sakit_tanpa_surat = VALUES(override_sakit_tanpa_surat),
          override_setengah_hari = VALUES(override_setengah_hari),
          override_kontrak = VALUES(override_kontrak),
          override_pinjaman = VALUES(override_pinjaman),
          override_pinjaman_pribadi = VALUES(override_pinjaman_pribadi),
          override_gaji_pokok = VALUES(override_gaji_pokok)
      `,
      [
        payrollId,
        payload.employeeId,
        payrollType,
        gajiPerDay,
        uangMakanPerDay,
        subsidi,
        uangKerajinan,
        bpjs,
        bonusPerforma,
        payrollType === "sales" ? payload.insentif : 0,
        payrollType === "sales" ? payload.uangTransport : 0,
        payload.overrideMasuk ?? null,
        payload.overrideLembur ?? null,
        payload.overrideIzin ?? null,
        payload.overrideSakit ?? null,
        payload.overrideSakitTanpaSurat ?? null,
        payload.overrideSetengahHari ?? null,
        payload.overrideKontrak ?? null,
        payload.overridePinjaman ?? null,
        payload.overridePinjamanPribadi ?? null,
        payload.overrideGajiPokok ?? null,
      ],
    );

    await attachLoanInstallmentsToPayroll(
      payload.employeeId,
      payrollId,
      resolved.month,
      resolved.year,
      loanCut,
      connection,
    );

    await connection.commit();

    return {
      payrollId,
      periodMonth: resolved.month,
      periodYear: resolved.year,
      payrollType,
      employeeName: employee.nama,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deletePayrollById(payrollId: number) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureLoanSupportTables(connection);

    const [rows] = await connection.query<PayrollIdentityRow[]>(
      `
        SELECT p.id, p.karyawan_id, p.periode_bulan, p.periode_tahun, k.nama
        FROM payroll p
        INNER JOIN karyawan k ON k.id = p.karyawan_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [payrollId],
    );

    const payroll = rows[0];

    if (!payroll) {
      throw new Error("Data payroll tidak ditemukan.");
    }

    await detachLoanInstallmentsFromPayroll(payrollId, connection);
    await connection.query<ResultSetHeader>(`DELETE FROM payroll WHERE id = ?`, [payrollId]);

    await connection.commit();

    return {
      payrollId,
      employeeId: payroll.karyawan_id,
      employeeName: payroll.nama,
      periodMonth: payroll.periode_bulan,
      periodYear: payroll.periode_tahun,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

