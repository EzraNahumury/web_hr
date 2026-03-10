import { NextResponse } from "next/server";
import { clearAllSessionCookies } from "@/lib/auth";

export async function POST() {
  await clearAllSessionCookies();
  return NextResponse.json({ message: "Logout berhasil." });
}
