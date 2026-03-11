import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";

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

type LoanAggregateRow = RowDataPacket & {
  angsuran_per_bulan: string | null;
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
  total_omzet: string;
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
};

export type PayrollOmzetPeriod = {
  periodMonth: number;
  periodYear: number;
  totalOmzet: number;
  bonusOmzet: number;
  isLocked: boolean;
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

export function isSalesEmployeeFromValues(role: string, division: string, subDivision?: string | null) {
  const roleText = role.trim().toLowerCase();
  const divisionText = division.trim().toLowerCase();
  const subDivisionText = (subDivision ?? "").trim().toLowerCase();

  if (["secretary", "manager", "admin", "supervisor"].some((keyword) => roleText.includes(keyword))) {
    return false;
  }

  return [roleText, divisionText, subDivisionText].some((value) =>
    ["sales", "retail", "marketplace"].some((keyword) => value.includes(keyword)),
  );
}

export async function ensurePayrollSupportTables(connection?: typeof pool) {
  const executor = connection ?? pool;

  await executor.query(`
    CREATE TABLE IF NOT EXISTS omzet_bulanan (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      periode_bulan TINYINT UNSIGNED NOT NULL,
      periode_tahun SMALLINT UNSIGNED NOT NULL,
      total_omzet DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_omzet_bulanan_periode (periode_bulan, periode_tahun)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

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

export async function getPayrollOmzetPeriod(): Promise<PayrollOmzetPeriod> {
  const period = getActivePayrollPeriod();
  await ensurePayrollSupportTables();

  const [rows] = await pool.query<OmzetMonthlyRow[]>(
    `
      SELECT id, periode_bulan, periode_tahun, total_omzet
      FROM omzet_bulanan
      WHERE periode_bulan = ? AND periode_tahun = ?
      LIMIT 1
    `,
    [period.month, period.year],
  );

  const current = rows[0];
  const totalOmzet = toNumber(current?.total_omzet);

  return {
    periodMonth: period.month,
    periodYear: period.year,
    totalOmzet,
    bonusOmzet: totalOmzet * 0.005,
    isLocked: Boolean(current),
  };
}

export async function upsertPayrollPeriodOmzet(totalOmzet: number) {
  const period = getActivePayrollPeriod();
  await ensurePayrollSupportTables();

  const [existingRows] = await pool.query<OmzetMonthlyRow[]>(
    `
      SELECT id, periode_bulan, periode_tahun, total_omzet
      FROM omzet_bulanan
      WHERE periode_bulan = ? AND periode_tahun = ?
      LIMIT 1
    `,
    [period.month, period.year],
  );

  if (existingRows[0]) {
    await pool.query<ResultSetHeader>(
      `
        UPDATE omzet_bulanan
        SET total_omzet = ?
        WHERE periode_bulan = ? AND periode_tahun = ?
      `,
      [totalOmzet, period.month, period.year],
    );
  } else {
    await pool.query<ResultSetHeader>(
      `
        INSERT INTO omzet_bulanan (periode_bulan, periode_tahun, total_omzet)
        VALUES (?, ?, ?)
      `,
      [period.month, period.year, totalOmzet],
    );
  }

  return {
    periodMonth: period.month,
    periodYear: period.year,
    totalOmzet,
    bonusOmzet: totalOmzet * 0.005,
    isLocked: true,
    isUpdate: Boolean(existingRows[0]),
  };
}

export async function upsertPayrollFromForm(payload: PayrollFormPayload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensurePayrollSupportTables(connection);

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
    const period = getActivePayrollPeriod();
    const range = getPayrollDateRange(period.month, period.year);
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
      [payload.employeeId, period.month, period.year],
    );

    const [loanRows] = await connection.query<LoanAggregateRow[]>(
      `
        SELECT angsuran_per_bulan
        FROM pinjaman
        WHERE karyawan_id = ?
          AND status_pinjaman IN ('approved', 'berjalan')
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [payload.employeeId],
    );

    const presentDays = attendance.present_count ?? 0;
    const halfDayCount = attendance.half_day_count ?? 0;
    const lateCount = attendance.late_count ?? 0;
    const overtimeHours = toNumber(overtimeRows[0]?.total_jam);
    const contractCut = toNumber(contractRows[0]?.nominal_potongan);
    const loanCut = toNumber(loanRows[0]?.angsuran_per_bulan);
    const gajiPerDay = payload.gajiPerDay;
    const monthlyBaseSalary = gajiPerDay * workDays;
    const tunjanganJabatan = payload.tunjanganJabatan;
    const subsidi = payload.subsidi;
    const uangMakanPerDay = payload.uangMakan;
    const uangMakanTotal = uangMakanPerDay * presentDays;
    const uangKerajinan = payload.uangKerajinan;
    const bpjs = payload.bpjs;
    const bonusPerforma = payrollType === "sales" ? 0 : payload.bonusPerforma;
    const diligenceAllowance = presentDays + (attendance.sick_count ?? 0) >= workDays ? uangKerajinan : 0;
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
    const totalPotongan = halfDayDeduction + lateDeduction + diligenceCut + contractCut + loanCut;
    const netIncome = totalSalary - contractCut - loanCut;

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
        period.month,
        period.year,
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
      [payload.employeeId, period.month, period.year],
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
          uang_transport
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          payroll_type = VALUES(payroll_type),
          gaji_pokok_per_hari = VALUES(gaji_pokok_per_hari),
          uang_makan_per_hari = VALUES(uang_makan_per_hari),
          subsidi = VALUES(subsidi),
          uang_kerajinan = VALUES(uang_kerajinan),
          bpjs = VALUES(bpjs),
          bonus_performa = VALUES(bonus_performa),
          insentif = VALUES(insentif),
          uang_transport = VALUES(uang_transport)
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
      ],
    );

    await connection.commit();

    return {
      payrollId,
      periodMonth: period.month,
      periodYear: period.year,
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

