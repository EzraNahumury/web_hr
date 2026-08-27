import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { upsertFreelanceJam } from "@/lib/payroll-freelance";
import { pool } from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

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
       DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS tanggal,
       TIME_FORMAT(a.jam_masuk, '%H:%i') AS jam_masuk,
       TIME_FORMAT(a.jam_pulang, '%H:%i') AS jam_pulang,
       CASE
         WHEN a.jam_masuk IS NOT NULL AND a.jam_pulang IS NOT NULL
           THEN GREATEST(TIMESTAMPDIFF(MINUTE, a.jam_masuk, a.jam_pulang), 0)
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

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

// PUT — edit jam masuk / jam pulang absensi freelance (baris 'hadir') untuk 1 tanggal.
export async function PUT(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    karyawanId?: number;
    tanggal?: string;
    jamMasuk?: string | null;
    jamPulang?: string | null;
  } | null;

  const karyawanId = Number(body?.karyawanId);
  const tanggal = typeof body?.tanggal === "string" ? body.tanggal : "";
  if (!karyawanId || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return NextResponse.json({ message: "Data tidak lengkap." }, { status: 400 });
  }

  const jamMasuk = body?.jamMasuk ? String(body.jamMasuk) : null;
  const jamPulang = body?.jamPulang ? String(body.jamPulang) : null;
  if (jamMasuk && !timeRe.test(jamMasuk)) {
    return NextResponse.json({ message: "Format jam masuk tidak valid (HH:MM)." }, { status: 400 });
  }
  if (jamPulang && !timeRe.test(jamPulang)) {
    return NextResponse.json({ message: "Format jam pulang tidak valid (HH:MM)." }, { status: 400 });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE absensi
         SET jam_masuk = ?, jam_pulang = ?
       WHERE karyawan_id = ? AND tanggal = ? AND status_absensi = 'hadir'`,
      [jamMasuk ? `${jamMasuk}:00` : null, jamPulang ? `${jamPulang}:00` : null, karyawanId, tanggal],
    );
    if (result.affectedRows === 0) {
      // affectedRows 0 bisa karena nilai TIDAK berubah (bukan karena baris tak ada).
      // Cek keberadaan baris — kalau ada, anggap sukses.
      const [exists] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM absensi WHERE karyawan_id = ? AND tanggal = ? AND status_absensi = 'hadir' LIMIT 1`,
        [karyawanId, tanggal],
      );
      if (exists.length === 0) {
        return NextResponse.json({ message: "Baris absensi tidak ditemukan." }, { status: 404 });
      }
    }
    const menitKerja =
      jamMasuk && jamPulang
        ? Math.max(0, (Number(jamPulang.slice(0, 2)) * 60 + Number(jamPulang.slice(3, 5))) -
            (Number(jamMasuk.slice(0, 2)) * 60 + Number(jamMasuk.slice(3, 5))))
        : jamMasuk
          ? 480
          : 0;
    return NextResponse.json({ message: "Jam absensi diperbarui.", menitKerja });
  } catch (error) {
    console.error("update freelance jam error", error);
    return NextResponse.json({ message: "Gagal memperbarui jam absensi." }, { status: 500 });
  }
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
