import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentEmployeeSession } from "@/lib/auth";
import { getJakartaDate, getJakartaDateTime, saveAttendancePhoto } from "@/lib/attendance";

type EmployeeRow = RowDataPacket & {
  id: number;
};

type AttendanceRow = RowDataPacket & {
  id: number;
  jam_masuk: Date | null;
  jam_pulang: Date | null;
  status_absensi: string | null;
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

    const [attendanceRows] = await pool.query<AttendanceRow[]>(
      `
        SELECT id, jam_masuk, jam_pulang
             , status_absensi
        FROM absensi
        WHERE karyawan_id = ? AND tanggal = ?
        LIMIT 1
      `,
      [employee.id, attendanceDate],
    );

    const attendance = attendanceRows[0];

    if (attendance?.status_absensi === "sakit") {
      return NextResponse.json(
        { message: "Status sakit hari ini sudah tercatat. Presensi pulang tidak diperlukan." },
        { status: 409 },
      );
    }

    if (attendance?.status_absensi === "izin") {
      return NextResponse.json(
        { message: "Status izin/off hari ini sudah tercatat. Presensi pulang tidak diperlukan." },
        { status: 409 },
      );
    }

    if (!attendance?.jam_masuk) {
      return NextResponse.json(
        { message: "Presensi masuk hari ini belum tercatat." },
        { status: 409 },
      );
    }

    if (attendance.jam_pulang) {
      return NextResponse.json(
        { message: "Presensi pulang hari ini sudah tercatat." },
        { status: 409 },
      );
    }

    const photoPath = await saveAttendancePhoto(body.photoDataUrl, employee.id, "out");

    await pool.query(
      `
        UPDATE absensi
        SET
          jam_pulang = ?,
          foto_pulang = ?,
          latitude_pulang = ?,
          longitude_pulang = ?
        WHERE id = ?
      `,
      [attendanceDateTime, photoPath, body.latitude, body.longitude, attendance.id],
    );

    return NextResponse.json({ message: "Presensi pulang berhasil disimpan." });
  } catch (error) {
    console.error("Employee check-out error", error);

    return NextResponse.json(
      { message: "Gagal menyimpan presensi pulang." },
      { status: 500 },
    );
  }
}
