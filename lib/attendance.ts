import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";
import { saveBufferToUploads } from "@/lib/uploads";

// Tanggal mulai berlakunya aturan baru absensi (per 5 Juli 2026):
// - Setengah hari DIHAPUS (tidak lagi diberlakukan). Tanggal sebelum ini dibiarkan apa adanya.
// - Telat / pulang awal WAJIB approval atasan. Belum di-approve -> dihitung tidak bekerja (alfa).
export const ATTENDANCE_RULE_CHANGE_DATE = "2026-07-05";

// Aturan approval telat/pulang-awal aktif untuk tanggal >= ATTENDANCE_RULE_CHANGE_DATE.
export function isAttendanceApprovalRuleActive(dateSql: string | null | undefined): boolean {
  if (!dateSql) return false;
  return dateSql >= ATTENDANCE_RULE_CHANGE_DATE;
}

// Setengah hari HANYA berlaku untuk tanggal sebelum aturan baru (tanggal lama dibiarkan).
export function isHalfDayRuleActive(dateSql: string | null | undefined): boolean {
  if (!dateSql) return true; // tanpa tanggal -> anggap lama (aman untuk record legacy)
  return dateSql < ATTENDANCE_RULE_CHANGE_DATE;
}

function getJakartaParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function getJakartaDate() {
  const parts = getJakartaParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getJakartaDateTime() {
  const parts = getJakartaParts();
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export type AttendanceShift =
  | "pagi"
  | "lembur"
  | "siang"
  | "setengah_1"
  | "setengah_2"
  | "pagi_full"
  | "pagi_short"
  | "siang_sore"
  | "jne_pagi"
  | "jne_siang"
  | "jne_minggu"
  | "partime"
  | "ayres_siang";

// Record<string, ...> agar shift CUSTOM (kode dinamis dari shift_def) bisa di-merge saat
// runtime lewat ensureShiftDefsLoaded(). Entri built-in di bawah TIDAK pernah ditimpa.
const SHIFT_START: Record<string, number> = {
  pagi: 8 * 60 + 30,         // 08:30
  lembur: 10 * 60,           // 10:00
  siang: 12 * 60,            // 12:00
  setengah_1: 13 * 60,       // 13:00
  setengah_2: 8 * 60 + 30,   // 08:30
  pagi_full: 8 * 60 + 30,    // 08:30 (selesai 17:00)
  pagi_short: 8 * 60 + 30,   // 08:30 (selesai 15:00)
  siang_sore: 12 * 60,       // 12:00 (selesai 17:00)
  jne_pagi: 8 * 60,          // 08:00 (selesai 16:00)
  jne_siang: 14 * 60,        // 14:00 (selesai 21:00)
  jne_minggu: 13 * 60,       // 13:00 (selesai 20:00)
  partime: 17 * 60,          // 17:00 (Partime — selesai 22:00)
  ayres_siang: 14 * 60,      // 14:00 (Ayres Siang — selesai 22:00)
};

// Kode shift bawaan (di-snapshot sebelum merge custom) — dipakai untuk melindungi jam
// built-in dari penimpaan saat merge shift custom.
const BUILTIN_SHIFT_CODES = new Set(Object.keys(SHIFT_START));

// Toleransi keterlambatan per shift. Jika lateMinutes <= tolerance maka dianggap tepat waktu.
const SHIFT_TOLERANCE_MINUTES: Partial<Record<string, number>> = {
  jne_pagi: 10,
  jne_siang: 10,
  jne_minggu: 10,
  partime: 5, // toleransi 5 menit → telat bila masuk > 17:05
};

type Range = readonly [number, number];

const CHECKIN_WINDOW: Record<string, Range> = {
  pagi:       [8 * 60,            8 * 60 + 30],   // 08:00-08:30
  lembur:     [9 * 60 + 45,       10 * 60],       // 09:45-10:00
  siang:      [11 * 60 + 45,      12 * 60],       // 11:45-12:00
  setengah_1: [10 * 60 + 30,      13 * 60],       // 10:30-13:00
  setengah_2: [8 * 60,            8 * 60 + 30],   // 08:00-08:30
  pagi_full:  [8 * 60,            8 * 60 + 30],   // 08:00-08:30
  pagi_short: [8 * 60,            8 * 60 + 30],   // 08:00-08:30
  siang_sore: [11 * 60 + 45,      12 * 60],       // 11:45-12:00
  jne_pagi:   [7 * 60 + 30,       11 * 60],       // 07:30-11:00 (tolerance 10 min via SHIFT_TOLERANCE)
  jne_siang:  [13 * 60 + 30,      17 * 60],       // 13:30-17:00
  jne_minggu: [12 * 60 + 30,      14 * 60],       // 12:30-14:00
  partime:    [16 * 60 + 30,      22 * 60],       // 16:30-22:00 (masuk mulai 16:30, tepat waktu s/d 17:05)
  ayres_siang:[13 * 60 + 30,      14 * 60 + 30],  // 13:30-14:30 (masuk mulai 13:30, tepat waktu s/d 14:05)
};

const CHECKOUT_WINDOW: Record<string, Range> = {
  pagi:       [16 * 60 + 30,      17 * 60 + 30],  // 16:30-17:30
  lembur:     [20 * 60,           21 * 60],       // 20:00-21:00
  siang:      [20 * 60,           21 * 60],       // 20:00-21:00
  setengah_1: [16 * 60 + 30,      17 * 60 + 30],  // 16:30-17:30
  setengah_2: [12 * 60,           13 * 60],       // 12:00-13:00
  pagi_full:  [16 * 60 + 30,      17 * 60 + 30],  // 16:30-17:30
  pagi_short: [14 * 60 + 30,      15 * 60 + 30],  // 14:30-15:30
  siang_sore: [16 * 60 + 30,      17 * 60 + 30],  // 16:30-17:30
  jne_pagi:   [15 * 60 + 30,      16 * 60 + 30],  // 15:30-16:30
  jne_siang:  [20 * 60 + 30,      21 * 60 + 30],  // 20:30-21:30
  jne_minggu: [19 * 60 + 30,      20 * 60 + 30],  // 19:30-20:30
  partime:    [22 * 60,           23 * 60],       // pulang 22:00 → pulang sebelum 22:00 dianggap PA
  ayres_siang:[22 * 60,           23 * 60],       // pulang 22:00 → pulang sebelum 22:00 dianggap PA
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function inRange(minutes: number, range: Range): boolean {
  return minutes >= range[0] && minutes <= range[1];
}

export function detectTokoGudangShift(checkInTime: string): AttendanceShift | null {
  const ci = timeToMinutes(checkInTime);
  if (inRange(ci, CHECKIN_WINDOW.lembur)) return "lembur";
  if (inRange(ci, CHECKIN_WINDOW.siang)) return "siang";
  if (inRange(ci, CHECKIN_WINDOW.pagi)) return "pagi";
  if (inRange(ci, CHECKIN_WINDOW.setengah_1)) return "setengah_1";
  return null;
}

export function detectTokoGudangShiftFinal(
  checkInTime: string,
  checkOutTime: string,
): AttendanceShift | null {
  const ci = timeToMinutes(checkInTime);
  const co = timeToMinutes(checkOutTime);

  if (inRange(ci, CHECKIN_WINDOW.lembur) && inRange(co, CHECKOUT_WINDOW.lembur)) return "lembur";
  if (inRange(ci, CHECKIN_WINDOW.siang) && inRange(co, CHECKOUT_WINDOW.siang)) return "siang";
  if (inRange(ci, CHECKIN_WINDOW.pagi) && inRange(co, CHECKOUT_WINDOW.pagi)) return "pagi";
  if (inRange(ci, CHECKIN_WINDOW.setengah_1) && inRange(co, CHECKOUT_WINDOW.setengah_1)) return "setengah_1";
  if (inRange(ci, CHECKIN_WINDOW.setengah_2) && inRange(co, CHECKOUT_WINDOW.setengah_2)) return "setengah_2";
  return null;
}

export function detectShiftFromCheckIn(checkInTime: string): AttendanceShift | null {
  const mins = timeToMinutes(checkInTime);
  const order: AttendanceShift[] = [
    "lembur",
    "siang",
    "siang_sore",
    "pagi",
    "pagi_full",
    "pagi_short",
    "setengah_2",
    "setengah_1",
    "jne_pagi",
    "jne_siang",
    "jne_minggu",
  ];
  for (const shift of order) {
    if (inRange(mins, CHECKIN_WINDOW[shift])) return shift;
  }
  return null;
}

// Aturan setengah hari berbasis jam. Satu sumber kebenaran untuk rekap absensi & payroll.
// - Manual: kalau karyawan memilih "Setengah Hari" saat check-in (halfDayFlag === 1) -> selalu half.
// - Karyawan NON-SHIFT (hasShift = false), masuk & pulang dua-duanya harus di window:
//     * Setengah Hari 1 : masuk 10:30 - 13:00 DAN pulang 16:30 - 17:30
//     * Setengah Hari 2 : masuk 08:00 - 08:30 DAN pulang 12:00 - 13:00
// - Karyawan BER-SHIFT (toko/gudang/media/jne): pakai window lama (masuk & pulang dua-duanya
//   di 08:30-12:00 untuk pagi, atau 13:00-16:30 untuk siang) supaya perilakunya tidak berubah.
export function isHalfDayByTime(
  timeIn: string | null | undefined,
  timeOut: string | null | undefined,
  halfDayFlag: number,
  hasShift: boolean,
): boolean {
  if (halfDayFlag === 1) return true;
  if (!timeIn || !timeOut) return false;

  const within = (t: string, a: string, b: string) => t >= a && t <= b;

  if (hasShift) {
    const pagi = within(timeIn, "08:30", "12:00") && within(timeOut, "08:30", "12:00");
    const siang = within(timeIn, "13:00", "16:30") && within(timeOut, "13:00", "16:30");
    return pagi || siang;
  }

  // Non-shift: aturan baru (sesuai window setengah_1 & setengah_2)
  const setengah1 = within(timeIn, "10:30", "13:00") && within(timeOut, "16:30", "17:30");
  const setengah2 = within(timeIn, "08:00", "08:30") && within(timeOut, "12:00", "13:00");
  return setengah1 || setengah2;
}

export function isEarlyLeaveByTime(
  checkInTime: string | null | undefined,
  checkOutTime: string | null | undefined,
  knownShift?: string | null,
): boolean {
  if (!checkInTime || !checkOutTime) return false;
  const candidate = knownShift && knownShift in CHECKOUT_WINDOW
    ? (knownShift as AttendanceShift)
    : detectShiftFromCheckIn(checkInTime);
  if (!candidate) return false;
  const outMins = timeToMinutes(checkOutTime);
  const coStart = CHECKOUT_WINDOW[candidate][0];
  return outMins < coStart;
}

// ── Aturan PARTIME (setiap hari, Senin–Minggu) ─────────────────────────────────
// Partime presensi BEBAS jam berapa saja, tidak dihitung telat, tapi WAJIB kerja 5 jam.
// Pulang sebelum 5 jam sejak jam masuk = pulang awal (PA) → sama seperti PA biasa
// (butuh keterangan + approval atasan).
export const PARTIME_MIN_WORK_MINUTES = 5 * 60; // 5 jam

// Minggu (WIB) berdasar tanggal absensi "YYYY-MM-DD". Diparse sebagai UTC agar
// bebas dari timezone server (tanggal sudah kalender WIB dari getJakartaDate()).
export function isSundayDate(dateSql: string | null | undefined): boolean {
  if (!dateSql) return false;
  const d = new Date(`${dateSql}T00:00:00Z`);
  return d.getUTCDay() === 0; // 0 = Minggu
}

// True bila durasi kerja (jam pulang − jam masuk) kurang dari minMinutes.
export function isDurationUnderMinutes(
  checkInTime: string | null | undefined,
  checkOutTime: string | null | undefined,
  minMinutes: number,
): boolean {
  if (!checkInTime || !checkOutTime) return false;
  const worked = timeToMinutes(checkOutTime) - timeToMinutes(checkInTime);
  return worked < minMinutes;
}

export function isCheckInWithinOnTimeWindow(
  checkInTime: string | null | undefined,
  knownShift?: string | null,
  toleranceMinutes = 5,
): boolean {
  if (!checkInTime) return false;
  const candidate = knownShift && knownShift in SHIFT_START
    ? (knownShift as AttendanceShift)
    : detectShiftFromCheckIn(checkInTime);
  if (!candidate) return false;
  const mins = timeToMinutes(checkInTime);
  const start = SHIFT_START[candidate];
  return mins > start && mins <= start + toleranceMinutes;
}

// Shift pagi: kalau jam masuk sudah lewat 11:30, otomatis dihitung SETENGAH HARI
// (bukan telat), walaupun di Set Jadwal shift-nya pagi. Hanya berlaku utk shift pagi.
export const PAGI_AUTO_HALF_DAY_CUTOFF_MIN = 11 * 60 + 30; // 11:30
const PAGI_AUTO_HALF_DAY_SHIFTS = new Set<AttendanceShift>(["pagi", "pagi_full", "pagi_short"]);

export function isPagiAutoHalfDay(
  shift: AttendanceShift | null | undefined,
  checkInTime: string | null | undefined,
): boolean {
  if (!shift || !checkInTime) return false;
  if (!PAGI_AUTO_HALF_DAY_SHIFTS.has(shift)) return false;
  return timeToMinutes(checkInTime) > PAGI_AUTO_HALF_DAY_CUTOFF_MIN;
}

export function getShiftLateMinutes(time: string, shift: AttendanceShift): number {
  const start = SHIFT_START[shift];
  if (start === undefined) return 0; // shift custom belum ter-load → jangan hitung telat asal
  const mins = timeToMinutes(time);
  const lateRaw = Math.max(mins - start, 0);
  // Default toleransi 5 menit untuk semua shift; JNE tetap 10 menit lewat SHIFT_TOLERANCE_MINUTES override.
  const tolerance = SHIFT_TOLERANCE_MINUTES[shift] ?? 5;
  return lateRaw <= tolerance ? 0 : lateRaw;
}

function minutesToTimeLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isWithinScheduledShiftRange(
  time: string,
  shift: AttendanceShift,
): boolean {
  const mins = timeToMinutes(time);
  const ciWindow = CHECKIN_WINDOW[shift];
  const coWindow = CHECKOUT_WINDOW[shift];
  if (!ciWindow || !coWindow) return true; // shift tak dikenal → jangan blokir presensi
  return mins >= ciWindow[0] && mins <= coWindow[1];
}

export function getShiftRangeLabel(shift: AttendanceShift): string {
  const ci = CHECKIN_WINDOW[shift];
  const co = CHECKOUT_WINDOW[shift];
  if (!ci || !co) return "";
  return `${minutesToTimeLabel(ci[0])} - ${minutesToTimeLabel(co[1])}`;
}

export function getCheckInLateMinutes(time: string) {
  return getShiftLateMinutes(time, "pagi");
}

// Toko Solo dihilangkan dari list — mereka hanya 1 shift (pagi default 08:30),
// jadi pakai logika default tanpa Set Jadwal.
const TOKO_GUDANG_PLACEMENTS = new Set(["Toko", "Gudang"]);

export function isTokoGudangPlacement(penempatan: string | null | undefined): boolean {
  return TOKO_GUDANG_PLACEMENTS.has(penempatan ?? "");
}

// Merge shift CUSTOM (jam dari tabel shift_def) ke map jam di atas. Entri built-in TIDAK
// pernah ditimpa. Panggil sebelum menghitung telat/PA agar shift custom terjadwal dikenali.
// Selalu reload (query kecil) supaya shift custom yang baru dibuat langsung berlaku.
export async function ensureShiftDefsLoaded(): Promise<void> {
  try {
    const { getCustomShiftAttendanceDefs } = await import("@/lib/shift-defs");
    const defs = await getCustomShiftAttendanceDefs();
    for (const d of defs) {
      if (BUILTIN_SHIFT_CODES.has(d.code)) continue; // jaga-jaga: jangan timpa built-in
      SHIFT_START[d.code] = d.startMin;
      SHIFT_TOLERANCE_MINUTES[d.code] = d.toleranceMin;
      CHECKIN_WINDOW[d.code] = [d.checkinStartMin, d.checkinEndMin];
      CHECKOUT_WINDOW[d.code] = [d.checkoutStartMin, d.checkoutEndMin];
    }
  } catch (err) {
    console.error("ensureShiftDefsLoaded failed", err);
  }
}

let shiftColumnReady: Promise<void> | null = null;

export function ensureAttendanceShiftSupport(): Promise<void> {
  if (!shiftColumnReady) {
    shiftColumnReady = (async () => {
      try {
        await pool.query(
          `ALTER TABLE absensi ADD COLUMN shift VARCHAR(24) NULL AFTER kode_absensi`,
        );
      } catch (err: unknown) {
        const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
        if (code !== "ER_DUP_FIELDNAME") throw err;
      }
      try {
        // ENUM→VARCHAR agar kode shift CUSTOM (dinamis) bisa disimpan. Nilai ENUM lama
        // (string) dipertahankan apa adanya saat konversi.
        await pool.query(`ALTER TABLE absensi MODIFY COLUMN shift VARCHAR(24) NULL`);
      } catch (err) {
        console.error("Failed to widen shift column", err);
      }
      // Flag: record hadir yang lupa absen pulang. absen_dipulihkan=1 artinya admin sudah
      // "Pulihkan" -> tidak lagi memblokir absensi karyawan.
      try {
        await pool.query(
          `ALTER TABLE absensi ADD COLUMN absen_dipulihkan TINYINT(1) NOT NULL DEFAULT 0 AFTER keterangan`,
        );
      } catch (err: unknown) {
        const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
        if (code !== "ER_DUP_FIELDNAME") throw err;
      }
      // Approval telat/pulang-awal (aturan baru per 5 Juli 2026).
      // butuh_approval=1 -> hari ini menyimpang (telat/pulang awal) & wajib approval atasan.
      // approval_status: pending/approved/rejected. Belum approved -> dianggap tidak bekerja (alfa).
      const approvalCols: Array<{ name: string; def: string }> = [
        { name: "butuh_approval", def: "TINYINT(1) NOT NULL DEFAULT 0 AFTER absen_dipulihkan" },
        { name: "approval_status", def: "VARCHAR(10) NULL AFTER butuh_approval" },
        { name: "approval_jenis", def: "VARCHAR(20) NULL AFTER approval_status" },
        { name: "assigned_approver_user_id", def: "BIGINT UNSIGNED NULL AFTER approval_jenis" },
        { name: "approver_user_id", def: "BIGINT UNSIGNED NULL AFTER assigned_approver_user_id" },
        { name: "approved_at", def: "DATETIME NULL AFTER approver_user_id" },
        { name: "catatan_atasan", def: "TEXT NULL AFTER approved_at" },
      ];
      for (const col of approvalCols) {
        try {
          await pool.query(`ALTER TABLE absensi ADD COLUMN ${col.name} ${col.def}`);
        } catch (err: unknown) {
          const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
          if (code !== "ER_DUP_FIELDNAME") {
            console.error(`Migration warning absensi.${col.name}:`, err);
          }
        }
      }
      try {
        await pool.query(
          `ALTER TABLE absensi ADD KEY idx_absensi_assigned_approver (assigned_approver_user_id)`,
        );
      } catch (err: unknown) {
        const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
        if (code !== "ER_DUP_KEYNAME") {
          console.error("Migration warning absensi idx_absensi_assigned_approver:", err);
        }
      }
    })();
  }
  return shiftColumnReady;
}

// Cek HANYA hari kemarin (hari sebelumnya): kalau HADIR tapi belum absen pulang &
// belum dipulihkan admin -> karyawan diblokir absen sampai admin "Pulihkan".
// Hari-hari lama (lebih dari kemarin) dibiarkan, tidak memblokir.
export async function getBlockingMissingCheckout(employeeId: number, todaySql: string) {
  await ensureAttendanceShiftSupport();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal
       FROM absensi
      WHERE karyawan_id = ?
        AND tanggal = DATE_SUB(?, INTERVAL 1 DAY)
        AND jam_masuk IS NOT NULL
        AND jam_pulang IS NULL
        AND status_absensi IN ('hadir', 'setengah_hari')
        AND absen_dipulihkan = 0
      LIMIT 1`,
    [employeeId, todaySql],
  );
  return rows[0] ? (rows[0] as { tanggal: string }).tanggal : null;
}

// Admin "Pulihkan": tandai record (karyawan, tanggal) sebagai sudah dipulihkan.
export async function recoverAttendance(employeeId: number, dateSql: string) {
  await ensureAttendanceShiftSupport();
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE absensi SET absen_dipulihkan = 1
      WHERE karyawan_id = ? AND tanggal = ?`,
    [employeeId, dateSql],
  );
  return { updated: result.affectedRows };
}

export async function saveAttendancePhoto(dataUrl: string, employeeId: number, mode: "in" | "out") {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);

  if (!match) {
    throw new Error("Format foto tidak valid.");
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const extension =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const fileName = `employee-${employeeId}-${mode}-${Date.now()}.${extension}`;
  return saveBufferToUploads(Buffer.from(base64Data, "base64"), "attendance", fileName);
}
