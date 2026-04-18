import { NextResponse } from "next/server";
import { signupEmployee } from "@/lib/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email dan password wajib diisi." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter." },
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
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "unknown";
    return NextResponse.json(
      { message: `Gagal memproses pendaftaran (${detail}).` },
      { status: 500 },
    );
  }
}
