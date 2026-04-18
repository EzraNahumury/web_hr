import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  countActiveAdmins,
  deleteAdmin,
  emailExists,
  getAdminById,
  updateAdmin,
} from "@/lib/admins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const params = await context.params;
  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
  }

  const current = await getAdminById(id);
  if (!current) {
    return NextResponse.json(
      { message: "Akun admin tidak ditemukan." },
      { status: 404 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = normalizeString(body.name);
    const email = normalizeString(body.email).toLowerCase();
    const password = normalizeString(body.password);
    const isActive = body.isActive === undefined ? current.isActive : Boolean(body.isActive);

    if (!name) {
      return NextResponse.json({ message: "Nama wajib diisi." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Email tidak valid." }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter." },
        { status: 400 },
      );
    }

    if (email !== current.email && (await emailExists(email, id))) {
      return NextResponse.json(
        { message: "Email sudah terdaftar." },
        { status: 409 },
      );
    }

    if (current.isActive && !isActive && id === session.id) {
      return NextResponse.json(
        { message: "Tidak dapat menonaktifkan akun yang sedang digunakan." },
        { status: 400 },
      );
    }

    if (current.isActive && !isActive) {
      const active = await countActiveAdmins();
      if (active <= 1) {
        return NextResponse.json(
          { message: "Minimal harus ada satu admin aktif." },
          { status: 400 },
        );
      }
    }

    const row = await updateAdmin(id, {
      name,
      email,
      password: password || null,
      isActive,
    });
    return NextResponse.json({ message: "Akun admin berhasil diperbarui.", row });
  } catch (error) {
    console.error("Update admin error", error);
    return NextResponse.json(
      { message: "Gagal memperbarui akun admin." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const params = await context.params;
  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
  }

  if (id === session.id) {
    return NextResponse.json(
      { message: "Tidak dapat menghapus akun yang sedang digunakan." },
      { status: 400 },
    );
  }

  const current = await getAdminById(id);
  if (!current) {
    return NextResponse.json(
      { message: "Akun admin tidak ditemukan." },
      { status: 404 },
    );
  }

  if (current.isActive) {
    const active = await countActiveAdmins();
    if (active <= 1) {
      return NextResponse.json(
        { message: "Minimal harus ada satu admin aktif." },
        { status: 400 },
      );
    }
  }

  try {
    const ok = await deleteAdmin(id);
    if (!ok) {
      return NextResponse.json(
        { message: "Akun admin tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ message: "Akun admin berhasil dihapus." });
  } catch (error) {
    console.error("Delete admin error", error);
    return NextResponse.json(
      { message: "Gagal menghapus akun admin." },
      { status: 500 },
    );
  }
}
