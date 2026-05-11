import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { createEmployeeLoanRequest, listAdminLoans } from "@/lib/loans";

function parsePositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseSqlDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export async function GET() {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const rows = await listAdminLoans();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("List admin loans error", error);
    return NextResponse.json({ message: "Gagal memuat data pinjaman." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const employeeId = parsePositiveInt(body.employeeId);
    const totalLoan = parsePositiveNumber(body.totalLoan);
    const installmentCount = parsePositiveInt(body.installmentCount);
    const requestDate = parseSqlDate(body.requestDate);

    if (!employeeId || !totalLoan || !installmentCount || !requestDate) {
      return NextResponse.json(
        { message: "Karyawan, jumlah pinjaman, jumlah angsuran, dan tanggal pengajuan wajib valid." },
        { status: 400 },
      );
    }

    const loan = await createEmployeeLoanRequest({
      employeeId,
      totalLoan,
      installmentCount,
      requestDate,
    });

    return NextResponse.json(
      {
        message: "Pengajuan pinjaman berhasil dibuat. Klik Approve untuk memproses.",
        loan,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat pengajuan pinjaman.";
    console.error("Admin create loan error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
