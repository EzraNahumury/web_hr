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
  getJadwalMasterAll,
  upsertJadwalMasterBulk,
  type JadwalShift,
} from "@/lib/jadwal-karyawan";
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
  if (!profile || (!canSetSchedule(profile.jabatan) && !isJadwalWhitelisted(profile.nama))) return null;
  return { id: employee.id };
}

const VALID_SHIFTS = new Set<JadwalShift>([
  "pagi", "lembur", "siang", "setengah_1", "setengah_2", "libur",
  "pagi_full", "pagi_short", "siang_sore", "jne_pagi", "jne_siang", "jne_minggu",
]);

const IMEL_NIP = "MR.MM.2025.0002";
const IMEL_VALID = new Set<JadwalShift>(["pagi_full", "pagi", "pagi_short", "setengah_2", "siang_sore", "siang", "libur"]);
const IMEL_ONLY = new Set<JadwalShift>(["pagi_full", "pagi_short", "siang_sore"]);
const JNE_VALID = new Set<JadwalShift>(["jne_pagi", "jne_siang", "jne_minggu", "libur"]);
const JNE_ONLY = new Set<JadwalShift>(["jne_pagi", "jne_siang", "jne_minggu"]);

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

    // Set constraint per karyawan (aturan sama seperti bagan Set Jadwal).
    const validIds = new Set<number>();
    const tokoSoloIds = new Set<number>();
    const mediaIds = new Set<number>();
    const jneIds = new Set<number>();
    const imelIds = new Set<number>();
    const [rows] = await pool.query<
      (RowDataPacket & { id: number; penempatan: string; sub_divisi: string | null; no_karyawan: string | null })[]
    >(
      `SELECT id, penempatan, sub_divisi, no_karyawan FROM karyawan
        WHERE status_data = 'aktif'
          AND (penempatan IN ('Toko','Gudang','JNE')
            OR LOWER(COALESCE(sub_divisi,'')) IN ('media','hostlive','advertiser'))`,
    );
    for (const r of rows) {
      validIds.add(r.id);
      if (r.penempatan === "Toko Solo") tokoSoloIds.add(r.id);
      if (r.penempatan === "JNE") jneIds.add(r.id);
      if ((r.sub_divisi ?? "").trim().toLowerCase() === "media") mediaIds.add(r.id);
      if (r.no_karyawan === IMEL_NIP) imelIds.add(r.id);
    }

    const entries: { karyawanId: number; hari: number; shift: JadwalShift }[] = [];
    for (const item of entriesRaw) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const karyawanId = parsePositiveInt(rec.karyawanId);
      const hari = parsePositiveInt(rec.hari);
      const shift = rec.shift as JadwalShift;
      if (!karyawanId || !validIds.has(karyawanId)) {
        return NextResponse.json({ message: "Karyawan tidak valid atau bukan Toko/Gudang/JNE/Media aktif." }, { status: 400 });
      }
      if (!hari || hari < 1 || hari > 7) {
        return NextResponse.json({ message: `Hari tidak valid: ${String(rec.hari)}` }, { status: 400 });
      }
      if (!VALID_SHIFTS.has(shift)) {
        return NextResponse.json({ message: `Shift tidak valid: ${String(shift)}` }, { status: 400 });
      }
      // Constraint per tipe (samakan dengan bagan).
      if (tokoSoloIds.has(karyawanId) && shift !== "pagi" && shift !== "libur") {
        return NextResponse.json({ message: "Toko Solo hanya boleh shift Pagi atau Libur." }, { status: 400 });
      }
      if (imelIds.has(karyawanId)) {
        if (!IMEL_VALID.has(shift)) {
          return NextResponse.json({ message: "Shift tidak sesuai jadwal Imel." }, { status: 400 });
        }
      } else if (IMEL_ONLY.has(shift)) {
        return NextResponse.json({ message: "Shift ini khusus Imel." }, { status: 400 });
      } else if (jneIds.has(karyawanId)) {
        if (!JNE_VALID.has(shift)) {
          return NextResponse.json({ message: "Karyawan JNE hanya boleh shift JNE Pagi/Siang/Minggu atau Libur." }, { status: 400 });
        }
      } else if (JNE_ONLY.has(shift)) {
        return NextResponse.json({ message: "Shift ini khusus karyawan JNE." }, { status: 400 });
      } else if (mediaIds.has(karyawanId) && shift !== "pagi" && shift !== "siang" && shift !== "libur") {
        return NextResponse.json({ message: "Media hanya boleh shift Pagi, Siang, atau Libur." }, { status: 400 });
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

    return NextResponse.json({ message: "Master jadwal tersimpan.", saved: entries.length, removed: removeKeys.length });
  } catch (error) {
    console.error("jadwal-master POST error", error);
    return NextResponse.json({ message: "Gagal menyimpan master jadwal." }, { status: 500 });
  }
}
