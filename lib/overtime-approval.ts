import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { ensureOvertimeSchema } from "@/lib/overtime";

type Body = { statusApproval?: unknown; catatanAtasan?: unknown };

export async function processApprovalForAssignedApprover(
  request: Request,
  overtimeId: number,
  approverUserId: number,
) {
  if (!Number.isInteger(overtimeId) || overtimeId <= 0) {
    return NextResponse.json({ error: "ID lembur tidak valid." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const statusApproval = body?.statusApproval;
  const catatanAtasan =
    typeof body?.catatanAtasan === "string" && body.catatanAtasan.trim()
      ? body.catatanAtasan.trim()
      : null;

  if (statusApproval !== "approved" && statusApproval !== "rejected") {
    return NextResponse.json({ error: "Status approval tidak valid." }, { status: 400 });
  }

  await ensureOvertimeSchema();

  const [existingRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, status_approval, assigned_approver_user_id, approval_flow, first_approval_status
     FROM lembur WHERE id = ? LIMIT 1`,
    [overtimeId],
  );

  const existing = existingRows[0];
  if (!existing) {
    return NextResponse.json({ error: "Data lembur tidak ditemukan." }, { status: 404 });
  }

  if (existing.assigned_approver_user_id !== approverUserId) {
    return NextResponse.json(
      { error: "Pengajuan ini tidak ditujukan ke Anda." },
      { status: 403 },
    );
  }

  if (existing.status_approval !== "pending") {
    return NextResponse.json(
      { error: "Approval lembur sudah final dan tidak bisa diubah lagi." },
      { status: 409 },
    );
  }

  const isDoubleFlow = existing.approval_flow === "double";

  if (isDoubleFlow && existing.first_approval_status !== "pending") {
    return NextResponse.json(
      { error: "Approval atasan sudah diproses sebelumnya." },
      { status: 409 },
    );
  }

  if (isDoubleFlow) {
    // Double approval flow: ini stage 1 (atasan).
    // Reject → status_approval langsung "rejected" final.
    // Approve → first_approval_status="approved", status_approval TETAP pending (menunggu admin).
    if (statusApproval === "rejected") {
      await pool.query<ResultSetHeader>(
        `UPDATE lembur
         SET first_approval_status = 'rejected',
             first_approver_user_id = ?,
             first_approved_at = NOW(),
             status_approval = 'rejected',
             approved_by = ?,
             catatan_atasan = ?
         WHERE id = ?`,
        [approverUserId, approverUserId, catatanAtasan, overtimeId],
      );
    } else {
      await pool.query<ResultSetHeader>(
        `UPDATE lembur
         SET first_approval_status = 'approved',
             first_approver_user_id = ?,
             first_approved_at = NOW(),
             catatan_atasan = ?
         WHERE id = ?`,
        [approverUserId, catatanAtasan, overtimeId],
      );
    }
  } else {
    // Single flow: atasan = approver final (kalau ada). Sudah jarang case ini sejak admin-routing baru.
    await pool.query<ResultSetHeader>(
      `UPDATE lembur
       SET status_approval = ?, approved_by = ?, catatan_atasan = ?
       WHERE id = ?`,
      [statusApproval, approverUserId, catatanAtasan, overtimeId],
    );
  }

  return NextResponse.json({ success: true });
}
