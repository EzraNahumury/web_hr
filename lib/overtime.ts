import type { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { canSetSchedule } from "@/lib/scheduler-roles";

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
    })();
  }
  await overtimeSchemaReady;
}

export type EligibleApprover = {
  userId: number;
  name: string;
  role: string;
  source: "spv" | "karyawan";
};

type ApproverRow = RowDataPacket & {
  user_id: number;
  nama: string;
  role: string;
  source: "spv" | "karyawan";
};

export async function listEligibleApprovers(): Promise<EligibleApprover[]> {
  await ensureOvertimeSchema();
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
        AND LOWER(COALESCE(k.jabatan, '')) IN ('manager', 'supervisor')

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
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  total_jam: string;
  bukti_lembur: string | null;
  status_approval: "pending" | "approved" | "rejected";
  approver_name: string | null;
  assigned_approver_user_id: number | null;
  assigned_approver_name: string | null;
  catatan_atasan: string | null;
};

const overtimeListQuery = `
  SELECT
    l.id,
    k.nama,
    DATE_FORMAT(l.tanggal, '%d %b %Y') AS tanggal,
    DATE_FORMAT(l.jam_mulai, '%H:%i') AS jam_mulai,
    DATE_FORMAT(l.jam_selesai, '%H:%i') AS jam_selesai,
    l.total_jam,
    l.bukti_lembur,
    l.status_approval,
    approver.nama AS approver_name,
    l.assigned_approver_user_id,
    assigned.nama AS assigned_approver_name,
    l.catatan_atasan
  FROM lembur l
  INNER JOIN karyawan k ON k.id = l.karyawan_id
  LEFT JOIN users approver ON approver.id = l.approved_by
  LEFT JOIN users assigned ON assigned.id = l.assigned_approver_user_id
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
  return canSetSchedule(role);
}
