import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { setAttendanceCodeForDate } from "@/lib/hris";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { employeeId?: unknown; date?: unknown; code?: unknown }
    | null;

  const employeeId = Number(body?.employeeId);
  const date = typeof body?.date === "string" ? body.date : "";
  const code = typeof body?.code === "string" ? body.code.toUpperCase() : "";

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ message: "Karyawan tidak valid." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: "Tanggal absensi tidak valid." }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ message: "Kode absensi wajib diisi." }, { status: 400 });
  }

  try {
    const result = await setAttendanceCodeForDate(employeeId, date, code);
    return NextResponse.json({
      message: "Kode absensi berhasil diperbarui.",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui kode absensi.";
    const status = message.toLowerCase().includes("tidak valid") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
