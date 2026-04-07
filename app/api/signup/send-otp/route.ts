import { NextResponse } from "next/server";
import { sendOtp } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "Email wajib diisi." },
        { status: 400 },
      );
    }

    const result = await sendOtp(email);

    if (!result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error("Send OTP error", error);
    return NextResponse.json(
      { message: "Gagal mengirim kode verifikasi." },
      { status: 500 },
    );
  }
}
