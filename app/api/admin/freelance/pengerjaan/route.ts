import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { upsertFreelancePengerjaan } from "@/lib/payroll-freelance";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    karyawanId?: number;
    bulan?: number;
    tahun?: number;
    hargaPerPcs?: number;
    jumlahPcs?: number;
  } | null;

  if (!body?.karyawanId || !body.bulan || !body.tahun) {
    return NextResponse.json({ message: "Data tidak lengkap." }, { status: 400 });
  }

  try {
    await upsertFreelancePengerjaan(
      body.karyawanId,
      body.bulan,
      body.tahun,
      body.hargaPerPcs ?? 0,
      body.jumlahPcs ?? 0,
    );
    return NextResponse.json({ message: "Data pengerjaan berhasil disimpan." });
  } catch (error) {
    console.error("upsertFreelancePengerjaan error", error);
    return NextResponse.json({ message: "Gagal menyimpan data pengerjaan." }, { status: 500 });
  }
}
