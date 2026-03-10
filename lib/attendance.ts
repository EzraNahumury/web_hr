import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

export function getCheckInLateMinutes(time: string) {
  const [hourString, minuteString] = time.split(":");
  const minutes = Number(hourString) * 60 + Number(minuteString);
  const expectedMinutes = 8 * 60 + 30;
  return Math.max(minutes - expectedMinutes, 0);
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
  const relativePath = `/uploads/attendance/${fileName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "attendance");
  const absolutePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(absolutePath, Buffer.from(base64Data, "base64"));

  return relativePath;
}
