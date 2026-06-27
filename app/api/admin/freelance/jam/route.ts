import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { upsertFreelanceJam } from "@/lib/payroll-freelance";
import { pool } from "@/lib/db";
import { RowDataPacket } from "mysql2";

type AbsensiDetailRow = RowDataPacket & {
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  menit_kerja: number;
};

function resolvePeriodRange(bulan: number, tahun: number) {
  const prevMonth = bulan === 1 ? 12 : bulan - 1;
  const prevYear = bulan === 1 ? tahun - 1 : tahun;
  const start = `${prevYear}-${String(prevMonth).padStart(2, "0")}-26`;
  const end = `${tahun}-${String(bulan).padStart(2, "0")}-25`;
  return { start, end };
}

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const karyawanId = Number(searchParams.get("karyawanId"));
  const bulan = Number(searchParams.get("bulan"));
  const tahun = Number(searchParams.get("tahun"));

  if (!karyawanId || !bulan || !tahun) {
    return NextResponse.json({ message: "Parameter tidak lengkap." }, { status: 400 });
  }

  const { start, end } = resolvePeriodRange(bulan, tahun);

  const [rows] = await pool.query<AbsensiDetailRow[]>(
    `SELECT
       a.tanggal,
       a.jam_masuk,
       a.jam_pulang,
       CASE
         WHEN a.jam_masuk IS NOT NULL AND a.jam_pulang IS NOT NULL
           THEN CEIL(TIMESTAMPDIFF(MINUTE, a.jam_masuk, a.jam_pulang) / 30) * 30
         WHEN a.jam_masuk IS NOT NULL THEN 480
         ELSE 0
       END AS menit_kerja
     FROM absensi a
     WHERE a.karyawan_id = ?
       AND a.tanggal BETWEEN ? AND ?
       AND a.status_absensi = 'hadir'
     ORDER BY a.tanggal ASC`,
    [karyawanId, start, end],
  );

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    karyawanId?: number;
    bulan?: number;
    tahun?: number;
    ratePerJam?: number;
  } | null;

  if (!body?.karyawanId || !body.bulan || !body.tahun) {
    return NextResponse.json({ message: "Data tidak lengkap." }, { status: 400 });
  }

  try {
    await upsertFreelanceJam(body.karyawanId, body.bulan, body.tahun, body.ratePerJam ?? 0);
    return NextResponse.json({ message: "Rate per jam berhasil disimpan." });
  } catch (error) {
    console.error("upsertFreelanceJam error", error);
    return NextResponse.json({ message: "Gagal menyimpan rate per jam." }, { status: 500 });
  }
}
