import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { setAdminSessionCookie } from "@/lib/auth";

type AdminRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  password: string;
  status_aktif: number;
};

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

    const [rows] = await pool.query<AdminRow[]>(
      `
        SELECT id, nama, email, password, status_aktif
        FROM users
        WHERE email = ? AND role = 'admin'
        LIMIT 1
      `,
      [email],
    );

    const admin = rows[0];

    if (!admin || admin.status_aktif !== 1) {
      return NextResponse.json(
        { message: "Akun admin tidak ditemukan atau tidak aktif." },
        { status: 401 },
      );
    }

    const [hashRows] = await pool.query<RowDataPacket[]>(
      "SELECT SHA2(?, 256) AS password_hash",
      [password],
    );

    const inputHash = String(hashRows[0]?.password_hash ?? "");

    if (inputHash !== admin.password) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 },
      );
    }

    await setAdminSessionCookie({
      id: admin.id,
      email: admin.email,
      fullName: admin.nama,
    });

    return NextResponse.json({
      message: "Login berhasil.",
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.nama,
      },
    });
  } catch (error) {
    console.error("Admin login error", error);

    return NextResponse.json(
      { message: "Gagal terhubung ke database admin." },
      { status: 500 },
    );
  }
}
