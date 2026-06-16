import { RowDataPacket } from "mysql2";

import { createSignedSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { jsonNoStore } from "@/lib/api-json";

// Route auth — selalu dinamis & tidak boleh di-cache CDN.
export const dynamic = "force-dynamic";

type MobileLoginRow = RowDataPacket & {
  user_id: number;
  nama: string;
  email: string;
  password: string;
  role: "admin" | "karyawan" | "spv";
  status_aktif: number;
  karyawan_id: number | null;
  no_karyawan: string | null;
  jabatan: string | null;
  divisi: string | null;
  departemen: string | null;
  penempatan: string | null;
  status_data: string | null;
};

// POST /api/mobile/login  body: { email, password }
// Khusus aplikasi mobile karyawan. Balas token (signed-session yang identik dengan cookie web)
// + data karyawan. Admin/SPV ditolak (403). Tidak menyetel cookie apa pun.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: string; password?: string }
      | null;

    const email = body?.email?.trim().toLowerCase();
    const password = body?.password?.trim();

    if (!email || !password) {
      return jsonNoStore({ message: "Email dan password wajib diisi." }, 400);
    }

    const [rows] = await pool.query<MobileLoginRow[]>(
      `
        SELECT
          u.id   AS user_id,
          u.nama AS nama,
          u.email AS email,
          u.password AS password,
          u.role AS role,
          u.status_aktif AS status_aktif,
          k.id AS karyawan_id,
          k.no_karyawan AS no_karyawan,
          k.jabatan AS jabatan,
          k.divisi AS divisi,
          k.departemen AS departemen,
          k.penempatan AS penempatan,
          k.status_data AS status_data
        FROM users u
        LEFT JOIN karyawan k ON k.user_id = u.id
        WHERE u.email = ?
        LIMIT 1
      `,
      [email],
    );

    const user = rows[0];

    if (!user || user.status_aktif !== 1) {
      return jsonNoStore({ message: "Akun tidak ditemukan atau tidak aktif." }, 401);
    }

    // Aplikasi mobile hanya untuk karyawan.
    if (user.role !== "karyawan") {
      return jsonNoStore(
        { message: "Aplikasi ini khusus untuk karyawan. Akun admin/SPV gunakan versi web." },
        403,
      );
    }

    if (user.status_data === "nonaktif") {
      return jsonNoStore(
        {
          message:
            "Akun Anda sudah dinonaktifkan karena sudah tidak bekerja di perusahaan. Hubungi HR bila ini keliru.",
        },
        403,
      );
    }

    const [hashRows] = await pool.query<RowDataPacket[]>(
      "SELECT SHA2(?, 256) AS password_hash",
      [password],
    );
    const inputHash = String(hashRows[0]?.password_hash ?? "");

    if (inputHash !== user.password) {
      return jsonNoStore({ message: "Email atau password salah." }, 401);
    }

    // Token = signed-session identik dengan cookie web (payload EmployeeSession),
    // dengan masa berlaku 30 hari supaya token yang bocor tidak valid selamanya.
    const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
    const token = createSignedSession(
      {
        id: user.user_id,
        userId: user.user_id,
        email: user.email,
        fullName: user.nama,
      },
      { expiresInMs: TOKEN_TTL_MS },
    );

    return jsonNoStore({
      message: "Login berhasil.",
      token,
      employee: {
        id: user.karyawan_id,
        userId: user.user_id,
        nama: user.nama,
        email: user.email,
        no_karyawan: user.no_karyawan,
        jabatan: user.jabatan,
        divisi: user.divisi,
        departemen: user.departemen,
        penempatan: user.penempatan,
      },
    });
  } catch (error) {
    console.error("Mobile login error", error);
    return jsonNoStore({ message: "Gagal memproses login." }, 500);
  }
}
