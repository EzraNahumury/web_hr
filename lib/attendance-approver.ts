import type { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";

// Validasi atasan tujuan approval absensi. Sama seperti alur lembur:
// - value "admin" => broadcast ke semua admin (assignedApproverUserId = null).
// - value angka => user id atasan (harus admin / spv / karyawan supervisor|manager aktif).
// Return { ok:true, assignedApproverUserId } atau { ok:false, error }.
export async function resolveAssignedApprover(
  raw: string | null | undefined,
): Promise<
  | { ok: true; assignedApproverUserId: number | null }
  | { ok: false; error: string }
> {
  const value = (raw ?? "").trim();
  if (!value) {
    return { ok: false, error: "Pilih atasan tujuan approval." };
  }
  if (value === "admin") {
    return { ok: true, assignedApproverUserId: null };
  }
  const userId = Number(value);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, error: "Atasan tujuan tidak valid." };
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT u.id
      FROM users u
      LEFT JOIN karyawan k ON k.user_id = u.id
      WHERE u.id = ?
        AND u.status_aktif = 1
        AND (
          u.role = 'admin'
          OR u.role = 'spv'
          OR (k.status_data = 'aktif' AND LOWER(COALESCE(k.jabatan, '')) IN ('manager', 'supervisor'))
        )
      LIMIT 1
    `,
    [userId],
  );
  if (!rows[0]) {
    return { ok: false, error: "Atasan tujuan tidak valid." };
  }
  return { ok: true, assignedApproverUserId: userId };
}
