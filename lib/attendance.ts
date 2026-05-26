import { pool } from "@/lib/db";
import { saveBufferToUploads } from "@/lib/uploads";

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
  | "jne_minggu";

const SHIFT_START: Record<AttendanceShift, number> = {
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
};

// Toleransi keterlambatan per shift. Jika lateMinutes <= tolerance maka dianggap tepat waktu.
const SHIFT_TOLERANCE_MINUTES: Partial<Record<AttendanceShift, number>> = {
  jne_pagi: 10,
  jne_siang: 10,
  jne_minggu: 10,
};

type Range = readonly [number, number];

const CHECKIN_WINDOW: Record<AttendanceShift, Range> = {
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
};

const CHECKOUT_WINDOW: Record<AttendanceShift, Range> = {
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

export function isEarlyLeaveByTime(
  checkInTime: string | null | undefined,
  checkOutTime: string | null | undefined,
): boolean {
  if (!checkInTime || !checkOutTime) return false;
  const shift = detectShiftFromCheckIn(checkInTime);
  if (!shift) return false;
  const outMins = timeToMinutes(checkOutTime);
  const coStart = CHECKOUT_WINDOW[shift][0];
  return outMins < coStart;
}

export function getShiftLateMinutes(time: string, shift: AttendanceShift): number {
  const mins = timeToMinutes(time);
  const lateRaw = Math.max(mins - SHIFT_START[shift], 0);
  const tolerance = SHIFT_TOLERANCE_MINUTES[shift] ?? 0;
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
  return mins >= ciWindow[0] && mins <= coWindow[1];
}

export function getShiftRangeLabel(shift: AttendanceShift): string {
  const ci = CHECKIN_WINDOW[shift];
  const co = CHECKOUT_WINDOW[shift];
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

let shiftColumnReady: Promise<void> | null = null;

export function ensureAttendanceShiftSupport(): Promise<void> {
  if (!shiftColumnReady) {
    shiftColumnReady = (async () => {
      try {
        await pool.query(
          `ALTER TABLE absensi ADD COLUMN shift ENUM('pagi','lembur','siang','setengah_1','setengah_2') NULL AFTER kode_absensi`,
        );
      } catch (err: unknown) {
        const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
        if (code !== "ER_DUP_FIELDNAME") throw err;
      }
      try {
        await pool.query(
          `ALTER TABLE absensi MODIFY COLUMN shift ENUM('pagi','lembur','siang','setengah_1','setengah_2') NULL`,
        );
      } catch (err) {
        console.error("Failed to widen shift enum", err);
      }
    })();
  }
  return shiftColumnReady;
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
