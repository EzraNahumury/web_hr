import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

function toDateTimeString(date: string, time: string) {
  return `${date} ${time}:00`;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const karyawanId = Number(body?.karyawanId);
  const tanggal = typeof body?.tanggal === "string" ? body.tanggal : "";
  const jamMulai = typeof body?.jamMulai === "string" ? body.jamMulai : "";
  const jamSelesai = typeof body?.jamSelesai === "string" ? body.jamSelesai : "";
  const buktiLembur =
    typeof body?.buktiLembur === "string" && body.buktiLembur.trim()
      ? body.buktiLembur.trim()
      : null;

  if (!Number.isInteger(karyawanId) || karyawanId <= 0) {
    return NextResponse.json({ error: "Karyawan tidak valid." }, { status: 400 });
  }

  if (!tanggal || !jamMulai || !jamSelesai) {
    return NextResponse.json({ error: "Tanggal dan jam lembur wajib diisi." }, { status: 400 });
  }

  const start = new Date(`${tanggal}T${jamMulai}:00`);
  const end = new Date(`${tanggal}T${jamSelesai}:00`);
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  if (!Number.isFinite(diffHours) || diffHours <= 0) {
    return NextResponse.json(
      { error: "Jam selesai harus lebih besar dari jam mulai." },
      { status: 400 },
    );
  }

  const [employeeRows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM karyawan WHERE id = ? LIMIT 1",
    [karyawanId],
  );

  if (!employeeRows[0]) {
    return NextResponse.json({ error: "Data karyawan tidak ditemukan." }, { status: 404 });
  }

  await pool.query<ResultSetHeader>(
    `
      INSERT INTO lembur (
        karyawan_id,
        tanggal,
        jam_mulai,
        jam_selesai,
        total_jam,
        bukti_lembur,
        status_approval,
        approved_by,
        catatan_atasan
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, NULL)
    `,
    [
      karyawanId,
      tanggal,
      toDateTimeString(tanggal, jamMulai),
      toDateTimeString(tanggal, jamSelesai),
      diffHours.toFixed(2),
      buktiLembur,
    ],
  );

  return NextResponse.json({ success: true });
}
