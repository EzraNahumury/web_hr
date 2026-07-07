import { NextResponse } from "next/server";

import {
  getCurrentAdminSession,
  getCurrentEmployeeSession,
  getCurrentSpvSession,
} from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { listJadwalEditors, setJadwalEditor } from "@/lib/jadwal-karyawan";
import { canSetSchedule, isJadwalWhitelisted } from "@/lib/scheduler-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pengelola izin: admin, spv, atau karyawan manager/supervisor/whitelist.
// (Karyawan yang cuma DIBERI izin edit tidak boleh mengelola izin.)
async function requireAccessManager() {
  const admin = await getCurrentAdminSession();
  if (admin) return true;
  const spv = await getCurrentSpvSession();
  if (spv) return true;
  const employee = await getCurrentEmployeeSession();
  if (!employee) return false;
  const profile = await getEmployeeByUserId(employee.userId);
  if (!profile) return false;
  return canSetSchedule(profile.jabatan) || isJadwalWhitelisted(profile.nama);
}

export async function GET() {
  if (!(await requireAccessManager())) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const rows = await listJadwalEditors();
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  if (!(await requireAccessManager())) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
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
