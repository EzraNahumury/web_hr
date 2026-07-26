import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentEmployeeSession } from "@/lib/auth";
import {
  detectTokoGudangShift,
  ensureAttendanceShiftSupport,
  getJakartaDate,
  getJakartaDateTime,
  getBlockingMissingCheckout,
  getShiftLateMinutes,
  getShiftRangeLabel,
  isAttendanceApprovalRuleActive,
  isSundayDate,
  isTokoGudangPlacement,
  isWithinScheduledShiftRange,
  saveAttendancePhoto,
  type AttendanceShift,
} from "@/lib/attendance";
import { resolveAssignedApprover } from "@/lib/attendance-approver";
import { saveUploadedFile } from "@/lib/uploads";
import { checkGeofence, MAX_GEOFENCE_RADIUS_METERS } from "@/lib/geofence";
import { getScheduledShiftForDate } from "@/lib/jadwal-karyawan";

type EmployeeRow = RowDataPacket & {
  id: number;
  penempatan: string | null;
  penempatan_extra: string | null;
  sub_divisi: string | null;
  jabatan: string | null;
  status_kepegawaian: string | null;
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
      "SELECT id, penempatan, penempatan_extra, sub_divisi, jabatan, status_kepegawaian FROM karyawan WHERE user_id = ? LIMIT 1",
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
    }

    const attendanceDate = getJakartaDate();
    const attendanceDateTime = getJakartaDateTime();
    const currentTime = attendanceDateTime.split(" ")[1];
    const isSunday = isSundayDate(attendanceDate);

    // Blokir: kalau ada hari lampau yang HADIR tapi belum absen pulang & belum dipulihkan admin.
    const blockingDate = await getBlockingMissingCheckout(employee.id, attendanceDate);
    if (blockingDate) {
      return NextResponse.json(
        {
          message:
            "Mohon maaf, kamu diblokir dari absensi hari ini karena belum melakukan presensi pulang di hari sebelumnya. Silakan hubungi admin untuk memulihkan akun Anda.",
          blocked: true,
        },
        { status: 403 },
      );
    }

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
    const subDivLower = (employee.sub_divisi ?? "").trim().toLowerCase();
    const isMedia = subDivLower === "media";
    const isHostlive = subDivLower === "hostlive";
    const isAdvertiser = subDivLower === "advertiser";
    const isJne = detectedPlacement === "JNE";
    const isFreelance =
      [employee.status_kepegawaian, employee.jabatan].some(
        (v) => (v ?? "").trim().toLowerCase() === "freelance",
      );
    // Partime: shift TETAP 17:00-22:00 (toleransi 5 mnt, masuk mulai 16:30), apa pun jadwal/penempatan.
    const isPartime = (employee.status_kepegawaian ?? "").trim().toLowerCase() === "partime";
    // Partime hari MINGGU: jam masuk BEBAS (tidak dikunci window, tidak dihitung telat).
    // Wajib 5 jam diperiksa saat pulang (check-out).
    const isPartimeSunday = isPartime && isSunday;
    const isShiftEligible =
      requiresSelfie && (isTokoGudangPlacement(detectedPlacement) || isMedia || isHostlive || isAdvertiser || isJne);
    // Jadwal SELALU dicek berdasar karyawan (bukan placement hasil geofence). Ini menutup
    // celah: geofence bisa "kepleset" memilih placement non-shift terdekat (mis. Office)
    // padahal karyawan dijadwalkan shift -> dulu enforcement hilang. Sekarang: kalau ada
    // jadwal shift hari ini, range shift SELALU ditegakkan.
    const scheduledShift = requiresSelfie
      ? await getScheduledShiftForDate(employee.id, attendanceDate)
      : null;

    if (scheduledShift === "libur") {
      return NextResponse.json(
        {
          message:
            "Anda dijadwalkan libur hari ini. Hubungi atasan jika perlu mengubah jadwal sebelum presensi.",
        },
        { status: 403 },
      );
    }

    if (
      scheduledShift &&
      requiresSelfie &&
      attendanceRequestStatus === "hadir" &&
      !isPartimeSunday
    ) {
      const shiftKey = scheduledShift as AttendanceShift;
      if (!isWithinScheduledShiftRange(currentTime, shiftKey)) {
        return NextResponse.json(
          {
            message: `Di luar jam shift Anda. Jadwal hari ini: ${getShiftRangeLabel(shiftKey)}. Presensi hanya bisa dilakukan dalam rentang tersebut.`,
          },
          { status: 403 },
        );
      }
    }

    // Partime: presensi masuk hanya dalam rentang shift partime (16:30 - 22:00).
    // Kecuali hari Minggu: jam masuk bebas (isPartimeSunday) → window tidak ditegakkan.
    if (isPartime && !isPartimeSunday && requiresSelfie && attendanceRequestStatus === "hadir") {
      if (!isWithinScheduledShiftRange(currentTime, "partime")) {
        return NextResponse.json(
          {
            message: `Di luar jam presensi Partime (${getShiftRangeLabel("partime")}). Presensi masuk paling awal 16:30.`,
          },
          { status: 403 },
        );
      }
    }

    // detectedShift: partime SELALU "partime"; selain itu pakai jadwal / deteksi placement.
    const detectedShift: AttendanceShift | null = isPartime
      ? "partime"
      : scheduledShift
        ? (scheduledShift as AttendanceShift)
        : isShiftEligible
          ? detectTokoGudangShift(currentTime)
          : null;
    // Aturan baru per 5 Juli 2026: setengah hari DIHAPUS. Kalau request "setengah_hari"
    // datang (mis. dari app lama), perlakukan sebagai "hadir".
    const effectiveRequestStatus: AttendanceRequestStatus =
      attendanceRequestStatus === "setengah_hari" ? "hadir" : attendanceRequestStatus;

    // Keterlambatan: karyawan ber-jadwal pakai shift-nya. Non-shift (office, penjahit)
    // pakai jam kerja standar "pagi" (masuk 08:30). Freelance dikecualikan.
    const lateShift: AttendanceShift | null =
      detectedShift ?? (!isFreelance ? "pagi" : null);
    const lateMinutes =
      requiresSelfie && lateShift && effectiveRequestStatus === "hadir" && !isPartimeSunday
        ? getShiftLateMinutes(currentTime, lateShift)
        : 0;
    const attendanceStatus =
      effectiveRequestStatus === "izin"
        ? "izin"
        : effectiveRequestStatus === "sakit" || effectiveRequestStatus === "sakit_tanpa_surat"
          ? "sakit"
          : "hadir";
    const attendanceCode =
      effectiveRequestStatus === "izin"
        ? "I"
        : effectiveRequestStatus === "sakit"
          ? "S"
          : effectiveRequestStatus === "sakit_tanpa_surat"
            ? "SX"
            : lateMinutes > 0
              ? "T"
              : "O";
    const attendanceTime = requiresSelfie ? attendanceDateTime : null;
    const attendanceLatitude = requiresSelfie ? latitude : null;
    const attendanceLongitude = requiresSelfie ? longitude : null;

    // ── Approval telat (aturan baru per 5 Juli 2026) ──
    // Kalau karyawan (non-freelance) datang TELAT pada tanggal >= aturan baru, maka
    // WAJIB isi keterangan (alasan) + pilih atasan tujuan. Record tersimpan pending;
    // sebelum di-approve dianggap tidak bekerja (alfa) di rekap & payroll.
    const needsLateApproval =
      isAttendanceApprovalRuleActive(attendanceDate) &&
      effectiveRequestStatus === "hadir" &&
      lateMinutes > 0 &&
      !isFreelance;

    let butuhApproval = 0;
    let approvalStatus: string | null = null;
    let approvalJenis: string | null = null;
    let assignedApproverUserId: number | null = null;

    if (needsLateApproval) {
      if (!keterangan?.trim()) {
        return NextResponse.json(
          { message: "Kamu datang terlambat. Wajib mengisi keterangan (alasan) sebelum submit.", needApproval: true },
          { status: 400 },
        );
      }
      const approver = await resolveAssignedApprover(
        typeof formData.get("assignedApproverUserId") === "string"
          ? String(formData.get("assignedApproverUserId"))
          : null,
      );
      if (!approver.ok) {
        return NextResponse.json({ message: approver.error, needApproval: true }, { status: 400 });
      }
      butuhApproval = 1;
      approvalStatus = "pending";
      approvalJenis = "telat";
      assignedApproverUserId = approver.assignedApproverUserId;
    }

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
          keterangan,
          butuh_approval,
          approval_status,
          approval_jenis,
          assigned_approver_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)
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
        keterangan,
        butuhApproval,
        approvalStatus,
        approvalJenis,
        assignedApproverUserId,
      ],
    );

    if (needsLateApproval) {
      return NextResponse.json({
        message:
          "Presensi masuk tercatat, tapi karena terlambat perlu approval atasan. Kehadiran dihitung setelah di-approve.",
        needApproval: true,
      });
    }

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
