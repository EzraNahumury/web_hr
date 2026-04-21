import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { getVisitReportMonthlySummary } from "@/lib/visit-reports";

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
    const month = parsePositiveInt(searchParams.get("month"));
    const year = parsePositiveInt(searchParams.get("year"));

    if (!month || month > 12 || !year) {
      return NextResponse.json(
        { message: "Parameter month & year wajib valid." },
        { status: 400 },
      );
    }

    const summary = await getVisitReportMonthlySummary(month, year);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Admin visit-reports summary error", error);
    return NextResponse.json(
      { message: "Gagal mengambil summary kunjungan." },
      { status: 500 },
    );
  }
}
