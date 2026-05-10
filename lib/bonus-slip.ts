import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import {
  ensurePayrollBonusTable,
  type PayrollBonusType,
} from "@/lib/payroll-bonus";

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

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type BonusSlipDataRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  departemen: string;
  unit: string | null;
  bank: string | null;
  no_rekening: string | null;
  bonus_type: PayrollBonusType;
  nominal_bonus: string;
  catatan: string | null;
};

export type BonusSlipDataItem = {
  id: number;
  employeeId: number;
  name: string;
  role: string;
  division: string;
  department: string;
  unit: string | null;
  bank: string;
  accountNumber: string;
  bonusType: PayrollBonusType;
  bonusTypeLabel: string;
  amount: number;
  note: string | null;
};

export async function listBonusSlipsForPeriod(month: number, year: number): Promise<BonusSlipDataItem[]> {
  await ensureBonusSlipTables();
  const [rows] = await pool.query<BonusSlipDataRow[]>(
    `
      SELECT
        pb.id,
        pb.karyawan_id,
        k.nama,
        k.jabatan,
        k.divisi,
        k.departemen,
        k.unit,
        k.bank,
        k.no_rekening,
        pb.bonus_type,
        pb.nominal_bonus,
        pb.catatan
      FROM payroll_bonus pb
      INNER JOIN karyawan k ON k.id = pb.karyawan_id
      WHERE pb.periode_bulan = ? AND pb.periode_tahun = ?
      ORDER BY k.nama ASC
    `,
    [month, year],
  );

  return rows.map<BonusSlipDataItem>((row) => ({
    id: row.id,
    employeeId: row.karyawan_id,
    name: row.nama,
    role: row.jabatan ?? "-",
    division: row.divisi ?? "-",
    department: row.departemen ?? "-",
    unit: row.unit,
    bank: row.bank ?? "-",
    accountNumber: row.no_rekening ?? "-",
    bonusType: row.bonus_type,
    bonusTypeLabel: getBonusTypeLabel(row.bonus_type),
    amount: toNumber(row.nominal_bonus),
    note: row.catatan,
  }));
}

let bonusSlipTablesReady: Promise<void> | null = null;

export async function ensureBonusSlipTables() {
  await ensurePayrollBonusTable();

  if (!bonusSlipTablesReady) {
    bonusSlipTablesReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS slip_bonus (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          payroll_bonus_id BIGINT UNSIGNED NOT NULL,
          nomor_slip VARCHAR(80) NOT NULL,
          status_distribusi ENUM('draft', 'didistribusikan', 'dibaca') NOT NULL DEFAULT 'draft',
          tanggal_distribusi DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_slip_bonus_payroll_bonus (payroll_bonus_id),
          KEY idx_slip_bonus_status (status_distribusi),
          CONSTRAINT fk_slip_bonus_payroll_bonus
            FOREIGN KEY (payroll_bonus_id) REFERENCES payroll_bonus (id)
            ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS log_distribusi_slip_bonus (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          slip_bonus_id BIGINT UNSIGNED NOT NULL,
          karyawan_id BIGINT UNSIGNED NOT NULL,
          didistribusikan_oleh BIGINT UNSIGNED NOT NULL,
          tanggal_distribusi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          status_baca TINYINT UNSIGNED NOT NULL DEFAULT 0,
          PRIMARY KEY (id),
          KEY idx_log_slip_bonus_slip (slip_bonus_id),
          KEY idx_log_slip_bonus_karyawan (karyawan_id),
          CONSTRAINT fk_log_slip_bonus_slip
            FOREIGN KEY (slip_bonus_id) REFERENCES slip_bonus (id)
            ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT fk_log_slip_bonus_karyawan
            FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
            ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT fk_log_slip_bonus_user
            FOREIGN KEY (didistribusikan_oleh) REFERENCES users (id)
            ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    })();
  }

  await bonusSlipTablesReady;
}

type PendingBonusRow = RowDataPacket & {
  payroll_bonus_id: number;
  karyawan_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  periode_bulan: number;
  periode_tahun: number;
  periode_label: string;
  bonus_type: string;
  nominal_bonus: string;
};

export async function listPendingBonusSlips() {
  await ensureBonusSlipTables();
  const [rows] = await pool.query<PendingBonusRow[]>(
    `
      SELECT
        pb.id AS payroll_bonus_id,
        pb.karyawan_id,
        k.nama,
        k.jabatan,
        k.divisi,
        pb.periode_bulan,
        pb.periode_tahun,
        CONCAT(pb.periode_bulan, '/', pb.periode_tahun) AS periode_label,
        pb.bonus_type,
        pb.nominal_bonus
      FROM payroll_bonus pb
      INNER JOIN karyawan k ON k.id = pb.karyawan_id
      LEFT JOIN slip_bonus sb ON sb.payroll_bonus_id = pb.id
      WHERE sb.id IS NULL OR sb.status_distribusi = 'draft'
      ORDER BY pb.periode_tahun DESC, pb.periode_bulan DESC, k.nama ASC
    `,
  );
  return rows;
}

type DistributedBonusRow = RowDataPacket & {
  id: number;
  nomor_slip: string;
  nama: string;
  tanggal_distribusi: string;
  didistribusikan_oleh_nama: string;
  status_baca: number;
  status_distribusi: string;
};

export async function listBonusSlipDistribution() {
  await ensureBonusSlipTables();
  const [rows] = await pool.query<DistributedBonusRow[]>(
    `
      SELECT
        ldsb.id,
        sb.nomor_slip,
        k.nama,
        DATE_FORMAT(ldsb.tanggal_distribusi, '%d %b %Y %H:%i') AS tanggal_distribusi,
        u.nama AS didistribusikan_oleh_nama,
        ldsb.status_baca,
        sb.status_distribusi
      FROM log_distribusi_slip_bonus ldsb
      INNER JOIN slip_bonus sb ON sb.id = ldsb.slip_bonus_id
      INNER JOIN karyawan k ON k.id = ldsb.karyawan_id
      INNER JOIN users u ON u.id = ldsb.didistribusikan_oleh
      ORDER BY ldsb.tanggal_distribusi DESC
    `,
  );
  return rows;
}

type PendingBonusSlipRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
};

export async function distributeBonusSlips(adminUserId: number, payrollBonusIds: number[]) {
  await ensureBonusSlipTables();
  if (payrollBonusIds.length === 0) {
    return { distributed: 0 };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        INSERT INTO slip_bonus (payroll_bonus_id, nomor_slip, status_distribusi, created_at)
        SELECT
          pb.id,
          CONCAT('SLB-', LPAD(pb.periode_bulan, 2, '0'), pb.periode_tahun, '-', pb.karyawan_id),
          'draft',
          NOW()
        FROM payroll_bonus pb
        LEFT JOIN slip_bonus sb ON sb.payroll_bonus_id = pb.id
        WHERE sb.id IS NULL AND pb.id IN (?)
      `,
      [payrollBonusIds],
    );

    const [pendingRows] = await connection.query<PendingBonusSlipRow[]>(
      `
        SELECT sb.id, pb.karyawan_id
        FROM slip_bonus sb
        INNER JOIN payroll_bonus pb ON pb.id = sb.payroll_bonus_id
        WHERE sb.status_distribusi = 'draft' AND pb.id IN (?)
      `,
      [payrollBonusIds],
    );

    if (pendingRows.length === 0) {
      await connection.commit();
      return { distributed: 0 };
    }

    const ids = pendingRows.map((row) => row.id);
    await connection.query(
      `UPDATE slip_bonus SET status_distribusi = 'didistribusikan', tanggal_distribusi = NOW() WHERE id IN (?)`,
      [ids],
    );

    const logValues = pendingRows.map((row) => [row.id, row.karyawan_id, adminUserId, new Date(), 0]);
    await connection.query<ResultSetHeader>(
      `
        INSERT INTO log_distribusi_slip_bonus
          (slip_bonus_id, karyawan_id, didistribusikan_oleh, tanggal_distribusi, status_baca)
        VALUES ?
      `,
      [logValues],
    );

    await connection.commit();
    return { distributed: pendingRows.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
