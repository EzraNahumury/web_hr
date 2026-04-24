import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { upsertPayrollBonus } from "@/lib/payroll-bonus";

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseAmount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const month = parsePositiveInt(body.month);
    const year = parsePositiveInt(body.year);
    const employeeId = parsePositiveInt(body.employeeId);
    const amount = parseAmount(body.amount);
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!month || !year || month > 12) {
      return NextResponse.json({ message: "Periode payroll bonus tidak valid." }, { status: 400 });
    }
    if (!employeeId) {
      return NextResponse.json({ message: "Karyawan wajib dipilih." }, { status: 400 });
    }
    if (amount === null) {
      return NextResponse.json(
        { message: "Nominal bonus wajib berupa angka valid dan tidak boleh negatif." },
        { status: 400 },
      );
    }

    const saved = await upsertPayrollBonus(
      {
        employeeId,
        amount,
        note: note || null,
      },
      { month, year },
    );

    return NextResponse.json({
      message: `Payroll bonus ${saved.employeeName} untuk periode ${saved.periodMonth}/${saved.periodYear} berhasil disimpan.`,
      saved,
    });
  } catch (error) {
    console.error("Create payroll bonus error", error);
    const message = error instanceof Error ? error.message : "Gagal menyimpan payroll bonus.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
