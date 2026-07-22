import { NextResponse } from "next/server";

import { getCurrentAdminSession, isHrdSuperEditor } from "@/lib/auth";
import { recoverAttendance } from "@/lib/attendance";
import { isEmployeeInHrd } from "@/lib/employees";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { employeeId?: unknown; date?: unknown }
    | null;

  const employeeId = Number(body?.employeeId);
  const date = typeof body?.date === "string" ? body.date : "";

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ message: "Karyawan tidak valid." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: "Tanggal absensi tidak valid." }, { status: 400 });
  }

  // Data karyawan HRD hanya bisa dipulihkan admin berwenang (super-editor).
  if (!isHrdSuperEditor(admin.email) && (await isEmployeeInHrd(employeeId))) {
    return NextResponse.json(
      { message: "Data karyawan HRD hanya bisa diubah oleh admin yang berwenang." },
      { status: 403 },
    );
  }

  try {
    await recoverAttendance(employeeId, date);
    return NextResponse.json({ message: "Absensi karyawan berhasil dipulihkan. Karyawan bisa absen kembali." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memulihkan absensi.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
