import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { listVisitReports } from "@/lib/visit-reports";

function parseDate(value: string | null) {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parsePositiveInt(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));
    const employeeId = parsePositiveInt(searchParams.get("employeeId"));

    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: "Parameter startDate & endDate wajib format YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const reports = await listVisitReports({
      startDate,
      endDate,
      employeeId: employeeId ?? undefined,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Admin visit-reports GET error", error);
    return NextResponse.json(
      { message: "Gagal mengambil laporan kunjungan." },
      { status: 500 },
    );
  }
}
