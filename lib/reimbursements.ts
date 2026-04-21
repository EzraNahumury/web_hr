import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";

let reimbursementSchemaReady: Promise<void> | null = null;

export type ReimbursementStatus = "pending" | "approved" | "rejected";

export type ReimbursementItem = {
  id: number;
  employeeId: number;
  employeeName: string;
  nip: string | null;
  role: string | null;
  department: string | null;
  requestDate: string;
  expenseDate: string;
  category: string;
  description: string | null;
  amount: string;
  receiptPath: string;
  status: ReimbursementStatus;
  adminNote: string | null;
  approverName: string | null;
  approvedAt: string | null;
  createdAt: string;
};

type ReimbursementRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  nama: string;
  no_karyawan: string | null;
  jabatan: string | null;
  departemen: string | null;
  tanggal_pengajuan: string;
  tanggal_biaya: string;
  kategori: string;
  keterangan: string | null;
  nominal: string;
  nota_path: string;
  status_approval: ReimbursementStatus;
  catatan_admin: string | null;
  approver_name: string | null;
  approved_at: string | null;
  created_at: string;
};

type QueryExecutor = PoolConnection | typeof pool;

type ReimbursementAggregateRow = RowDataPacket & {
  employee_id: number;
  total_reimbursement: string | null;
};

function mapRow(row: ReimbursementRow): ReimbursementItem {
  return {
    id: row.id,
    employeeId: row.karyawan_id,
    employeeName: row.nama,
    nip: row.no_karyawan,
    role: row.jabatan,
    department: row.departemen,
    requestDate: row.tanggal_pengajuan,
    expenseDate: row.tanggal_biaya,
    category: row.kategori,
    description: row.keterangan,
    amount: row.nominal,
    receiptPath: row.nota_path,
    status: row.status_approval,
    adminNote: row.catatan_admin,
    approverName: row.approver_name,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  };
}

export async function ensureReimbursementSchema() {
  if (!reimbursementSchemaReady) {
    reimbursementSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reimbursements (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          karyawan_id BIGINT UNSIGNED NOT NULL,
          tanggal_pengajuan DATE NOT NULL,
          tanggal_biaya DATE NOT NULL,
          kategori VARCHAR(100) NOT NULL DEFAULT 'Perjalanan Dinas',
          keterangan TEXT NULL,
          nominal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          nota_path VARCHAR(500) NOT NULL,
          status_approval ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
          approved_by BIGINT UNSIGNED NULL DEFAULT NULL,
          approved_at DATETIME NULL DEFAULT NULL,
          catatan_admin VARCHAR(255) NULL DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_reimbursements_karyawan (karyawan_id),
          KEY idx_reimbursements_status (status_approval),
          KEY idx_reimbursements_tanggal_biaya (tanggal_biaya),
          CONSTRAINT fk_reimbursements_karyawan
            FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
            ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    })();
  }

  await reimbursementSchemaReady;
}

export async function createEmployeeReimbursement(payload: {
  employeeId: number;
  requestDate: string;
  expenseDate: string;
  category: string;
  description: string | null;
  amount: number;
  receiptPath: string;
}) {
  await ensureReimbursementSchema();

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO reimbursements (
        karyawan_id,
        tanggal_pengajuan,
        tanggal_biaya,
        kategori,
        keterangan,
        nominal,
        nota_path,
        status_approval
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `,
    [
      payload.employeeId,
      payload.requestDate,
      payload.expenseDate,
      payload.category,
      payload.description,
      payload.amount,
      payload.receiptPath,
    ],
  );

  return getReimbursementById(result.insertId);
}

async function listReimbursements(whereSql = "", params: Array<number | string> = []) {
  await ensureReimbursementSchema();

  const [rows] = await pool.query<ReimbursementRow[]>(
    `
      SELECT
        r.id,
        r.karyawan_id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.departemen,
        DATE_FORMAT(r.tanggal_pengajuan, '%Y-%m-%d') AS tanggal_pengajuan,
        DATE_FORMAT(r.tanggal_biaya, '%Y-%m-%d') AS tanggal_biaya,
        r.kategori,
        r.keterangan,
        r.nominal,
        r.nota_path,
        r.status_approval,
        r.catatan_admin,
        u.nama AS approver_name,
        DATE_FORMAT(r.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at,
        DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM reimbursements r
      INNER JOIN karyawan k ON k.id = r.karyawan_id
      LEFT JOIN users u ON u.id = r.approved_by
      ${whereSql}
      ORDER BY r.created_at DESC, r.id DESC
    `,
    params,
  );

  return rows.map(mapRow);
}

export async function listEmployeeReimbursements(employeeId: number) {
  return listReimbursements("WHERE r.karyawan_id = ?", [employeeId]);
}

export async function listAdminReimbursements() {
  return listReimbursements();
}

export async function getReimbursementById(id: number) {
  const rows = await listReimbursements("WHERE r.id = ?", [id]);
  return rows[0] ?? null;
}

export async function updateReimbursementApproval(payload: {
  id: number;
  adminId: number;
  status: Exclude<ReimbursementStatus, "pending">;
  note: string | null;
}) {
  await ensureReimbursementSchema();

  const [rows] = await pool.query<(RowDataPacket & { status_approval: ReimbursementStatus })[]>(
    "SELECT status_approval FROM reimbursements WHERE id = ? LIMIT 1",
    [payload.id],
  );

  const existing = rows[0];
  if (!existing) {
    throw new Error("Pengajuan reimburse tidak ditemukan.");
  }

  if (existing.status_approval !== "pending") {
    throw new Error("Pengajuan reimburse ini sudah diproses sebelumnya.");
  }

  await pool.query<ResultSetHeader>(
    `
      UPDATE reimbursements
      SET status_approval = ?,
          approved_by = ?,
          approved_at = NOW(),
          catatan_admin = ?
      WHERE id = ?
    `,
    [payload.status, payload.adminId, payload.note, payload.id],
  );

  return getReimbursementById(payload.id);
}

export async function getApprovedReimbursementTotalForPeriod(
  employeeId: number,
  startDate: string,
  endDate: string,
  connection?: QueryExecutor,
) {
  const executor = connection ?? pool;
  await ensureReimbursementSchema();

  const [rows] = await executor.query<ReimbursementAggregateRow[]>(
    `
      SELECT
        karyawan_id AS employee_id,
        COALESCE(SUM(nominal), 0) AS total_reimbursement
      FROM reimbursements
      WHERE karyawan_id = ?
        AND status_approval = 'approved'
        AND tanggal_biaya BETWEEN ? AND ?
      GROUP BY karyawan_id
    `,
    [employeeId, startDate, endDate],
  );

  return rows[0]?.total_reimbursement ?? "0";
}

export async function getApprovedReimbursementRowsForPeriod(
  employeeIds: number[],
  startDate: string,
  endDate: string,
) {
  await ensureReimbursementSchema();

  if (!employeeIds.length) {
    return [] as Array<{ employeeId: number; totalReimbursement: string }>;
  }

  const placeholders = employeeIds.map(() => "?").join(", ");
  const [rows] = await pool.query<ReimbursementAggregateRow[]>(
    `
      SELECT
        karyawan_id AS employee_id,
        COALESCE(SUM(nominal), 0) AS total_reimbursement
      FROM reimbursements
      WHERE karyawan_id IN (${placeholders})
        AND status_approval = 'approved'
        AND tanggal_biaya BETWEEN ? AND ?
      GROUP BY karyawan_id
    `,
    [...employeeIds, startDate, endDate],
  );

  return rows.map((row) => ({
    employeeId: row.employee_id,
    totalReimbursement: row.total_reimbursement ?? "0",
  }));
}
