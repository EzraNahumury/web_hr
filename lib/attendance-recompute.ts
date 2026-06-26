import { RowDataPacket, type ResultSetHeader } from "mysql2";

import { pool } from "@/lib/db";
import {
  getShiftLateMinutes,
  type AttendanceShift,
} from "@/lib/attendance";

type CandidateRow = RowDataPacket & {
  id: number;
  jam_masuk_str: string | null;
  scheduled_shift: string | null;
  current_late: number;
  current_kode: string | null;
};

type MigrationRow = RowDataPacket & { key_name: string };

const VALID_SHIFTS = new Set<AttendanceShift>([
  "pagi",
  "lembur",
  "siang",
  "setengah_1",
  "setengah_2",
  "pagi_full",
  "pagi_short",
  "siang_sore",
  "jne_pagi",
  "jne_siang",
  "jne_minggu",
]);

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      key_name VARCHAR(100) PRIMARY KEY,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function clearStaleLoanOverridesOnce() {
  await ensureMigrationTable();
  const KEY = "clear_stale_loan_override_v1";
  const [existing] = await pool.query<MigrationRow[]>(
    `SELECT key_name FROM app_migrations WHERE key_name = ? LIMIT 1`,
    [KEY],
  );
  if (existing.length > 0) return;

  await pool.query(
    `UPDATE payroll_employee_input SET override_pinjaman = NULL WHERE override_pinjaman IS NOT NULL`,
  );

  await pool.query(
    `INSERT IGNORE INTO app_migrations (key_name) VALUES (?)`,
    [KEY],
  );
}

export async function recomputeMediaHostliveAdvertiserLateOnce() {
  await ensureMigrationTable();
  const KEY = "recompute_late_v1_media_hostlive_advertiser";

  const [existing] = await pool.query<MigrationRow[]>(
    `SELECT key_name FROM app_migrations WHERE key_name = ? LIMIT 1`,
    [KEY],
  );
  if (existing.length > 0) return;

  const [rows] = await pool.query<CandidateRow[]>(
    `
      SELECT
        a.id,
        TIME_FORMAT(a.jam_masuk, '%H:%i') AS jam_masuk_str,
        j.shift AS scheduled_shift,
        a.terlambat_menit AS current_late,
        a.kode_absensi AS current_kode
      FROM absensi a
      INNER JOIN karyawan k ON k.id = a.karyawan_id
      LEFT JOIN jadwal_karyawan j
        ON j.karyawan_id = a.karyawan_id AND j.tanggal = a.tanggal
      WHERE a.jam_masuk IS NOT NULL
        AND a.status_absensi = 'hadir'
        AND j.shift IS NOT NULL
        AND j.shift <> 'libur'
        AND (
          LOWER(COALESCE(k.sub_divisi, '')) IN ('media', 'hostlive', 'advertiser')
          OR k.penempatan IN ('Toko', 'Gudang', 'JNE')
        )
    `,
  );

  let updated = 0;
  for (const row of rows) {
    if (!row.jam_masuk_str || !row.scheduled_shift) continue;
    const shift = row.scheduled_shift as AttendanceShift;
    if (!VALID_SHIFTS.has(shift)) continue;

    const newLate = getShiftLateMinutes(row.jam_masuk_str, shift);
    const newKode = newLate > 0 ? "T" : "O";

    if (newLate === row.current_late && newKode === row.current_kode) continue;

    await pool.query(
      `UPDATE absensi SET terlambat_menit = ?, kode_absensi = ?, shift = ? WHERE id = ?`,
      [newLate, newKode, shift, row.id],
    );
    updated += 1;
  }

  await pool.query(
    `INSERT IGNORE INTO app_migrations (key_name) VALUES (?)`,
    [KEY],
  );

  return { updated };
}

// Karyawan ber-jadwal shift PAGI yang masuk lewat 11:30 -> jadikan SETENGAH HARI (kode H),
// bukan telat. Memperbaiki data lama agar konsisten dengan aturan check-in baru.
export async function recomputePagiHalfDayOnce() {
  await ensureMigrationTable();
  const KEY = "recompute_pagi_halfday_after_1130_v1";

  const [existing] = await pool.query<MigrationRow[]>(
    `SELECT key_name FROM app_migrations WHERE key_name = ? LIMIT 1`,
    [KEY],
  );
  if (existing.length > 0) return { updated: 0 };

  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE absensi a
      INNER JOIN karyawan k ON k.id = a.karyawan_id
      INNER JOIN jadwal_karyawan j
        ON j.karyawan_id = a.karyawan_id AND j.tanggal = a.tanggal
      SET
        a.status_absensi = 'setengah_hari',
        a.kode_absensi = 'H',
        a.setengah_hari = 1,
        a.terlambat_menit = 0
      WHERE a.jam_masuk IS NOT NULL
        AND a.status_absensi = 'hadir'
        AND j.shift IN ('pagi', 'pagi_full', 'pagi_short')
        AND TIME(a.jam_masuk) > '11:30:00'
        AND (
          LOWER(COALESCE(k.sub_divisi, '')) IN ('media', 'hostlive', 'advertiser')
          OR k.penempatan IN ('Toko', 'Gudang', 'JNE')
        )
    `,
  );

  await pool.query(
    `INSERT IGNORE INTO app_migrations (key_name) VALUES (?)`,
    [KEY],
  );

  return { updated: result.affectedRows ?? 0 };
}
