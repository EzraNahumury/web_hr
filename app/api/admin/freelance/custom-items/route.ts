import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import {
  createCustomItem,
  deleteCustomItem,
  getCustomItemsByEmployee,
  updateCustomItem,
} from "@/lib/payroll-freelance";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const karyawanId = Number(new URL(request.url).searchParams.get("karyawanId"));
  if (!karyawanId) return NextResponse.json({ message: "karyawanId wajib diisi." }, { status: 400 });

  try {
    const items = await getCustomItemsByEmployee(karyawanId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("getCustomItems error", error);
    return NextResponse.json({ message: "Gagal mengambil data item." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as { karyawanId?: number; namaJenis?: string } | null;
  if (!body?.karyawanId || !body.namaJenis?.trim()) {
    return NextResponse.json({ message: "karyawanId dan namaJenis wajib diisi." }, { status: 400 });
  }

  try {
    const item = await createCustomItem(body.karyawanId, body.namaJenis.trim());
    return NextResponse.json(item);
  } catch (error) {
    console.error("createCustomItem error", error);
    return NextResponse.json({ message: "Gagal menambah item." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: number; namaJenis?: string } | null;
  if (!body?.id || !body.namaJenis?.trim()) {
    return NextResponse.json({ message: "id dan namaJenis wajib diisi." }, { status: 400 });
  }

  try {
    await updateCustomItem(body.id, body.namaJenis.trim());
    return NextResponse.json({ message: "Item berhasil diperbarui." });
  } catch (error) {
    console.error("updateCustomItem error", error);
    return NextResponse.json({ message: "Gagal memperbarui item." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ message: "id wajib diisi." }, { status: 400 });

  try {
    await deleteCustomItem(id);
    return NextResponse.json({ message: "Item berhasil dihapus." });
  } catch (error) {
    console.error("deleteCustomItem error", error);
    return NextResponse.json({ message: "Gagal menghapus item." }, { status: 500 });
  }
}
