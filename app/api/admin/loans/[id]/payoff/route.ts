import { NextRequest, NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { payoffLoanEarly } from "@/lib/loans";

function parseLoanId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getErrorStatus(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("tidak ditemukan")) return 404;
  if (lower.includes("tidak valid") || lower.includes("tidak bisa") || lower.includes("sudah lunas") || lower.includes("tidak ada")) return 400;
  return 500;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const resolvedParams = await params;
  const loanId = parseLoanId(resolvedParams.id);
  if (!loanId) {
    return NextResponse.json({ message: "ID pinjaman tidak valid." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { month?: number; year?: number } | null;
  const month = Number(body?.month);
  const year = Number(body?.year);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ message: "Bulan pelunasan tidak valid." }, { status: 400 });
  }
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return NextResponse.json({ message: "Tahun pelunasan tidak valid." }, { status: 400 });
  }

  try {
    const loan = await payoffLoanEarly(loanId, month, year);
    return NextResponse.json({
      message: "Jadwal pelunasan dipercepat berhasil diterapkan. Sisa pinjaman akan dipotong sekaligus pada periode payroll yang dipilih.",
      loan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses pelunasan pinjaman.";
    return NextResponse.json({ message }, { status: getErrorStatus(message) });
  }
}
