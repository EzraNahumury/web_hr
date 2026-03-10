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
import { saveUploadedFile } from "@/lib/uploads";

type EmployeeRow = RowDataPacket & {
  id: number;
};

type AttendanceRow = RowDataPacket & {
  id: number;
  jam_masuk: Date | null;
  status_absensi: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await getCurrentEmployeeSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const status = formData.get("status");
    const keterangan =
      typeof formData.get("keterangan") === "string" ? String(formData.get("keterangan")) : null;
    const sickProof = formData.get("sickProof");
    const photoDataUrl =
      typeof formData.get("photoDataUrl") === "string" ? String(formData.get("photoDataUrl")) : "";
    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));

    if (status !== "hadir" && status !== "sakit") {
      return NextResponse.json({ message: "Status presensi tidak valid." }, { status: 400 });
    }

    if (
      status === "hadir" &&
      (!photoDataUrl || !Number.isFinite(latitude) || !Number.isFinite(longitude))
    ) {
      return NextResponse.json(
        { message: "Selfie dan lokasi wajib dikirim." },
        { status: 400 },
      );
    }

    if (status === "sakit" && !(sickProof instanceof File && sickProof.size > 0)) {
      return NextResponse.json(
        { message: "Bukti sakit wajib diupload." },
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
      "SELECT id, jam_masuk, status_absensi FROM absensi WHERE karyawan_id = ? AND tanggal = ? LIMIT 1",
      [employee.id, attendanceDate],
    );

    if (existingRows[0]) {
      return NextResponse.json(
        {
          message:
            existingRows[0].status_absensi === "sakit"
              ? "Laporan sakit hari ini sudah tercatat. Presensi masuk tidak bisa dilakukan lagi."
              : "Presensi hari ini sudah tercatat dan tidak bisa diubah lagi.",
        },
        { status: 409 },
      );
    }

    const photoPath =
      status === "hadir"
        ? await saveAttendancePhoto(photoDataUrl, employee.id, "in")
        : await saveUploadedFile(sickProof as File, "attendance");
    const lateMinutes = status === "hadir" ? getCheckInLateMinutes(currentTime) : 0;
    const attendanceStatus = status === "sakit" ? "sakit" : "hadir";
    const attendanceCode = status === "sakit" ? "S" : "H";
    const attendanceTime = status === "sakit" ? null : attendanceDateTime;
    const attendanceLatitude = status === "sakit" ? null : latitude;
    const attendanceLongitude = status === "sakit" ? null : longitude;

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
          lembur_jam,
          keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
      `,
      [
        employee.id,
        attendanceDate,
        attendanceTime,
        attendanceStatus,
        attendanceCode,
        photoPath,
        attendanceLatitude,
        attendanceLongitude,
        lateMinutes,
        keterangan,
      ],
    );

    return NextResponse.json({
      message:
        status === "sakit"
          ? "Laporan sakit berhasil disimpan."
          : "Presensi masuk berhasil disimpan.",
    });
  } catch (error) {
    console.error("Employee check-in error", error);

    return NextResponse.json(
      { message: "Gagal menyimpan presensi masuk." },
      { status: 500 },
    );
  }
}
