import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  addAttendanceCode,
  deleteAttendanceCode,
  listAttendanceCodes,
  updateAttendanceCode,
} from "@/lib/attendance-codes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      id?: unknown;
      code?: unknown;
      label?: unknown;
      status?: unknown;
    };

    const label = typeof body.label === "string" ? body.label : "";
    const status = typeof body.status === "string" ? body.status : "";

    if (body.action === "add") {
      const code = typeof body.code === "string" ? body.code : "";
      await addAttendanceCode(code, label, status);
    } else if (body.action === "update") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ message: "Item tidak valid." }, { status: 400 });
      }
      await updateAttendanceCode(id, label, status);
    } else if (body.action === "delete") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ message: "Item tidak valid." }, { status: 400 });
      }
      await deleteAttendanceCode(id);
    } else {
      return NextResponse.json({ message: "Aksi tidak dikenal." }, { status: 400 });
    }

    const items = await listAttendanceCodes();
    return NextResponse.json({ message: "Kode absensi berhasil diperbarui.", items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan kode absensi.";
    console.error("Attendance code error", error);
    const lower = message.toLowerCase();
    const status =
      lower.includes("kosong") ||
      lower.includes("panjang") ||
      lower.includes("sudah ada") ||
      lower.includes("tidak valid") ||
      lower.includes("tidak ditemukan")
        ? 400
        : 500;
    return NextResponse.json({ message }, { status });
  }
}
