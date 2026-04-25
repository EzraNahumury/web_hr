import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  createAdmin,
  emailExists,
  listAdmins,
  MANAGED_ROLES,
  type ManagedRole,
} from "@/lib/admins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const rows = await listAdmins();
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = normalizeString(body.name);
    const email = normalizeString(body.email).toLowerCase();
    const password = normalizeString(body.password);
    const roleInput = normalizeString(body.role) as ManagedRole;
    const role: ManagedRole = MANAGED_ROLES.includes(roleInput) ? roleInput : "admin";
    const isActive = body.isActive === undefined ? true : Boolean(body.isActive);

    if (!name) {
      return NextResponse.json({ message: "Nama wajib diisi." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Email tidak valid." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter." },
        { status: 400 },
      );
    }

    if (await emailExists(email)) {
      return NextResponse.json(
        { message: "Email sudah terdaftar." },
        { status: 409 },
      );
    }

    const row = await createAdmin({ name, email, password, role, isActive });
    return NextResponse.json(
      { message: "Akun admin berhasil dibuat.", row },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin error", error);
    return NextResponse.json(
      { message: "Gagal membuat akun admin." },
      { status: 500 },
    );
  }
}
