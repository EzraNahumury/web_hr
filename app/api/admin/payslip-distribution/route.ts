import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { distributePendingPayslips, undoPayslipDistribution } from "@/lib/hris";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { payrollIds?: unknown };
    const rawIds = Array.isArray(body.payrollIds) ? body.payrollIds : [];
    const payrollIds = rawIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (payrollIds.length === 0) {
      return NextResponse.json(
        { message: "Pilih minimal satu karyawan untuk didistribusikan." },
        { status: 400 },
      );
    }

    const result = await distributePendingPayslips(admin.id, payrollIds);

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

export async function DELETE(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { logId?: unknown; logIds?: unknown };
    const rawIds = Array.isArray(body.logIds) ? body.logIds : body.logId != null ? [body.logId] : [];
    const logIds = rawIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    if (logIds.length === 0) {
      return NextResponse.json({ message: "Pilih minimal satu slip untuk dibatalkan." }, { status: 400 });
    }

    const result = await undoPayslipDistribution(logIds);
    return NextResponse.json({
      message: `${result.undone} distribusi slip berhasil dibatalkan.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membatalkan distribusi slip.";
    console.error("Undo distribute payslip error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
