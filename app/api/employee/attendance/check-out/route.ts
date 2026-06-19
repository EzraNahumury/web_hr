import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentEmployeeSession } from "@/lib/auth";
import {
  detectTokoGudangShiftFinal,
  ensureAttendanceShiftSupport,
  getJakartaDate,
  getJakartaDateTime,
  isEarlyLeaveByTime,
  isTokoGudangPlacement,
  saveAttendancePhoto,
} from "@/lib/attendance";
import { checkGeofence, MAX_GEOFENCE_RADIUS_METERS } from "@/lib/geofence";
import { getScheduledShiftForDate } from "@/lib/jadwal-karyawan";

type EmployeeRow = RowDataPacket & {
  id: number;
  penempatan: string | null;
  sub_divisi: string | null;
};

type AttendanceRow = RowDataPacket & {
  id: number;
  jam_masuk: Date | null;
  jam_masuk_str: string | null;
  jam_pulang: Date | null;
  status_absensi: string | null;
};

export async function POST(request: Request) {
  try {
    await ensureAttendanceShiftSupport();

    const session = await getCurrentEmployeeSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as {
      photoDataUrl?: string;
      latitude?: number;
      longitude?: number;
      keterangan?: string;
    };

    if (!body.photoDataUrl || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json(
        { message: "Selfie dan lokasi wajib dikirim." },
        { status: 400 },
      );
    }

    const [employeeRows] = await pool.query<EmployeeRow[]>(
      "SELECT id, penempatan, sub_divisi FROM karyawan WHERE user_id = ? LIMIT 1",
      [session.userId],
    );

    const employee = employeeRows[0];

    if (!employee) {
      return NextResponse.json({ message: "Data karyawan tidak ditemukan." }, { status: 404 });
    }

    const geofence = checkGeofence(employee.penempatan, body.latitude, body.longitude);
    if (!geofence.valid) {
      return NextResponse.json(
        {
          message: geofence.message,
          geofence: {
            reason: geofence.reason,
            distanceMeters: geofence.distanceMeters,
            maxRadiusMeters: geofence.location?.radiusMeters ?? MAX_GEOFENCE_RADIUS_METERS,
            targetLabel: geofence.location?.label ?? null,
            targetLatitude: geofence.location?.latitude ?? null,
            targetLongitude: geofence.location?.longitude ?? null,
            placement: geofence.placement,
          },
        },
        { status: 403 },
      );
    }

    const attendanceDate = getJakartaDate();
    const attendanceDateTime = getJakartaDateTime();

    const [attendanceRows] = await pool.query<AttendanceRow[]>(
      `
        SELECT id, jam_masuk, jam_pulang, status_absensi,
               DATE_FORMAT(jam_masuk, '%H:%i') AS jam_masuk_str
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

    const checkOutTime = attendanceDateTime.split(" ")[1];
    const keterangan = body.keterangan?.trim() || null;

    const subDivLower = (employee.sub_divisi ?? "").trim().toLowerCase();
    const isMedia = subDivLower === "media";
    const isHostlive = subDivLower === "hostlive";
    const isAdvertiser = subDivLower === "advertiser";
    const isPenjahit = subDivLower === "penjahit";
    const isJne = employee.penempatan === "JNE";
    const isShiftEligible =
      isTokoGudangPlacement(employee.penempatan) || isMedia || isHostlive || isAdvertiser || isJne;

    const scheduledShift = isShiftEligible
      ? await getScheduledShiftForDate(employee.id, attendanceDate)
      : null;
    const effectiveScheduledShift =
      scheduledShift && scheduledShift !== "libur" ? scheduledShift : null;

    // Penjahit fleksibel (setengah hari) tidak punya jadwal shift → lewati cek pulang awal.
    // Untuk lainnya, pakai shift terjadwal bila ada; jika tidak, fallback deteksi dari jam.
    const earlyLeaveFlagged =
      !isPenjahit &&
      isEarlyLeaveByTime(attendance.jam_masuk_str, checkOutTime, effectiveScheduledShift);
    if (earlyLeaveFlagged && !keterangan) {
      return NextResponse.json(
        { message: "Kamu pulang lebih awal dari jadwal. Wajib mengisi keterangan sebelum submit." },
        { status: 400 },
      );
    }

    const photoPath = await saveAttendancePhoto(body.photoDataUrl, employee.id, "out");

    if (isShiftEligible && attendance.jam_masuk_str) {
      const finalShift =
        effectiveScheduledShift ??
        detectTokoGudangShiftFinal(attendance.jam_masuk_str, checkOutTime);

      await pool.query(
        `
          UPDATE absensi
          SET
            jam_pulang = ?,
            foto_pulang = ?,
            latitude_pulang = ?,
            longitude_pulang = ?,
            shift = ?,
            keterangan = ?
          WHERE id = ?
        `,
        [
          attendanceDateTime,
          photoPath,
          body.latitude,
          body.longitude,
          finalShift,
          keterangan,
          attendance.id,
        ],
      );
    } else {
      await pool.query(
        `
          UPDATE absensi
          SET
            jam_pulang = ?,
            foto_pulang = ?,
            latitude_pulang = ?,
            longitude_pulang = ?,
            keterangan = ?
          WHERE id = ?
        `,
        [attendanceDateTime, photoPath, body.latitude, body.longitude, keterangan, attendance.id],
      );
    }

    return NextResponse.json({ message: "Presensi pulang berhasil disimpan." });
  } catch (error) {
    console.error("Employee check-out error", error);

    return NextResponse.json(
      { message: "Gagal menyimpan presensi pulang." },
      { status: 500 },
    );
  }
}
