import type { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";

let overtimeSchemaReady: Promise<void> | null = null;

export async function ensureOvertimeSchema() {
  if (!overtimeSchemaReady) {
    overtimeSchemaReady = (async () => {
      try {
        await pool.query(
          `ALTER TABLE lembur
           ADD COLUMN assigned_approver_user_id BIGINT UNSIGNED NULL AFTER catatan_atasan`,
        );
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== "ER_DUP_FIELDNAME") {
          console.error("Migration warning lembur.assigned_approver_user_id:", error);
        }
      }
      try {
        await pool.query(
          `ALTER TABLE lembur
           ADD KEY idx_lembur_assigned_approver (assigned_approver_user_id)`,
        );
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== "ER_DUP_KEYNAME") {
          console.error("Migration warning lembur idx_lembur_assigned_approver:", error);
        }
      }
      try {
        await pool.query(
          `ALTER TABLE lembur
           ADD COLUMN catatan_karyawan TEXT NULL AFTER assigned_approver_user_id`,
        );
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== "ER_DUP_FIELDNAME") {
          console.error("Migration warning lembur.catatan_karyawan:", error);
        }
      }

      const extraColumns: Array<{ name: string; def: string }> = [
        { name: "jenis_pekerjaan", def: "TEXT NULL" },
        { name: "deadline", def: "DATE NULL" },
        { name: "nama_order", def: "VARCHAR(255) NULL" },
        { name: "jumlah_qty", def: "INT UNSIGNED NULL" },
        { name: "target_sebelum_lembur", def: "INT UNSIGNED NULL" },
        { name: "target_setelah_lembur", def: "INT UNSIGNED NULL" },
        { name: "approval_flow", def: "VARCHAR(10) NOT NULL DEFAULT 'single'" },
        { name: "first_approval_status", def: "VARCHAR(10) NULL" },
        { name: "first_approver_user_id", def: "BIGINT UNSIGNED NULL" },
        { name: "first_approved_at", def: "DATETIME NULL" },
      ];
      for (const col of extraColumns) {
        try {
          await pool.query(`ALTER TABLE lembur ADD COLUMN ${col.name} ${col.def}`);
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code !== "ER_DUP_FIELDNAME") {
            console.error(`Migration warning lembur.${col.name}:`, error);
          }
        }
      }
    })();
  }
  await overtimeSchemaReady;
}

export type EligibleApprover = {
  userId: number;
  name: string;
  role: string;
  source: "spv" | "karyawan" | "admin";
};

type ApproverRow = RowDataPacket & {
  user_id: number;
  nama: string;
  role: string;
  source: "spv" | "karyawan" | "admin";
};

export async function listEligibleApprovers(submitterRole?: string | null): Promise<EligibleApprover[]> {
  await ensureOvertimeSchema();

  const normalized = (submitterRole ?? "").trim().toLowerCase();
  const isSpvSubmitter = normalized === "supervisor" || normalized === "spv";
  const isManagerSubmitter = normalized === "manager";

  const adminSelect = `
    SELECT
      u.id AS user_id,
      u.nama,
      'Admin' AS role,
      'admin' AS source
    FROM users u
    WHERE u.role = 'admin' AND u.status_aktif = 1
  `;

  if (isManagerSubmitter) {
    // Manager hanya ke Admin
    const [rows] = await pool.query<ApproverRow[]>(`${adminSelect} ORDER BY nama ASC`);
    return rows.map((row) => ({
      userId: row.user_id,
      name: row.nama,
      role: row.role,
      source: row.source,
    }));
  }

  if (isSpvSubmitter) {
    // Supervisor ajukan ke Manager atau Admin
    const [rows] = await pool.query<ApproverRow[]>(
      `
        SELECT
          u.id AS user_id,
          u.nama,
          k.jabatan AS role,
          'karyawan' AS source
        FROM karyawan k
        INNER JOIN users u ON u.id = k.user_id
        WHERE k.status_data = 'aktif'
          AND u.status_aktif = 1
          AND LOWER(COALESCE(k.jabatan, '')) = 'manager'

        UNION ALL

        ${adminSelect}

        ORDER BY nama ASC
      `,
    );
    return rows.map((row) => ({
      userId: row.user_id,
      name: row.nama,
      role: row.role,
      source: row.source,
    }));
  }

  // Staff ajukan ke SPV, Supervisor, atau Admin
  const [rows] = await pool.query<ApproverRow[]>(
    `
      SELECT
        u.id AS user_id,
        u.nama,
        'SPV' AS role,
        'spv' AS source
      FROM users u
      WHERE u.role = 'spv' AND u.status_aktif = 1

      UNION ALL

      SELECT
        u.id AS user_id,
        u.nama,
        k.jabatan AS role,
        'karyawan' AS source
      FROM karyawan k
      INNER JOIN users u ON u.id = k.user_id
      WHERE k.status_data = 'aktif'
        AND u.status_aktif = 1
        AND LOWER(COALESCE(k.jabatan, '')) = 'supervisor'

      UNION ALL

      ${adminSelect}

      ORDER BY nama ASC
    `,
  );
  return rows.map((row) => ({
    userId: row.user_id,
    name: row.nama,
    role: row.role,
    source: row.source,
  }));
}

type OvertimeApprovalRow = RowDataPacket & {
  id: number;
  nama: string;
  divisi: string | null;
  tanggal: string;
  tanggal_iso: string;
  jam_mulai: string;
  jam_selesai: string;
  total_jam: string;
  bukti_lembur: string | null;
  status_approval: "pending" | "approved" | "rejected";
  approver_name: string | null;
  assigned_approver_user_id: number | null;
  assigned_approver_name: string | null;
  catatan_atasan: string | null;
  catatan_karyawan: string | null;
  jenis_pekerjaan: string | null;
  deadline: string | null;
  nama_order: string | null;
  jumlah_qty: number | null;
  target_sebelum_lembur: number | null;
  target_setelah_lembur: number | null;
  approval_flow: "single" | "double";
  first_approval_status: "pending" | "approved" | "rejected" | null;
  first_approver_user_id: number | null;
  first_approver_name: string | null;
  first_approved_at: string | null;
};

const overtimeListQuery = `
  SELECT
    l.id,
    k.nama,
    k.divisi,
    DATE_FORMAT(l.tanggal, '%d %b %Y') AS tanggal,
    DATE_FORMAT(l.tanggal, '%Y-%m-%d') AS tanggal_iso,
    DATE_FORMAT(l.jam_mulai, '%H:%i') AS jam_mulai,
    DATE_FORMAT(l.jam_selesai, '%H:%i') AS jam_selesai,
    l.total_jam,
    l.bukti_lembur,
    l.status_approval,
    approver.nama AS approver_name,
    l.assigned_approver_user_id,
    assigned.nama AS assigned_approver_name,
    l.catatan_atasan,
    l.catatan_karyawan,
    l.jenis_pekerjaan,
    DATE_FORMAT(l.deadline, '%Y-%m-%d') AS deadline,
    l.nama_order,
    l.jumlah_qty,
    l.target_sebelum_lembur,
    l.target_setelah_lembur,
    l.approval_flow,
    l.first_approval_status,
    l.first_approver_user_id,
    first_app.nama AS first_approver_name,
    DATE_FORMAT(l.first_approved_at, '%d %b %Y %H:%i') AS first_approved_at
  FROM lembur l
  INNER JOIN karyawan k ON k.id = l.karyawan_id
  LEFT JOIN users approver ON approver.id = l.approved_by
  LEFT JOIN users assigned ON assigned.id = l.assigned_approver_user_id
  LEFT JOIN users first_app ON first_app.id = l.first_approver_user_id
`;

export async function listOvertimeForApprover(approverUserId: number) {
  await ensureOvertimeSchema();
  const [rows] = await pool.query<OvertimeApprovalRow[]>(
    `${overtimeListQuery}
     WHERE l.assigned_approver_user_id = ?
     ORDER BY l.tanggal DESC, l.id DESC`,
    [approverUserId],
  );
  return rows;
}

export async function listOvertimeAll() {
  await ensureOvertimeSchema();
  const [rows] = await pool.query<OvertimeApprovalRow[]>(
    `${overtimeListQuery} ORDER BY l.tanggal DESC, l.id DESC`,
  );
  return rows;
}

export async function getEmployeeOvertimeList(employeeId: number) {
  await ensureOvertimeSchema();
  const [rows] = await pool.query<OvertimeApprovalRow[]>(
    `${overtimeListQuery}
     WHERE l.karyawan_id = ?
     ORDER BY l.tanggal DESC, l.id DESC`,
    [employeeId],
  );
  return rows;
}

export function shouldRouteToAdmin(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase() === "manager";
}
