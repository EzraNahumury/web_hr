import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { markContractReturn, unmarkContractReturn } from "@/lib/contract-returns";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ message: "Body tidak valid." }, { status: 400 });
  }

  const employeeId = Number(body.employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ message: "Karyawan tidak valid." }, { status: 400 });
  }

  const action = body.action === "unmark" ? "unmark" : "mark";

  try {
    if (action === "unmark") {
      await unmarkContractReturn(employeeId);
      return NextResponse.json({ message: "Status pengembalian dibatalkan." });
    }

    const nominal = Number(body.nominal);
    if (!Number.isFinite(nominal) || nominal < 0) {
      return NextResponse.json({ message: "Nominal pengembalian tidak valid." }, { status: 400 });
    }
    const tanggal =
      typeof body.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.tanggal)
        ? body.tanggal
        : null;
    const catatan =
      typeof body.catatan === "string" && body.catatan.trim() ? body.catatan.trim().slice(0, 255) : null;

    await markContractReturn({
      employeeId,
      nominal,
      tanggal,
      catatan,
      adminName: admin.fullName ?? admin.email ?? null,
    });
    return NextResponse.json({ message: "Ditandai sudah dikembalikan." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan pengembalian.";
    console.error("Contract return error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
