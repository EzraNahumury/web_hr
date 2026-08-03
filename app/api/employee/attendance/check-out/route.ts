import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getCurrentEmployeeSession } from "@/lib/auth";
import {
  detectTokoGudangShiftFinal,
  ensureAttendanceShiftSupport,
  getJakartaDate,
  getJakartaDateTime,
  isAttendanceApprovalRuleActive,
  isDurationUnderMinutes,
  isEarlyLeaveByTime,
  isTokoGudangPlacement,
  PARTIME_MIN_WORK_MINUTES,
  saveAttendancePhoto,
} from "@/lib/attendance";
import { resolveAssignedApprover } from "@/lib/attendance-approver";
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
  jam_masuk_str: string | null;
  jam_pulang: Date | null;
  status_absensi: string | null;
  butuh_approval: number | null;
  approval_status: string | null;
  assigned_approver_user_id: number | null;
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
      assignedApproverUserId?: string;
    };

    if (!body.photoDataUrl || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json(
        { message: "Selfie dan lokasi wajib dikirim." },
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

    // Baca SEMUA penempatan (utama + tambahan) supaya karyawan bisa check-out dari lokasi
    // ke-2/ke-3 yang sudah di-set, dan WFA (di mana pun) tetap dibebaskan. Konsisten dgn check-in.
    const allPlacements = [
      employee.penempatan,
      ...(employee.penempatan_extra ? employee.penempatan_extra.split(",").map((s) => s.trim()) : []),
    ].filter(Boolean) as string[];

    const geofence = checkGeofence(allPlacements, body.latitude, body.longitude);
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
               DATE_FORMAT(jam_masuk, '%H:%i') AS jam_masuk_str,
               butuh_approval, approval_status, assigned_approver_user_id
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

    // Placement yang benar-benar dipakai = hasil geofence (lokasi tempat karyawan berada),
    // bukan sekadar penempatan utama. Supaya deteksi shift Toko/Gudang/JNE ikut lokasi aktual.
    const detectedPlacement = geofence.placement ?? employee.penempatan;
    const subDivLower = (employee.sub_divisi ?? "").trim().toLowerCase();
    const isMedia = subDivLower === "media";
    const isHostlive = subDivLower === "hostlive";
    const isAdvertiser = subDivLower === "advertiser";
    const isFreelance = [employee.status_kepegawaian, employee.jabatan].some(
      (v) => (v ?? "").trim().toLowerCase() === "freelance",
    );
    // Partime: presensi BEBAS setiap hari, wajib kerja 5 jam. PA dinilai dari DURASI kerja
    // (pulang < masuk + 5 jam), bukan dari jam pulang tetap.
    const isPartime = (employee.status_kepegawaian ?? "").trim().toLowerCase() === "partime";
    const isJne = detectedPlacement === "JNE";
    const isShiftEligible =
      isTokoGudangPlacement(detectedPlacement) || isMedia || isHostlive || isAdvertiser || isJne;

    // Jadwal dicek berdasar karyawan (bukan placement) supaya konsisten dengan check-in.
    const scheduledShift = !isFreelance
      ? await getScheduledShiftForDate(employee.id, attendanceDate)
      : null;
    // Non-shift (office, penjahit) pakai jam kerja standar "pagi" (pulang 16:30) sebagai
    // acuan pulang awal. Freelance dikecualikan.
    const effectiveScheduledShift =
      isPartime
        ? "partime"
        : scheduledShift && scheduledShift !== "libur"
          ? scheduledShift
          : !isFreelance
            ? "pagi"
            : null;

    // Hanya freelance yang fleksibel (tidak terikat jam pulang).
    const isHalfDay = attendance.status_absensi === "setengah_hari";
    const earlyLeaveFlagged =
      !isFreelance &&
      !isHalfDay &&
      (isPartime
        ? isDurationUnderMinutes(attendance.jam_masuk_str, checkOutTime, PARTIME_MIN_WORK_MINUTES)
        : isEarlyLeaveByTime(attendance.jam_masuk_str, checkOutTime, effectiveScheduledShift));

    // ── Approval pulang awal (aturan baru per 5 Juli 2026) ──
    // Pulang awal (non-freelance) wajib approval atasan. Kalau sudah ada approval telat yang
    // pending, cukup gabung (telat_pulang_awal); kalau belum ada, minta atasan tujuan baru.
    const ruleActive = isAttendanceApprovalRuleActive(attendanceDate);
    const existingPending = attendance.butuh_approval === 1 && attendance.approval_status === "pending";
    const existingFinal =
      attendance.butuh_approval === 1 &&
      (attendance.approval_status === "approved" || attendance.approval_status === "rejected");
    const needsEarlyApproval = earlyLeaveFlagged && ruleActive && !isFreelance && !existingFinal;

    // Parameter approval baru yang perlu ditulis (null = tidak diubah).
    let earlyButuhApproval: number | null = null;
    let earlyApprovalStatus: string | null = null;
    let earlyApprovalJenis: string | null = null;
    let earlyAssignedApprover: number | null = null;

    if (earlyLeaveFlagged && !keterangan) {
      return NextResponse.json(
        { message: "Kamu pulang lebih awal dari jadwal. Wajib mengisi keterangan (alasan) sebelum submit.", needApproval: needsEarlyApproval },
        { status: 400 },
      );
    }

    if (needsEarlyApproval) {
      if (existingPending) {
        // Sudah ada approval telat pending → gabung jadi telat + pulang awal, approver tetap.
        earlyApprovalJenis = "telat_pulang_awal";
      } else {
        // Belum ada approval (tadi masuk tepat waktu) → minta atasan tujuan.
        const approver = await resolveAssignedApprover(body.assignedApproverUserId ?? null);
        if (!approver.ok) {
          return NextResponse.json({ message: approver.error, needApproval: true }, { status: 400 });
        }
        earlyButuhApproval = 1;
        earlyApprovalStatus = "pending";
        earlyApprovalJenis = "pulang_awal";
        earlyAssignedApprover = approver.assignedApproverUserId;
      }
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

    // Tulis/gabung approval pulang awal bila perlu.
    if (needsEarlyApproval) {
      if (earlyButuhApproval !== null) {
        // Belum ada approval sebelumnya → set baru (pulang awal).
        await pool.query(
          `UPDATE absensi
             SET butuh_approval = ?, approval_status = ?, approval_jenis = ?, assigned_approver_user_id = ?
           WHERE id = ?`,
          [earlyButuhApproval, earlyApprovalStatus, earlyApprovalJenis, earlyAssignedApprover, attendance.id],
        );
      } else if (earlyApprovalJenis) {
        // Sudah ada approval telat pending → gabung jenis jadi telat_pulang_awal.
        await pool.query(`UPDATE absensi SET approval_jenis = ? WHERE id = ?`, [
          earlyApprovalJenis,
          attendance.id,
        ]);
      }
      return NextResponse.json({
        message:
          "Presensi pulang tercatat, tapi karena pulang lebih awal perlu approval atasan. Kehadiran dihitung setelah di-approve.",
        needApproval: true,
      });
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
