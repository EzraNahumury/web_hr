import { NextResponse } from "next/server";
import { signupEmployee } from "@/lib/employees";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      otpCode?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const otpCode = body.otpCode?.trim();

    if (!email || !password || !otpCode) {
      return NextResponse.json(
        { message: "Email, password, dan kode OTP wajib diisi." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter." },
        { status: 400 },
      );
    }

    const otpValid = await verifyOtp(email, otpCode);
    if (!otpValid) {
      return NextResponse.json(
        { message: "Kode OTP tidak valid atau sudah kadaluarsa." },
        { status: 400 },
      );
    }

    await signupEmployee(email, password);

    return NextResponse.json(
      { message: "Pendaftaran berhasil! Silakan login untuk melengkapi data diri." },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json(
        { message: "Email sudah terdaftar." },
        { status: 409 },
      );
    }

    console.error("Signup error", error);
    return NextResponse.json(
      { message: "Gagal memproses pendaftaran." },
      { status: 500 },
    );
  }
}
