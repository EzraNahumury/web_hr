import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { getFreelanceSheet } from "@/lib/payroll-freelance";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get("month")) || null;
  const year = Number(searchParams.get("year")) || null;

  try {
    const sheet = await getFreelanceSheet({ month, year });
    return NextResponse.json(sheet);
  } catch (error) {
    console.error("getFreelanceSheet error", error);
    return NextResponse.json({ message: "Gagal mengambil data payroll freelance." }, { status: 500 });
  }
}
