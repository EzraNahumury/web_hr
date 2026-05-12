import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { cancelNationalHoliday, setNationalHoliday } from "@/lib/holidays";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { date?: unknown; description?: unknown }
    | null;

  const date = typeof body?.date === "string" ? body.date : "";
  const description = typeof body?.description === "string" ? body.description : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: "Tanggal libur tidak valid." }, { status: 400 });
  }
  if (!description.trim()) {
    return NextResponse.json({ message: "Keterangan libur wajib diisi." }, { status: 400 });
  }

  try {
    const result = await setNationalHoliday(date, description, admin.id);
    return NextResponse.json({
      message: `Libur nasional disimpan. ${result.affectedEmployees} karyawan ditandai libur (kode L).`,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan libur nasional.";
    const status = message.toLowerCase().includes("tidak valid") || message.toLowerCase().includes("wajib") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: "Tanggal libur tidak valid." }, { status: 400 });
  }

  try {
    const result = await cancelNationalHoliday(date);
    return NextResponse.json({
      message: `Libur nasional dibatalkan. ${result.affectedEmployees} absensi (kode L) dihapus.`,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membatalkan libur nasional.";
    const status = message.toLowerCase().includes("tidak valid") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
