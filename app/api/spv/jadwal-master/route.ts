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
  deleteJadwalMasterEntries,
  distributeMasterToPeriod,
  getJadwalMasterAll,
  isUserJadwalEditor,
  upsertJadwalMasterBulk,
  type JadwalShift,
} from "@/lib/jadwal-karyawan";
import { getActivePayrollPeriod, getPayrollDateRange } from "@/lib/payroll-admin";
import {
  isEkspedisiPlacement,
  JNE_SHIFT_VALUES,
  STANDARD_SHIFT_VALUES,
} from "@/lib/jadwal-shift-options";
import { canSetSchedule, isJadwalWhitelisted } from "@/lib/scheduler-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const standardSet = new Set<string>(STANDARD_SHIFT_VALUES);
const jneSet = new Set<string>(JNE_SHIFT_VALUES);

function parsePositiveInt(v: unknown) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET() {
  const session = await getSchedulerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const rows = await getJadwalMasterAll();
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const session = await getSchedulerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const entriesRaw = Array.isArray(body.entries) ? body.entries : [];
    const removeRaw = Array.isArray(body.removeKeys) ? body.removeKeys : [];

    // Karyawan valid = is_shift = 1. Ekspedisi (JNE) pakai set shift JNE, selain itu set standar.
    const validIds = new Set<number>();
    const jneIds = new Set<number>();
    const [rows] = await pool.query<(RowDataPacket & { id: number; penempatan: string })[]>(
      `SELECT id, penempatan FROM karyawan WHERE status_data = 'aktif' AND is_shift = 1`,
    );
    for (const r of rows) {
      validIds.add(r.id);
      if (isEkspedisiPlacement(r.penempatan)) jneIds.add(r.id);
    }

    const entries: { karyawanId: number; hari: number; shift: JadwalShift }[] = [];
    for (const item of entriesRaw) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const karyawanId = parsePositiveInt(rec.karyawanId);
      const hari = parsePositiveInt(rec.hari);
      const shift = rec.shift as JadwalShift;
      if (!karyawanId || !validIds.has(karyawanId)) {
        return NextResponse.json({ message: "Karyawan tidak valid atau tidak diaktifkan Shift." }, { status: 400 });
      }
      if (!hari || hari < 1 || hari > 7) {
        return NextResponse.json({ message: `Hari tidak valid: ${String(rec.hari)}` }, { status: 400 });
      }
      const allowed = jneIds.has(karyawanId) ? jneSet : standardSet;
      if (!allowed.has(shift)) {
        return NextResponse.json(
          {
            message: jneIds.has(karyawanId)
              ? "Karyawan Ekspedisi (JNE) hanya boleh shift Pagi/Siang/Minggu atau Libur."
              : "Shift hanya boleh Pagi, Lembur, Siang, atau Libur.",
          },
          { status: 400 },
        );
      }
      entries.push({ karyawanId, hari, shift });
    }

    const removeKeys: { karyawanId: number; hari: number }[] = [];
    for (const item of removeRaw) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const karyawanId = parsePositiveInt(rec.karyawanId);
      const hari = parsePositiveInt(rec.hari);
      if (!karyawanId || !hari) continue;
      removeKeys.push({ karyawanId, hari });
    }

    if (entries.length > 0) await upsertJadwalMasterBulk(entries, session.id);
    if (removeKeys.length > 0) await deleteJadwalMasterEntries(removeKeys);

    // Otomatis distribusikan master ke Bagan periode payroll BERJALAN (fill-only, tidak
    // menimpa jadwal yang sudah ada / hasil tukar shift manual).
    const active = getActivePayrollPeriod();
    const range = getPayrollDateRange(active.month, active.year);
    const dist = await distributeMasterToPeriod(range.startSql, range.endSql, session.id);

    return NextResponse.json({
      message: "Master jadwal tersimpan & diterapkan ke Bagan periode berjalan.",
      saved: entries.length,
      removed: removeKeys.length,
      distributed: dist.inserted,
    });
  } catch (error) {
    console.error("jadwal-master POST error", error);
    return NextResponse.json({ message: "Gagal menyimpan master jadwal." }, { status: 500 });
  }
}
