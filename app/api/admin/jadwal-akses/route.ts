import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { listJadwalEditors, setJadwalEditor } from "@/lib/jadwal-karyawan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const rows = await listJadwalEditors();
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { karyawanId?: unknown; granted?: unknown }
    | null;
  const karyawanId = Number(body?.karyawanId);
  const granted = body?.granted === true;
  if (!Number.isInteger(karyawanId) || karyawanId <= 0) {
    return NextResponse.json({ message: "Karyawan tidak valid." }, { status: 400 });
  }
  await setJadwalEditor(karyawanId, granted);
  return NextResponse.json({
    message: granted ? "Akses Set Jadwal diberikan." : "Akses Set Jadwal dicabut.",
  });
}
