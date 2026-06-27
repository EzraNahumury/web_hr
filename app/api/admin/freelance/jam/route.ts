import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { upsertFreelanceJam } from "@/lib/payroll-freelance";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    karyawanId?: number;
    bulan?: number;
    tahun?: number;
    ratePerJam?: number;
  } | null;

  if (!body?.karyawanId || !body.bulan || !body.tahun) {
    return NextResponse.json({ message: "Data tidak lengkap." }, { status: 400 });
  }

  try {
    await upsertFreelanceJam(body.karyawanId, body.bulan, body.tahun, body.ratePerJam ?? 0);
    return NextResponse.json({ message: "Rate per jam berhasil disimpan." });
  } catch (error) {
    console.error("upsertFreelanceJam error", error);
    return NextResponse.json({ message: "Gagal menyimpan rate per jam." }, { status: 500 });
  }
}
