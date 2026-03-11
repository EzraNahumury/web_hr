import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { deletePayrollById } from "@/lib/payroll-admin";

function parsePayrollId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const resolvedParams = await params;
  const payrollId = parsePayrollId(resolvedParams.id);

  if (!payrollId) {
    return NextResponse.json({ message: "ID payroll tidak valid." }, { status: 400 });
  }

  try {
    const deleted = await deletePayrollById(payrollId);
    return NextResponse.json({
      message: `Payroll ${deleted.employeeName} periode ${deleted.periodMonth}/${deleted.periodYear} berhasil dihapus.`,
      deleted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus payroll.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
