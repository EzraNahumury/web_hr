import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { updateBusinessTripApproval } from "@/lib/business-trips";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const businessTripId = Number(id);
  if (!Number.isInteger(businessTripId) || businessTripId <= 0) {
    return NextResponse.json({ message: "ID perjalanan dinas tidak valid." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { status?: string; note?: string | null }
    | null;
  if (body?.status !== "approved" && body?.status !== "rejected") {
    return NextResponse.json({ message: "Status approval perjalanan dinas tidak valid." }, { status: 400 });
  }

  try {
    const businessTrip = await updateBusinessTripApproval({
      id: businessTripId,
      adminId: admin.id,
      status: body.status,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
    });

    return NextResponse.json({
      message:
        body.status === "approved"
          ? "Perjalanan dinas berhasil di-approve dan absensi otomatis diisi hadir (tanggal mulai s/d tanggal selesai)."
          : "Pengajuan perjalanan dinas berhasil di-reject.",
      businessTrip,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses perjalanan dinas.";
    const status = message.includes("tidak ditemukan") ? 404 : message.includes("sudah diproses") ? 409 : 500;
    return NextResponse.json({ message }, { status });
  }
}
