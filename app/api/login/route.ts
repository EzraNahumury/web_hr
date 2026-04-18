import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { clearAllSessionCookies, setAdminSessionCookie, setEmployeeSessionCookie } from "@/lib/auth";

type UserRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  password: string;
  role: "admin" | "karyawan";
  status_aktif: number;
  status_data: string | null;
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

    const [rows] = await pool.query<UserRow[]>(
      `
        SELECT u.id, u.nama, u.email, u.password, u.role, u.status_aktif,
               k.status_data
        FROM users u
        LEFT JOIN karyawan k ON k.user_id = u.id
        WHERE u.email = ?
        LIMIT 1
      `,
      [email],
    );

    const user = rows[0];

    if (!user || user.status_aktif !== 1) {
      return NextResponse.json(
        { message: "Akun tidak ditemukan atau tidak aktif." },
        { status: 401 },
      );
    }

    if (user.role === "karyawan" && user.status_data === "nonaktif") {
      return NextResponse.json(
        {
          message:
            "Akun Anda sudah dinonaktifkan karena sudah tidak bekerja di perusahaan. Hubungi HR bila ini keliru.",
        },
        { status: 403 },
      );
    }

    const [hashRows] = await pool.query<RowDataPacket[]>(
      "SELECT SHA2(?, 256) AS password_hash",
      [password],
    );

    const inputHash = String(hashRows[0]?.password_hash ?? "");

    if (inputHash !== user.password) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 },
      );
    }

    await clearAllSessionCookies();

    if (user.role === "admin") {
      await setAdminSessionCookie({
        id: user.id,
        email: user.email,
        fullName: user.nama,
      });

      return NextResponse.json({
        message: "Login admin berhasil.",
        role: "admin",
        redirectTo: "/admin",
      });
    }

    await setEmployeeSessionCookie({
      id: user.id,
      userId: user.id,
      email: user.email,
      fullName: user.nama,
    });

    return NextResponse.json({
      message: "Login karyawan berhasil.",
      role: "karyawan",
      redirectTo: "/employee/check-in",
    });
  } catch (error) {
    console.error("Login error", error);

    return NextResponse.json(
      { message: "Gagal memproses login." },
      { status: 500 },
    );
  }
}
