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
    `SELECT id, status_approval, approval_flow, first_approval_status
     FROM lembur WHERE id = ? LIMIT 1`,
    [overtimeId],
  );

  const existing = existingRows[0];
  if (!existing) {
    return NextResponse.json({ error: "Data lembur tidak ditemukan." }, { status: 404 });
  }

  if (existing.status_approval !== "pending") {
    return NextResponse.json(
      { error: "Approval lembur sudah final dan tidak bisa diubah lagi." },
      { status: 409 },
    );
  }

  // Untuk double flow, admin tidak boleh approve sebelum atasan approve.
  if (existing.approval_flow === "double" && existing.first_approval_status !== "approved") {
    return NextResponse.json(
      { error: "Atasan belum menyetujui pengajuan ini. Admin tidak bisa approve sebelum atasan menyetujui." },
      { status: 409 },
    );
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

// Admin update tanggal & jam lembur (koreksi data). Total jam dihitung ulang otomatis.
export async function PUT(request: NextRequest, { params }: Params) {
  const admin = await requireAdminSession();
  void admin;
  const { id } = await params;
  const overtimeId = Number(id);

  if (!Number.isInteger(overtimeId) || overtimeId <= 0) {
    return NextResponse.json({ error: "ID lembur tidak valid." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const tanggal = typeof body?.tanggal === "string" ? body.tanggal.trim() : "";
  const jamMulai = typeof body?.jamMulai === "string" ? body.jamMulai.trim() : "";
  const jamSelesai = typeof body?.jamSelesai === "string" ? body.jamSelesai.trim() : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return NextResponse.json({ error: "Tanggal lembur tidak valid." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(jamMulai) || !/^\d{2}:\d{2}$/.test(jamSelesai)) {
    return NextResponse.json({ error: "Jam lembur tidak valid." }, { status: 400 });
  }

  const start = new Date(`${tanggal}T${jamMulai}:00`);
  const end = new Date(`${tanggal}T${jamSelesai}:00`);
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  if (!Number.isFinite(diffHours) || diffHours <= 0) {
    return NextResponse.json(
      { error: "Jam selesai harus lebih besar dari jam mulai." },
      { status: 400 },
    );
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
      SET tanggal = ?, jam_mulai = ?, jam_selesai = ?, total_jam = ?
      WHERE id = ?
    `,
    [
      tanggal,
      `${tanggal} ${jamMulai}:00`,
      `${tanggal} ${jamSelesai}:00`,
      diffHours.toFixed(2),
      overtimeId,
    ],
  );

  return NextResponse.json({ success: true });
}
