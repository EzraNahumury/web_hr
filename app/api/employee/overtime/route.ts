import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { saveUploadedFile } from "@/lib/uploads";

function toDateTimeString(date: string, time: string) {
  return `${date} ${time}:00`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);

  const karyawanId = Number(formData?.get("karyawanId"));
  const tanggal = typeof formData?.get("tanggal") === "string" ? String(formData.get("tanggal")) : "";
  const jamMulai =
    typeof formData?.get("jamMulai") === "string" ? String(formData.get("jamMulai")) : "";
  const jamSelesai =
    typeof formData?.get("jamSelesai") === "string" ? String(formData.get("jamSelesai")) : "";
  const buktiFile = formData?.get("buktiLembur");

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

  const buktiLembur =
    buktiFile instanceof File && buktiFile.size > 0
      ? await saveUploadedFile(buktiFile, "overtime")
      : null;

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
