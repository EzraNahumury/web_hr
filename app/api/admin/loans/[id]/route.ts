import { NextRequest, NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  approveLoanRequest,
  deleteLoanRequest,
  rejectLoanRequest,
  updateLoanRequest,
} from "@/lib/loans";

function parseLoanId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getErrorStatus(message: string) {
  if (message.toLowerCase().includes("tidak ditemukan")) {
    return 404;
  }

  if (message.toLowerCase().includes("sudah diproses")) {
    return 409;
  }

  return 500;
}

export async function PATCH(
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

  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;

  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ message: "Status approval pinjaman tidak valid." }, { status: 400 });
  }

  try {
    const loan =
      status === "approved"
        ? await approveLoanRequest(loanId, admin.id)
        : await rejectLoanRequest(loanId);

    return NextResponse.json({
      message:
        status === "approved"
          ? "Pengajuan pinjaman berhasil di-approve. Jadwal cicilan otomatis sudah dibuat."
          : "Pengajuan pinjaman berhasil ditolak.",
      loan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses pengajuan pinjaman.";
    return NextResponse.json({ message }, { status: getErrorStatus(message) });
  }
}

export async function PUT(
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
  const body = (await request.json().catch(() => null)) as
    | { employeeId?: number; totalLoan?: number; installmentCount?: number; requestDate?: string }
    | null;
  if (!body) {
    return NextResponse.json({ message: "Body tidak valid." }, { status: 400 });
  }
  try {
    const loan = await updateLoanRequest(loanId, {
      employeeId: Number(body.employeeId),
      totalLoan: Number(body.totalLoan),
      installmentCount: Number(body.installmentCount),
      requestDate: String(body.requestDate ?? ""),
    });
    return NextResponse.json({
      message: "Pengajuan pinjaman berhasil diupdate.",
      loan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui pengajuan pinjaman.";
    return NextResponse.json({ message }, { status: getErrorStatus(message) });
  }
}

export async function DELETE(
  _request: NextRequest,
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
  try {
    await deleteLoanRequest(loanId);
    return NextResponse.json({ message: "Pengajuan pinjaman berhasil dihapus." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus pengajuan pinjaman.";
    return NextResponse.json({ message }, { status: getErrorStatus(message) });
  }
}
