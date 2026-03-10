import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentEmployeeSession } from "@/lib/auth";
import {
  getCheckInLateMinutes,
  getJakartaDate,
  getJakartaDateTime,
  saveAttendancePhoto,
} from "@/lib/attendance";

type EmployeeRow = RowDataPacket & {
  id: number;
};

type AttendanceRow = RowDataPacket & {
  id: number;
  jam_masuk: Date | null;
};

export async function POST(request: Request) {
  try {
    const session = await getCurrentEmployeeSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as {
      photoDataUrl?: string;
      latitude?: number;
      longitude?: number;
    };

    if (!body.photoDataUrl || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json(
        { message: "Selfie dan lokasi wajib dikirim." },
        { status: 400 },
      );
    }

    const [employeeRows] = await pool.query<EmployeeRow[]>(
      "SELECT id FROM karyawan WHERE user_id = ? LIMIT 1",
      [session.userId],
    );

    const employee = employeeRows[0];

    if (!employee) {
      return NextResponse.json({ message: "Data karyawan tidak ditemukan." }, { status: 404 });
    }

    const attendanceDate = getJakartaDate();
    const attendanceDateTime = getJakartaDateTime();
    const currentTime = attendanceDateTime.split(" ")[1];

    const [existingRows] = await pool.query<AttendanceRow[]>(
      "SELECT id, jam_masuk FROM absensi WHERE karyawan_id = ? AND tanggal = ? LIMIT 1",
      [employee.id, attendanceDate],
    );

    if (existingRows[0]?.jam_masuk) {
      return NextResponse.json(
        { message: "Presensi masuk hari ini sudah tercatat." },
        { status: 409 },
      );
    }

    const photoPath = await saveAttendancePhoto(body.photoDataUrl, employee.id, "in");
    const lateMinutes = getCheckInLateMinutes(currentTime);

    if (existingRows[0]) {
      await pool.query(
        `
          UPDATE absensi
          SET
            jam_masuk = ?,
            status_absensi = 'hadir',
            kode_absensi = 'H',
            foto_masuk = ?,
            latitude_masuk = ?,
            longitude_masuk = ?,
            terlambat_menit = ?,
            setengah_hari = 0
          WHERE id = ?
        `,
        [
          attendanceDateTime,
          photoPath,
          body.latitude,
          body.longitude,
          lateMinutes,
          existingRows[0].id,
        ],
      );
    } else {
      await pool.query(
        `
          INSERT INTO absensi (
            karyawan_id,
            tanggal,
            jam_masuk,
            status_absensi,
            kode_absensi,
            foto_masuk,
            latitude_masuk,
            longitude_masuk,
            terlambat_menit,
            setengah_hari,
            lembur_jam
          ) VALUES (?, ?, ?, 'hadir', 'H', ?, ?, ?, ?, 0, 0)
        `,
        [
          employee.id,
          attendanceDate,
          attendanceDateTime,
          photoPath,
          body.latitude,
          body.longitude,
          lateMinutes,
        ],
      );
    }

    return NextResponse.json({ message: "Presensi masuk berhasil disimpan." });
  } catch (error) {
    console.error("Employee check-in error", error);

    return NextResponse.json(
      { message: "Gagal menyimpan presensi masuk." },
      { status: 500 },
    );
  }
}
