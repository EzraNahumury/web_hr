import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { deleteItemLoan, updateItemLoan } from "@/lib/item-loans";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const params = await context.params;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      employeeIds?: unknown;
      items?: unknown;
      loanDate?: unknown;
      note?: unknown;
    };
    const employeeIds = Array.isArray(body.employeeIds)
      ? body.employeeIds.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    const items = Array.isArray(body.items) ? body.items.map((v) => String(v)) : [];
    const loanDate = typeof body.loanDate === "string" ? body.loanDate : null;
    const note = typeof body.note === "string" ? body.note : null;

    const ok = await updateItemLoan(id, { employeeIds, items, loanDate, note });
    if (!ok) {
      return NextResponse.json({ message: "Data peminjaman tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ message: "Peminjaman barang diperbarui." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui peminjaman barang.";
    const status = message.toLowerCase().includes("valid") || message.toLowerCase().includes("wajib") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const params = await context.params;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
  }

  try {
    const ok = await deleteItemLoan(id);
    if (!ok) {
      return NextResponse.json({ message: "Data peminjaman tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ message: "Peminjaman barang dihapus." });
  } catch (error) {
    console.error("Delete item loan error", error);
    return NextResponse.json({ message: "Gagal menghapus peminjaman barang." }, { status: 500 });
  }
}
