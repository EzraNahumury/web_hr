import { NextResponse } from "next/server";

import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { createEmployeeLoanRequest } from "@/lib/loans";

function parsePositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseSqlDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export async function POST(request: Request) {
  const session = await getCurrentEmployeeSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return NextResponse.json({ message: "Data karyawan tidak ditemukan." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const totalLoan = parsePositiveNumber(body.totalLoan);
    const installmentCount = parsePositiveInt(body.installmentCount);
    const requestDate = parseSqlDate(body.requestDate);

    if (!totalLoan || !installmentCount || !requestDate) {
      return NextResponse.json(
        { message: "Jumlah pinjaman, jumlah angsuran, dan tanggal pengajuan wajib valid." },
        { status: 400 },
      );
    }

    const loan = await createEmployeeLoanRequest({
      employeeId: employee.id,
      totalLoan,
      installmentCount,
      requestDate,
    });

    return NextResponse.json(
      {
        message: "Pengajuan pinjaman berhasil dikirim dan menunggu approval admin.",
        loan,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim pengajuan pinjaman.";
    console.error("Create employee loan request error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
