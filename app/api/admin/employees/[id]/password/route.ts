import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { updateEmployeePassword } from "@/lib/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/admin/employees/[id]/password  body: { password }
// Reset password login Web HR karyawan (bukan password Gmail). Hanya admin.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const params = await context.params;
  const employeeId = parseId(params.id);
  if (!employeeId) {
    return NextResponse.json({ message: "ID karyawan tidak valid." }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password baru minimal 6 karakter." },
        { status: 400 },
      );
    }

    const ok = await updateEmployeePassword(employeeId, password);
    if (!ok) {
      return NextResponse.json(
        { message: "Karyawan tidak ditemukan atau belum memiliki akun login." },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Password karyawan berhasil diperbarui." });
  } catch (error) {
    console.error("Update employee password error", error);
    return NextResponse.json(
      { message: "Gagal memperbarui password karyawan." },
      { status: 500 },
    );
  }
}
