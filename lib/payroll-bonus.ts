import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import {
  formatPayrollPeriodLabel,
  getActivePayrollPeriod,
  type PayrollPeriodOption,
} from "@/lib/payroll-admin";

type PayrollBonusEmployeeOptionRow = RowDataPacket & {
  employee_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  departemen: string;
  unit: string | null;
};

type PayrollBonusRow = RowDataPacket & {
  id: number;
  employee_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  departemen: string;
  unit: string | null;
  periode_bulan: number;
  periode_tahun: number;
  bonus_type: string;
  nominal_bonus: string;
  catatan: string | null;
};

type PayrollBonusPeriodRow = RowDataPacket & {
  periode_bulan: number;
  periode_tahun: number;
};

export type PayrollBonusType = "sales" | "spv" | "manager" | "cs" | "host_live";

export type PayrollBonusEmployeeOption = {
  employeeId: number;
  name: string;
  role: string;
  division: string;
  department: string;
  unit: string | null;
  bonusType: PayrollBonusType;
};

export type PayrollBonusSheetRow = {
  id: number;
  employeeId: number;
  number: number;
  name: string;
  role: string;
  division: string;
  department: string;
  unit: string | null;
  bonusType: PayrollBonusType;
  bonusTypeLabel: string;
  amount: number;
  note: string | null;
};

export type PayrollBonusSheet = {
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  totalAmount: number;
  rows: PayrollBonusSheetRow[];
};

type PayrollBonusPeriodInput = {
  month?: number;
  year?: number;
};

type UpsertPayrollBonusInput = {
  employeeId: number;
  amount: number;
  note?: string | null;
  bonusType?: PayrollBonusType | null;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRole(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function inferBonusTypeFromRole(role: string | null | undefined): PayrollBonusType | null {
  const normalized = normalizeRole(role);

  if (normalized.includes("host") && normalized.includes("live")) {
    return "host_live";
  }
  if (normalized === "cs" || normalized.includes("customer service") || normalized.includes("cs ")) {
    return "cs";
  }
  if (normalized.includes("manager")) {
    return "manager";
  }
  if (
    normalized === "spv" ||
    normalized.includes("supervisor") ||
    normalized.includes("spv ")
  ) {
    return "spv";
  }
  if (normalized.includes("sales")) {
    return "sales";
  }

  return null;
}

function getBonusTypeLabel(type: PayrollBonusType) {
  switch (type) {
    case "sales":
      return "Sales";
    case "spv":
      return "SPV";
    case "manager":
      return "Manager";
    case "cs":
      return "CS";
    case "host_live":
      return "Host Live";
    default:
      return type;
  }
}

function resolvePeriod(period?: PayrollBonusPeriodInput) {
  const active = getActivePayrollPeriod();
  return {
    month: period?.month ?? active.month,
    year: period?.year ?? active.year,
  };
}

let payrollBonusTableReady: Promise<void> | null = null;

export async function ensurePayrollBonusTable() {
  if (!payrollBonusTableReady) {
    payrollBonusTableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payroll_bonus (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          karyawan_id BIGINT UNSIGNED NOT NULL,
          periode_bulan TINYINT UNSIGNED NOT NULL,
          periode_tahun SMALLINT UNSIGNED NOT NULL,
          bonus_type ENUM('sales', 'spv', 'manager', 'cs', 'host_live') NOT NULL,
          nominal_bonus DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          catatan VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_payroll_bonus_employee_period (karyawan_id, periode_bulan, periode_tahun),
          KEY idx_payroll_bonus_period (periode_tahun, periode_bulan),
          CONSTRAINT fk_payroll_bonus_employee
            FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
            ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    })();
  }

  await payrollBonusTableReady;

  try {
    await pool.query(`
      ALTER TABLE payroll_bonus
      MODIFY COLUMN bonus_type ENUM('sales', 'spv', 'manager', 'cs', 'host_live') NOT NULL
    `);
  } catch (error) {
    console.error("Migration warning payroll_bonus.bonus_type:", error);
  }
}

export async function listPayrollBonusEmployeeOptions() {
  await ensurePayrollBonusTable();
  const [rows] = await pool.query<PayrollBonusEmployeeOptionRow[]>(`
    SELECT
      k.id AS employee_id,
      k.nama,
      k.jabatan,
      k.divisi,
      k.departemen,
      k.unit
    FROM karyawan k
    WHERE k.status_data = 'aktif'
    ORDER BY k.nama ASC
  `);

  return rows
    .map((row) => {
      const bonusType = inferBonusTypeFromRole(row.jabatan);
      if (!bonusType) return null;

      return {
        employeeId: row.employee_id,
        name: row.nama,
        role: row.jabatan,
        division: row.divisi,
        department: row.departemen,
        unit: row.unit,
        bonusType,
      } satisfies PayrollBonusEmployeeOption;
    })
    .filter(Boolean) as PayrollBonusEmployeeOption[];
}

export async function listPayrollBonusSheet(period?: PayrollBonusPeriodInput): Promise<PayrollBonusSheet | null> {
  await ensurePayrollBonusTable();
  const resolved = resolvePeriod(period);

  const [rows] = await pool.query<PayrollBonusRow[]>(
    `
      SELECT
        pb.id,
        pb.karyawan_id AS employee_id,
        k.nama,
        k.jabatan,
        k.divisi,
        k.departemen,
        k.unit,
        pb.periode_bulan,
        pb.periode_tahun,
        pb.bonus_type,
        pb.nominal_bonus,
        pb.catatan
      FROM payroll_bonus pb
      INNER JOIN karyawan k ON k.id = pb.karyawan_id
      WHERE pb.periode_bulan = ? AND pb.periode_tahun = ?
      ORDER BY k.nama ASC
    `,
    [resolved.month, resolved.year],
  );

  if (!rows.length) {
    return {
      periodMonth: resolved.month,
      periodYear: resolved.year,
      periodLabel: formatPayrollPeriodLabel(resolved.month, resolved.year),
      totalAmount: 0,
      rows: [],
    };
  }

  const mappedRows = rows.map<PayrollBonusSheetRow>((row, index) => ({
    id: row.id,
    employeeId: row.employee_id,
    number: index + 1,
    name: row.nama,
    role: row.jabatan,
    division: row.divisi,
    department: row.departemen,
    unit: row.unit,
    bonusType: row.bonus_type as PayrollBonusType,
    bonusTypeLabel: getBonusTypeLabel(row.bonus_type as PayrollBonusType),
    amount: toNumber(row.nominal_bonus),
    note: row.catatan,
  }));

  return {
    periodMonth: resolved.month,
    periodYear: resolved.year,
    periodLabel: formatPayrollPeriodLabel(resolved.month, resolved.year),
    totalAmount: mappedRows.reduce((sum, row) => sum + row.amount, 0),
    rows: mappedRows,
  };
}

export async function listPayrollBonusPeriods(): Promise<PayrollPeriodOption[]> {
  await ensurePayrollBonusTable();
  const [rows] = await pool.query<PayrollBonusPeriodRow[]>(`
    SELECT DISTINCT periode_bulan, periode_tahun
    FROM payroll_bonus
    ORDER BY periode_tahun DESC, periode_bulan DESC
  `);

  if (!rows.length) {
    const active = getActivePayrollPeriod();
    return [
      {
        month: active.month,
        year: active.year,
        label: formatPayrollPeriodLabel(active.month, active.year),
      },
    ];
  }

  return rows.map((row) => ({
    month: row.periode_bulan,
    year: row.periode_tahun,
    label: formatPayrollPeriodLabel(row.periode_bulan, row.periode_tahun),
  }));
}

export async function upsertPayrollBonus(input: UpsertPayrollBonusInput, period?: PayrollBonusPeriodInput) {
  await ensurePayrollBonusTable();
  const resolved = resolvePeriod(period);
  const note = (input.note ?? "").trim();

  const [employeeRows] = await pool.query<(RowDataPacket & { nama: string; jabatan: string })[]>(
    `
      SELECT nama, jabatan
      FROM karyawan
      WHERE id = ?
      LIMIT 1
    `,
    [input.employeeId],
  );
  const employee = employeeRows[0];
  if (!employee) {
    throw new Error("Karyawan tidak ditemukan.");
  }

  const inferredType = inferBonusTypeFromRole(employee.jabatan);
  const bonusType = input.bonusType ?? inferredType;
  if (!bonusType) {
    throw new Error("Karyawan ini tidak termasuk role payroll bonus.");
  }

  await pool.query<ResultSetHeader>(
    `
      INSERT INTO payroll_bonus (
        karyawan_id,
        periode_bulan,
        periode_tahun,
        bonus_type,
        nominal_bonus,
        catatan
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        bonus_type = VALUES(bonus_type),
        nominal_bonus = VALUES(nominal_bonus),
        catatan = VALUES(catatan)
    `,
    [
      input.employeeId,
      resolved.month,
      resolved.year,
      bonusType,
      input.amount,
      note || null,
    ],
  );

  const [savedRows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `
      SELECT id
      FROM payroll_bonus
      WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ?
      LIMIT 1
    `,
    [input.employeeId, resolved.month, resolved.year],
  );

  return {
    id: savedRows[0]?.id ?? null,
    periodMonth: resolved.month,
    periodYear: resolved.year,
    employeeName: employee.nama,
    bonusType,
  };
}

export async function deletePayrollBonusById(id: number) {
  await ensurePayrollBonusTable();
  const [rows] = await pool.query<(RowDataPacket & {
    id: number;
    employee_id: number;
    periode_bulan: number;
    periode_tahun: number;
    nama: string;
  })[]>(
    `
      SELECT
        pb.id,
        pb.karyawan_id AS employee_id,
        pb.periode_bulan,
        pb.periode_tahun,
        k.nama
      FROM payroll_bonus pb
      INNER JOIN karyawan k ON k.id = pb.karyawan_id
      WHERE pb.id = ?
      LIMIT 1
    `,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Data payroll bonus tidak ditemukan.");
  }

  await pool.query<ResultSetHeader>(`DELETE FROM payroll_bonus WHERE id = ?`, [id]);

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.nama,
    periodMonth: row.periode_bulan,
    periodYear: row.periode_tahun,
  };
}
