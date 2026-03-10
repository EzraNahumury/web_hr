import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { requireAdminSession } from "@/lib/auth";
import { pool } from "@/lib/db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await requireAdminSession();
  const { id } = await params;
  const overtimeId = Number(id);

  if (!Number.isInteger(overtimeId) || overtimeId <= 0) {
    return NextResponse.json({ error: "ID lembur tidak valid." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const statusApproval = body?.statusApproval;
  const catatanAtasan =
    typeof body?.catatanAtasan === "string" && body.catatanAtasan.trim()
      ? body.catatanAtasan.trim()
      : null;

  if (statusApproval !== "approved" && statusApproval !== "rejected") {
    return NextResponse.json({ error: "Status approval tidak valid." }, { status: 400 });
  }

  const [existingRows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM lembur WHERE id = ? LIMIT 1",
    [overtimeId],
  );

  if (!existingRows[0]) {
    return NextResponse.json({ error: "Data lembur tidak ditemukan." }, { status: 404 });
  }

  await pool.query<ResultSetHeader>(
    `
      UPDATE lembur
      SET status_approval = ?, approved_by = ?, catatan_atasan = ?
      WHERE id = ?
    `,
    [statusApproval, admin.id, catatanAtasan, overtimeId],
  );

  return NextResponse.json({ success: true });
}
