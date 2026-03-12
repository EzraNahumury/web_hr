import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { listAdminLoans } from "@/lib/loans";

export async function GET() {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const rows = await listAdminLoans();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("List admin loans error", error);
    return NextResponse.json({ message: "Gagal memuat data pinjaman." }, { status: 500 });
  }
}
