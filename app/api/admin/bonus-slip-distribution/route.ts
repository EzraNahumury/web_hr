import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { distributeBonusSlips } from "@/lib/bonus-slip";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { payrollBonusIds?: unknown };
    const rawIds = Array.isArray(body.payrollBonusIds) ? body.payrollBonusIds : [];
    const payrollBonusIds = rawIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (payrollBonusIds.length === 0) {
      return NextResponse.json(
        { message: "Pilih minimal satu karyawan untuk didistribusikan." },
        { status: 400 },
      );
    }

    const result = await distributeBonusSlips(admin.id, payrollBonusIds);

    if (result.distributed === 0) {
      return NextResponse.json({
        message: "Tidak ada slip bonus baru untuk didistribusikan.",
        distributed: 0,
      });
    }

    return NextResponse.json({
      message: `${result.distributed} slip bonus berhasil didistribusikan ke karyawan.`,
      distributed: result.distributed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mendistribusikan slip bonus.";
    console.error("Distribute bonus slips error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
