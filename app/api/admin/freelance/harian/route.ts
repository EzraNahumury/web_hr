import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { upsertFreelanceHarian } from "@/lib/payroll-freelance";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    karyawanId?: number;
    bulan?: number;
    tahun?: number;
    hargaPerHari?: number;
  } | null;

  if (!body?.karyawanId || !body.bulan || !body.tahun) {
    return NextResponse.json({ message: "Data tidak lengkap." }, { status: 400 });
  }

  try {
    await upsertFreelanceHarian(body.karyawanId, body.bulan, body.tahun, body.hargaPerHari ?? 0);
    return NextResponse.json({ message: "Data harian berhasil disimpan." });
  } catch (error) {
    console.error("upsertFreelanceHarian error", error);
    return NextResponse.json({ message: "Gagal menyimpan data harian." }, { status: 500 });
  }
}
