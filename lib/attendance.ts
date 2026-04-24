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

export type AttendanceShift = "pagi" | "lembur" | "siang";

const SHIFT_START: Record<AttendanceShift, number> = {
  pagi: 8 * 60 + 30,   // 08:30
  lembur: 10 * 60,     // 10:00
  siang: 12 * 60,      // 12:00
};

export function detectTokoGudangShift(time: string): AttendanceShift {
  const [h, m] = time.split(":").map(Number);
  const mins = h * 60 + m;
  if (mins >= 9 * 60 + 45 && mins <= 10 * 60 + 15) return "lembur";
  if (mins >= 11 * 60 + 45 && mins <= 12 * 60 + 15) return "siang";
  return "pagi";
}

export function getShiftLateMinutes(time: string, shift: AttendanceShift): number {
  const [h, m] = time.split(":").map(Number);
  const mins = h * 60 + m;
  return Math.max(mins - SHIFT_START[shift], 0);
}

export function getCheckInLateMinutes(time: string) {
  return getShiftLateMinutes(time, "pagi");
}

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
          `ALTER TABLE absensi ADD COLUMN shift ENUM('pagi','lembur','siang') NULL AFTER kode_absensi`,
        );
      } catch (err: unknown) {
        const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
        if (code !== "ER_DUP_FIELDNAME") throw err;
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
