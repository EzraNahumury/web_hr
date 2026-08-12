import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  createCustomShift,
  deleteCustomShift,
  listShiftDefs,
  updateCustomShift,
} from "@/lib/shift-defs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      code?: unknown;
      label?: unknown;
      masukMin?: unknown;
      pulangMin?: unknown;
      toleranceMin?: unknown;
    };

    const input = {
      label: typeof body.label === "string" ? body.label : "",
      masukMin: Number(body.masukMin),
      pulangMin: Number(body.pulangMin),
      toleranceMin: Number.isFinite(Number(body.toleranceMin)) ? Number(body.toleranceMin) : 5,
    };

    if (body.action === "create") {
      await createCustomShift(input);
    } else if (body.action === "update") {
      const code = typeof body.code === "string" ? body.code : "";
      if (!code) return NextResponse.json({ message: "Kode shift tidak valid." }, { status: 400 });
      await updateCustomShift(code, input);
    } else if (body.action === "delete") {
      const code = typeof body.code === "string" ? body.code : "";
      if (!code) return NextResponse.json({ message: "Kode shift tidak valid." }, { status: 400 });
      await deleteCustomShift(code);
    } else {
      return NextResponse.json({ message: "Aksi tidak dikenal." }, { status: 400 });
    }

    const shifts = (await listShiftDefs()).map((d) => ({
      code: d.code,
      label: d.label,
      startMin: d.startMin,
      checkoutStartMin: d.checkoutStartMin,
      toleranceMin: d.toleranceMin,
      isLibur: d.isLibur,
      isSelectable: d.isSelectable,
      isSystem: d.isSystem,
    }));
    return NextResponse.json({ message: "Shift berhasil diperbarui.", shifts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan shift.";
    console.error("Shift def error", error);
    const lower = message.toLowerCase();
    const status =
      lower.includes("kosong") ||
      lower.includes("panjang") ||
      lower.includes("tidak valid") ||
      lower.includes("harus") ||
      lower.includes("bawaan") ||
      lower.includes("dipakai") ||
      lower.includes("tidak ditemukan")
        ? 400
        : 500;
    return NextResponse.json({ message }, { status });
  }
}
