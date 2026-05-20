import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

import {
  getCurrentAdminSession,
  getCurrentEmployeeSession,
  getCurrentSpvSession,
} from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import {
  deleteJadwalEntries,
  getJadwalForMonth,
  upsertJadwalBulk,
  type JadwalShift,
} from "@/lib/jadwal-karyawan";
import { canSetSchedule } from "@/lib/scheduler-roles";

async function getSchedulerSession() {
  const admin = await getCurrentAdminSession();
  if (admin) return { id: admin.id };

  const spv = await getCurrentSpvSession();
  if (spv) return { id: spv.id };

  const employee = await getCurrentEmployeeSession();
  if (!employee) return null;

  const profile = await getEmployeeByUserId(employee.userId);
  if (!profile || !canSetSchedule(profile.jabatan)) return null;

  return { id: employee.id };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SHIFTS: JadwalShift[] = [
  "pagi",
  "lembur",
  "siang",
  "setengah_1",
  "setengah_2",
  "libur",
  "pagi_full",
  "pagi_short",
  "siang_sore",
  "jne_pagi",
  "jne_siang",
];

function parsePositiveInt(v: unknown) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseYearMonth(yearRaw: unknown, monthRaw: unknown) {
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || year < 2024 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function isValidShift(value: unknown): value is JadwalShift {
  return typeof value === "string" && VALID_SHIFTS.includes(value as JadwalShift);
}

function isValidDateInPeriod(date: string, year: number, month: number) {
  // Periode payroll: tgl 26 bulan sebelumnya s/d tgl 25 bulan dipilih
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const inPrev = y === prevYear && mo === prevMonth && d >= 26;
  const inSelected = y === year && mo === month && d >= 1 && d <= 25;
  if (!inPrev && !inSelected) return false;
  const test = new Date(y, mo - 1, d);
  return (
    test.getFullYear() === y &&
    test.getMonth() === mo - 1 &&
    test.getDate() === d
  );
}

export async function GET(request: Request) {
  const session = await getSchedulerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = parseYearMonth(url.searchParams.get("year"), url.searchParams.get("month"));
  if (!period) {
    return NextResponse.json({ message: "Periode tidak valid." }, { status: 400 });
  }

  const rows = await getJadwalForMonth(period.year, period.month);
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const session = await getSchedulerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const period = parseYearMonth(body.year, body.month);
    if (!period) {
      return NextResponse.json({ message: "Periode tidak valid." }, { status: 400 });
    }

    const entriesRaw = Array.isArray(body.entries) ? body.entries : [];
    const removeRaw = Array.isArray(body.removeKeys) ? body.removeKeys : [];

    const IMEL_NIP = "MR.MM.2025.0002";
    const validKaryawanIds = new Set<number>();
    const tokoSoloKaryawanIds = new Set<number>();
    const mediaKaryawanIds = new Set<number>();
    const jneKaryawanIds = new Set<number>();
    const imelKaryawanIds = new Set<number>();
    {
      const [rows] = await pool.query<
        (RowDataPacket & {
          id: number;
          penempatan: string;
          sub_divisi: string | null;
          no_karyawan: string | null;
        })[]
      >(
        `
          SELECT id, penempatan, sub_divisi, no_karyawan FROM karyawan
          WHERE status_data = 'aktif'
            AND (
              penempatan IN ('Toko','Toko Solo','Gudang','JNE')
              OR LOWER(COALESCE(sub_divisi, '')) = 'media'
            )
        `,
      );
      for (const row of rows) {
        validKaryawanIds.add(row.id);
        if (row.penempatan === "Toko Solo") {
          tokoSoloKaryawanIds.add(row.id);
        }
        if (row.penempatan === "JNE") {
          jneKaryawanIds.add(row.id);
        }
        if ((row.sub_divisi ?? "").trim().toLowerCase() === "media") {
          mediaKaryawanIds.add(row.id);
        }
        if (row.no_karyawan === IMEL_NIP) {
          imelKaryawanIds.add(row.id);
        }
      }
    }

    const IMEL_VALID_SHIFTS = new Set<JadwalShift>([
      "pagi_full",
      "pagi",
      "pagi_short",
      "setengah_2",
      "siang_sore",
      "siang",
      "libur",
    ]);

    const IMEL_ONLY_SHIFTS = new Set<JadwalShift>([
      "pagi_full",
      "pagi_short",
      "siang_sore",
    ]);

    const JNE_VALID_SHIFTS = new Set<JadwalShift>([
      "jne_pagi",
      "jne_siang",
      "libur",
    ]);

    const JNE_ONLY_SHIFTS = new Set<JadwalShift>(["jne_pagi", "jne_siang"]);

    const entries: { karyawanId: number; tanggal: string; shift: JadwalShift }[] = [];
    for (const item of entriesRaw) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const karyawanId = parsePositiveInt(rec.karyawanId);
      const tanggal = typeof rec.tanggal === "string" ? rec.tanggal : "";
      const shift = rec.shift;
      if (!karyawanId || !validKaryawanIds.has(karyawanId)) {
        return NextResponse.json(
          { message: "Karyawan tidak valid atau bukan Toko/Gudang aktif." },
          { status: 400 },
        );
      }
      if (!isValidDateInPeriod(tanggal, period.year, period.month)) {
        return NextResponse.json(
          { message: `Tanggal tidak valid: ${tanggal}` },
          { status: 400 },
        );
      }
      if (!isValidShift(shift)) {
        return NextResponse.json(
          { message: `Shift tidak valid: ${String(shift)}` },
          { status: 400 },
        );
      }
      if (
        tokoSoloKaryawanIds.has(karyawanId) &&
        shift !== "pagi" &&
        shift !== "libur"
      ) {
        return NextResponse.json(
          {
            message:
              "Karyawan Toko Solo hanya boleh dijadwalkan shift Pagi atau Libur.",
          },
          { status: 400 },
        );
      }
      if (imelKaryawanIds.has(karyawanId)) {
        if (!IMEL_VALID_SHIFTS.has(shift)) {
          return NextResponse.json(
            {
              message:
                "Shift tidak sesuai jadwal Imel. Pilih dari opsi yang tersedia di dropdown.",
            },
            { status: 400 },
          );
        }
      } else if (IMEL_ONLY_SHIFTS.has(shift)) {
        return NextResponse.json(
          {
            message:
              "Shift ini khusus untuk Siti Imeliya Sari, tidak bisa digunakan karyawan lain.",
          },
          { status: 400 },
        );
      } else if (jneKaryawanIds.has(karyawanId)) {
        if (!JNE_VALID_SHIFTS.has(shift)) {
          return NextResponse.json(
            {
              message:
                "Karyawan JNE hanya boleh dijadwalkan shift Pagi (08:00-16:00), Siang (14:00-21:00), atau Libur.",
            },
            { status: 400 },
          );
        }
      } else if (JNE_ONLY_SHIFTS.has(shift)) {
        return NextResponse.json(
          {
            message: "Shift ini khusus untuk karyawan JNE.",
          },
          { status: 400 },
        );
      } else if (
        mediaKaryawanIds.has(karyawanId) &&
        shift !== "pagi" &&
        shift !== "siang" &&
        shift !== "libur"
      ) {
        return NextResponse.json(
          {
            message:
              "Karyawan sub divisi Media hanya boleh dijadwalkan shift Pagi, Siang, atau Libur.",
          },
          { status: 400 },
        );
      }
      entries.push({ karyawanId, tanggal, shift });
    }

    const removeKeys: { karyawanId: number; tanggal: string }[] = [];
    for (const item of removeRaw) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const karyawanId = parsePositiveInt(rec.karyawanId);
      const tanggal = typeof rec.tanggal === "string" ? rec.tanggal : "";
      if (!karyawanId) continue;
      if (!isValidDateInPeriod(tanggal, period.year, period.month)) continue;
      removeKeys.push({ karyawanId, tanggal });
    }

    if (entries.length > 0) {
      await upsertJadwalBulk(entries, session.id);
    }
    if (removeKeys.length > 0) {
      await deleteJadwalEntries(removeKeys);
    }

    return NextResponse.json({
      message: `Jadwal periode ${period.month}/${period.year} berhasil disimpan.`,
      saved: entries.length,
      removed: removeKeys.length,
    });
  } catch (error) {
    console.error("Save SPV jadwal error", error);
    return NextResponse.json(
      { message: "Gagal menyimpan jadwal." },
      { status: 500 },
    );
  }
}
