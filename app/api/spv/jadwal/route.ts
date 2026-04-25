import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

import { getCurrentSpvSession } from "@/lib/auth";
import {
  deleteJadwalEntries,
  getJadwalForMonth,
  upsertJadwalBulk,
  type JadwalShift,
} from "@/lib/jadwal-karyawan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SHIFTS: JadwalShift[] = [
  "pagi",
  "lembur",
  "siang",
  "setengah_1",
  "setengah_2",
  "libur",
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
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y !== year || mo !== month) return false;
  const test = new Date(y, mo - 1, d);
  return (
    test.getFullYear() === y &&
    test.getMonth() === mo - 1 &&
    test.getDate() === d
  );
}

export async function GET(request: Request) {
  const session = await getCurrentSpvSession();
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
  const session = await getCurrentSpvSession();
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

    const validKaryawanIds = new Set<number>();
    {
      const [rows] = await pool.query<(RowDataPacket & { id: number })[]>(
        `SELECT id FROM karyawan WHERE penempatan IN ('Toko','Gudang') AND status_data = 'aktif'`,
      );
      for (const row of rows) validKaryawanIds.add(row.id);
    }

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
