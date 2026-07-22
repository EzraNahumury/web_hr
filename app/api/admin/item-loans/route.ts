import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { createItemLoan, listItemLoans, listItemLoansByEmployee } from "@/lib/item-loans";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const employeeIdRaw = url.searchParams.get("employeeId");

  try {
    if (employeeIdRaw) {
      const employeeId = Number(employeeIdRaw);
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return NextResponse.json({ message: "Karyawan tidak valid." }, { status: 400 });
      }
      const rows = await listItemLoansByEmployee(employeeId);
      return NextResponse.json({ rows });
    }
    const rows = await listItemLoans();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("List item loans error", error);
    return NextResponse.json({ message: "Gagal memuat data peminjaman barang." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      employeeIds?: unknown;
      employeeId?: unknown;
      items?: unknown;
      loanDate?: unknown;
      note?: unknown;
    };

    const employeeIds = Array.isArray(body.employeeIds)
      ? body.employeeIds.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0)
      : Number.isInteger(Number(body.employeeId)) && Number(body.employeeId) > 0
        ? [Number(body.employeeId)]
        : [];
    const items = Array.isArray(body.items)
      ? body.items.map((v) => String(v))
      : typeof body.items === "string"
        ? [body.items]
        : [];
    const loanDate = typeof body.loanDate === "string" ? body.loanDate : null;
    const note = typeof body.note === "string" ? body.note : null;

    const id = await createItemLoan({ employeeIds, items, loanDate, note, adminId: admin.id });
    return NextResponse.json({ message: "Peminjaman barang tersimpan.", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan peminjaman barang.";
    const status = message.toLowerCase().includes("valid") || message.toLowerCase().includes("wajib") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
