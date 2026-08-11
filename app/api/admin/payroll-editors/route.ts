import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { listAdmins } from "@/lib/admins";
import {
  addPayrollEditor,
  getPayrollEditorEmails,
  removePayrollEditor,
} from "@/lib/payroll-editors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      email?: unknown;
    };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ message: "Email tidak valid." }, { status: 400 });
    }

    // Hanya email milik akun admin (role='admin') yang boleh diberi hak payroll.
    const admins = await listAdmins();
    const isKnownAdmin = admins.some(
      (a) => a.role === "admin" && a.email.trim().toLowerCase() === email,
    );
    if (!isKnownAdmin) {
      return NextResponse.json(
        { message: "Email bukan akun admin yang terdaftar." },
        { status: 400 },
      );
    }

    if (body.action === "add") {
      await addPayrollEditor(email);
    } else if (body.action === "remove") {
      await removePayrollEditor(email);
    } else {
      return NextResponse.json({ message: "Aksi tidak dikenal." }, { status: 400 });
    }

    const editors = await getPayrollEditorEmails();
    return NextResponse.json({ message: "Akun payroll berhasil diperbarui.", editors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan akun payroll.";
    console.error("Payroll editor error", error);
    const status = message.toLowerCase().includes("minimal") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
