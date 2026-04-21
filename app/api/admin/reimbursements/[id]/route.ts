import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { updateReimbursementApproval } from "@/lib/reimbursements";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const reimbursementId = Number(id);
  if (!Number.isInteger(reimbursementId) || reimbursementId <= 0) {
    return NextResponse.json({ message: "ID reimburse tidak valid." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { status?: string; note?: string | null } | null;
  if (body?.status !== "approved" && body?.status !== "rejected") {
    return NextResponse.json({ message: "Status approval reimburse tidak valid." }, { status: 400 });
  }

  try {
    const reimbursement = await updateReimbursementApproval({
      id: reimbursementId,
      adminId: admin.id,
      status: body.status,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
    });
    return NextResponse.json({ message: "Approval reimburse berhasil diproses.", reimbursement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses reimburse.";
    const status = message.includes("tidak ditemukan") ? 404 : message.includes("sudah diproses") ? 409 : 500;
    return NextResponse.json({ message }, { status });
  }
}
