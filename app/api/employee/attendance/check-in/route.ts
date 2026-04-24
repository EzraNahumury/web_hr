import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentEmployeeSession } from "@/lib/auth";
import {
  detectTokoGudangShift,
  ensureAttendanceShiftSupport,
  getJakartaDate,
  getJakartaDateTime,
  getShiftLateMinutes,
  isTokoGudangPlacement,
  saveAttendancePhoto,
  type AttendanceShift,
} from "@/lib/attendance";
import { saveUploadedFile } from "@/lib/uploads";
import { checkGeofence, MAX_GEOFENCE_RADIUS_METERS } from "@/lib/geofence";

type EmployeeRow = RowDataPacket & {
  id: number;
  penempatan: string | null;
  penempatan_extra: string | null;
};

type AttendanceRow = RowDataPacket & {
  id: number;
  jam_masuk: Date | null;
  status_absensi: string | null;
};

type AttendanceRequestStatus =
  | "hadir"
  | "izin"
  | "sakit"
  | "sakit_tanpa_surat"
  | "setengah_hari";

export async function POST(request: Request) {
  try {
    await ensureAttendanceShiftSupport();

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

    if (
      status !== "hadir" &&
      status !== "izin" &&
      status !== "sakit" &&
      status !== "sakit_tanpa_surat" &&
      status !== "setengah_hari"
    ) {
      return NextResponse.json({ message: "Status presensi tidak valid." }, { status: 400 });
    }

    const attendanceRequestStatus = status as AttendanceRequestStatus;
    const requiresSelfie =
      attendanceRequestStatus === "hadir" || attendanceRequestStatus === "setengah_hari";
    const requiresSickProof = attendanceRequestStatus === "sakit";
    const requiresNote =
      attendanceRequestStatus === "izin" || attendanceRequestStatus === "sakit_tanpa_surat";

    if (
      requiresSelfie &&
      (!photoDataUrl || !Number.isFinite(latitude) || !Number.isFinite(longitude))
    ) {
      return NextResponse.json(
        { message: "Selfie dan lokasi wajib dikirim." },
        { status: 400 },
      );
    }

    if (requiresSickProof && !(sickProof instanceof File && sickProof.size > 0)) {
      return NextResponse.json(
        { message: "Bukti sakit wajib diupload." },
        { status: 400 },
      );
    }

    if (requiresNote && !keterangan?.trim()) {
      return NextResponse.json(
        { message: "Keterangan wajib diisi untuk status ini." },
        { status: 400 },
      );
    }

    const [employeeRows] = await pool.query<EmployeeRow[]>(
      "SELECT id, penempatan, penempatan_extra FROM karyawan WHERE user_id = ? LIMIT 1",
      [session.userId],
    );

    const employee = employeeRows[0];

    if (!employee) {
      return NextResponse.json({ message: "Data karyawan tidak ditemukan." }, { status: 404 });
    }

    const allPlacements = [
      employee.penempatan,
      ...(employee.penempatan_extra ? employee.penempatan_extra.split(",").map((s) => s.trim()) : []),
    ].filter(Boolean) as string[];

    if (requiresSelfie) {
      const geofence = checkGeofence(allPlacements, latitude, longitude);
      if (!geofence.valid) {
        return NextResponse.json(
          {
            message: geofence.message,
            geofence: {
              reason: geofence.reason,
              distanceMeters: geofence.distanceMeters,
              maxRadiusMeters: MAX_GEOFENCE_RADIUS_METERS,
              targetLabel: geofence.location?.label ?? null,
              targetLatitude: geofence.location?.latitude ?? null,
              targetLongitude: geofence.location?.longitude ?? null,
              placement: geofence.placement,
            },
          },
          { status: 403 },
        );
      }
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

    const photoPath = requiresSelfie
      ? await saveAttendancePhoto(photoDataUrl, employee.id, "in")
      : requiresSickProof
        ? await saveUploadedFile(sickProof as File, "attendance")
        : null;
    const detectedPlacement = requiresSelfie
      ? (checkGeofence(allPlacements, latitude, longitude).placement ?? employee.penempatan)
      : employee.penempatan;
    const detectedShift: AttendanceShift | null = requiresSelfie && isTokoGudangPlacement(detectedPlacement)
      ? detectTokoGudangShift(currentTime)
      : null;
    const lateMinutes = requiresSelfie
      ? getShiftLateMinutes(currentTime, detectedShift ?? "pagi")
      : 0;
    const attendanceStatus =
      attendanceRequestStatus === "izin"
        ? "izin"
        : attendanceRequestStatus === "setengah_hari"
          ? "setengah_hari"
          : attendanceRequestStatus === "sakit" || attendanceRequestStatus === "sakit_tanpa_surat"
            ? "sakit"
            : "hadir";
    const attendanceCode =
      attendanceRequestStatus === "izin"
        ? "X"
        : attendanceRequestStatus === "sakit"
          ? "S"
          : attendanceRequestStatus === "sakit_tanpa_surat"
            ? "SX"
            : attendanceRequestStatus === "setengah_hari"
              ? "H"
              : "O";
    const attendanceTime = requiresSelfie ? attendanceDateTime : null;
    const attendanceLatitude = requiresSelfie ? latitude : null;
    const attendanceLongitude = requiresSelfie ? longitude : null;
    const halfDayFlag = attendanceRequestStatus === "setengah_hari" ? 1 : 0;

    await pool.query(
      `
        INSERT INTO absensi (
          karyawan_id,
          tanggal,
          jam_masuk,
          status_absensi,
          kode_absensi,
          shift,
          foto_masuk,
          latitude_masuk,
          longitude_masuk,
          terlambat_menit,
          setengah_hari,
          lembur_jam,
          keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `,
      [
        employee.id,
        attendanceDate,
        attendanceTime,
        attendanceStatus,
        attendanceCode,
        detectedShift,
        photoPath,
        attendanceLatitude,
        attendanceLongitude,
        lateMinutes,
        halfDayFlag,
        keterangan,
      ],
    );

    return NextResponse.json({
      message:
        attendanceRequestStatus === "sakit"
          ? "Laporan sakit dengan surat berhasil disimpan."
          : attendanceRequestStatus === "sakit_tanpa_surat"
            ? "Laporan sakit tanpa surat berhasil disimpan."
            : attendanceRequestStatus === "izin"
              ? "Status izin/off berhasil disimpan."
              : attendanceRequestStatus === "setengah_hari"
                ? "Presensi setengah hari berhasil disimpan."
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
