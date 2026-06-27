import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { upsertFreelanceCustomPengerjaan } from "@/lib/payroll-freelance";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    karyawanId?: number;
    itemId?: number;
    bulan?: number;
    tahun?: number;
    hargaPerPcs?: number;
    jumlahPcs?: number;
  } | null;

  if (!body?.karyawanId || !body.itemId || !body.bulan || !body.tahun) {
    return NextResponse.json({ message: "Data tidak lengkap." }, { status: 400 });
  }

  try {
    await upsertFreelanceCustomPengerjaan(
      body.karyawanId,
      body.itemId,
      body.bulan,
      body.tahun,
      body.hargaPerPcs ?? 0,
      body.jumlahPcs ?? 0,
    );
    return NextResponse.json({ message: "Data custom pengerjaan berhasil disimpan." });
  } catch (error) {
    console.error("upsertFreelanceCustomPengerjaan error", error);
    return NextResponse.json({ message: "Gagal menyimpan data custom pengerjaan." }, { status: 500 });
  }
}
