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
  isUserJadwalEditor,
  upsertJadwalBulk,
  type JadwalShift,
} from "@/lib/jadwal-karyawan";
import {
  AYRES_SHIFT_VALUES,
  isAyresPlacement,
  isEkspedisiPlacement,
  JNE_SHIFT_VALUES,
  STANDARD_SHIFT_VALUES,
} from "@/lib/jadwal-shift-options";
import { canSetSchedule, isJadwalWhitelisted } from "@/lib/scheduler-roles";
import { getAllowedShiftsByKaryawan } from "@/lib/shift-groups";

async function getSchedulerSession() {
  const admin = await getCurrentAdminSession();
  if (admin) return { id: admin.id };

  const spv = await getCurrentSpvSession();
  if (spv) return { id: spv.id };

  const employee = await getCurrentEmployeeSession();
  if (!employee) return null;

  const profile = await getEmployeeByUserId(employee.userId);
  if (
    !profile ||
    (!canSetSchedule(profile.jabatan) &&
      !isJadwalWhitelisted(profile.nama) &&
      !(await isUserJadwalEditor(employee.userId)))
  ) {
    return null;
  }

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
  "jne_minggu",
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

    // Karyawan valid = is_shift = 1. Ekspedisi (JNE) pakai set shift JNE, selain itu set standar.
    const validKaryawanIds = new Set<number>();
    const jneKaryawanIds = new Set<number>();
    const ayresKaryawanIds = new Set<number>();
    {
      const [rows] = await pool.query<(RowDataPacket & { id: number; penempatan: string })[]>(
        `SELECT id, penempatan FROM karyawan WHERE status_data = 'aktif' AND is_shift = 1`,
      );
      for (const row of rows) {
        validKaryawanIds.add(row.id);
        if (isEkspedisiPlacement(row.penempatan)) jneKaryawanIds.add(row.id);
        else if (isAyresPlacement(row.penempatan)) ayresKaryawanIds.add(row.id);
      }
    }

    const standardSet = new Set<string>(STANDARD_SHIFT_VALUES);
    const jneSet = new Set<string>(JNE_SHIFT_VALUES);
    const ayresSet = new Set<string>(AYRES_SHIFT_VALUES);

    // Shift yang diizinkan per karyawan bila masuk grup Set Jadwal (Master); jika tidak,
    // fallback ke set berbasis penempatan (perilaku lama).
    const allowedByKaryawan = await getAllowedShiftsByKaryawan();

    const entries: { karyawanId: number; tanggal: string; shift: JadwalShift }[] = [];
    for (const item of entriesRaw) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const karyawanId = parsePositiveInt(rec.karyawanId);
      const tanggal = typeof rec.tanggal === "string" ? rec.tanggal : "";
      const shift = rec.shift;
      if (!karyawanId || !validKaryawanIds.has(karyawanId)) {
        return NextResponse.json(
          { message: "Karyawan tidak valid atau tidak diaktifkan Shift." },
          { status: 400 },
        );
      }
      if (!isValidDateInPeriod(tanggal, period.year, period.month)) {
        return NextResponse.json({ message: `Tanggal tidak valid: ${tanggal}` }, { status: 400 });
      }
      if (!isValidShift(shift)) {
        return NextResponse.json({ message: `Shift tidak valid: ${String(shift)}` }, { status: 400 });
      }
      const isJne = jneKaryawanIds.has(karyawanId);
      const isAyres = ayresKaryawanIds.has(karyawanId);
      const groupAllowed = allowedByKaryawan.get(karyawanId);
      const allowed = groupAllowed ?? (isJne ? jneSet : isAyres ? ayresSet : standardSet);
      if (!allowed.has(shift)) {
        return NextResponse.json(
          {
            message: groupAllowed
              ? "Shift tidak sesuai grup Set Jadwal untuk karyawan ini."
              : isJne
                ? "Karyawan Ekspedisi (JNE) hanya boleh shift Pagi/Siang/Minggu atau Libur."
                : isAyres
                  ? "Karyawan Ayres hanya boleh shift Pagi, Siang (14:00-22:00), atau Libur."
                  : "Shift hanya boleh Pagi, Lembur, Siang, atau Libur.",
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
