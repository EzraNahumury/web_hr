import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { deleteItemLoan } from "@/lib/item-loans";

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
