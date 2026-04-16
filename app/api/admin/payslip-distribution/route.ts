import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { distributePendingPayslips } from "@/lib/hris";

export async function POST() {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await distributePendingPayslips(admin.id);

    if (result.distributed === 0) {
      return NextResponse.json({
        message: "Tidak ada slip baru untuk didistribusikan.",
        distributed: 0,
      });
    }

    return NextResponse.json({
      message: `${result.distributed} slip gaji berhasil didistribusikan ke karyawan.`,
      distributed: result.distributed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mendistribusikan slip gaji.";
    console.error("Distribute payslips error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
