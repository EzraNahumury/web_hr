import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

// ── FASE 2: definisi shift (termasuk JAM) di DB ──────────────────────────────
// Built-in (is_system=1) HANYA sebagai katalog/label & proteksi — jam-nya tetap
// dipegang hardcode di attendance.ts (tidak diubah, nol regresi). Shift CUSTOM
// (is_system=0) membawa jam sendiri yang di-merge ke attendance saat runtime.

export type ShiftDef = {
  code: string;
  label: string;
  startMin: number;
  checkinStartMin: number;
  checkinEndMin: number;
  checkoutStartMin: number;
  checkoutEndMin: number;
  toleranceMin: number;
  isLibur: boolean;
  isSelectable: boolean;
  isSystem: boolean;
  sort: number;
};

export type CustomShiftAttendanceDef = {
  code: string;
  startMin: number;
  toleranceMin: number;
  checkinStartMin: number;
  checkinEndMin: number;
  checkoutStartMin: number;
  checkoutEndMin: number;
};

type SeedDef = Omit<ShiftDef, "isSystem" | "sort">;

// Nilai jam = SAMA PERSIS dengan attendance.ts (SHIFT_START/CHECKIN_WINDOW/CHECKOUT_WINDOW).
const BUILTIN_SHIFTS: SeedDef[] = [
  { code: "pagi", label: "Pagi (08:30 - 16:30)", startMin: 510, checkinStartMin: 480, checkinEndMin: 510, checkoutStartMin: 990, checkoutEndMin: 1050, toleranceMin: 5, isLibur: false, isSelectable: true },
  { code: "siang", label: "Siang (12:00 - 21:00)", startMin: 720, checkinStartMin: 705, checkinEndMin: 720, checkoutStartMin: 1200, checkoutEndMin: 1260, toleranceMin: 5, isLibur: false, isSelectable: true },
  { code: "lembur", label: "Lembur (10:00 - 21:00)", startMin: 600, checkinStartMin: 585, checkinEndMin: 600, checkoutStartMin: 1200, checkoutEndMin: 1260, toleranceMin: 5, isLibur: false, isSelectable: true },
  { code: "ayres_siang", label: "Siang (14:00 - 22:00)", startMin: 840, checkinStartMin: 810, checkinEndMin: 870, checkoutStartMin: 1320, checkoutEndMin: 1380, toleranceMin: 5, isLibur: false, isSelectable: true },
  { code: "jne_pagi", label: "JNE Pagi (08:00 - 16:00)", startMin: 480, checkinStartMin: 450, checkinEndMin: 660, checkoutStartMin: 930, checkoutEndMin: 990, toleranceMin: 10, isLibur: false, isSelectable: true },
  { code: "jne_siang", label: "JNE Siang (14:00 - 21:00)", startMin: 840, checkinStartMin: 810, checkinEndMin: 1020, checkoutStartMin: 1230, checkoutEndMin: 1290, toleranceMin: 10, isLibur: false, isSelectable: true },
  { code: "jne_minggu", label: "JNE Minggu (13:00 - 20:00)", startMin: 780, checkinStartMin: 750, checkinEndMin: 840, checkoutStartMin: 1170, checkoutEndMin: 1230, toleranceMin: 10, isLibur: false, isSelectable: true },
  { code: "libur", label: "Libur", startMin: 0, checkinStartMin: 0, checkinEndMin: 0, checkoutStartMin: 0, checkoutEndMin: 0, toleranceMin: 0, isLibur: true, isSelectable: true },
  // Non-selectable (auto-deteksi/partime) — hanya label, tidak muncul di picker grup.
  { code: "setengah_1", label: "Setengah Hari 1", startMin: 780, checkinStartMin: 630, checkinEndMin: 780, checkoutStartMin: 990, checkoutEndMin: 1050, toleranceMin: 5, isLibur: false, isSelectable: false },
  { code: "setengah_2", label: "Setengah Hari 2", startMin: 510, checkinStartMin: 480, checkinEndMin: 510, checkoutStartMin: 720, checkoutEndMin: 780, toleranceMin: 5, isLibur: false, isSelectable: false },
  { code: "pagi_full", label: "Pagi (08:30 - 17:00)", startMin: 510, checkinStartMin: 480, checkinEndMin: 510, checkoutStartMin: 990, checkoutEndMin: 1050, toleranceMin: 5, isLibur: false, isSelectable: false },
  { code: "pagi_short", label: "Pagi (08:30 - 15:00)", startMin: 510, checkinStartMin: 480, checkinEndMin: 510, checkoutStartMin: 870, checkoutEndMin: 930, toleranceMin: 5, isLibur: false, isSelectable: false },
  { code: "siang_sore", label: "Siang (12:00 - 17:00)", startMin: 720, checkinStartMin: 705, checkinEndMin: 720, checkoutStartMin: 990, checkoutEndMin: 1050, toleranceMin: 5, isLibur: false, isSelectable: false },
  { code: "partime", label: "Partime (17:00 - 22:00)", startMin: 1020, checkinStartMin: 990, checkinEndMin: 1320, checkoutStartMin: 1320, checkoutEndMin: 1380, toleranceMin: 5, isLibur: false, isSelectable: false },
];

const BUILTIN_CODES = new Set(BUILTIN_SHIFTS.map((s) => s.code));

type DefRow = RowDataPacket & {
  code: string;
  label: string;
  start_min: number;
  checkin_start_min: number;
  checkin_end_min: number;
  checkout_start_min: number;
  checkout_end_min: number;
  tolerance_min: number;
  is_libur: number;
  is_selectable: number;
  is_system: number;
  sort: number;
};

let schemaReady: Promise<void> | null = null;

export function ensureShiftDefSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(
        `
          CREATE TABLE IF NOT EXISTS shift_def (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(24) NOT NULL UNIQUE,
            label VARCHAR(60) NOT NULL,
            start_min INT NOT NULL DEFAULT 0,
            checkin_start_min INT NOT NULL DEFAULT 0,
            checkin_end_min INT NOT NULL DEFAULT 0,
            checkout_start_min INT NOT NULL DEFAULT 0,
            checkout_end_min INT NOT NULL DEFAULT 0,
            tolerance_min INT NOT NULL DEFAULT 5,
            is_libur TINYINT(1) NOT NULL DEFAULT 0,
            is_selectable TINYINT(1) NOT NULL DEFAULT 1,
            is_system TINYINT(1) NOT NULL DEFAULT 0,
            sort INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,
      );

      // Upsert built-in setiap start (INSERT IGNORE) agar katalog selalu lengkap tanpa
      // menimpa shift custom. Built-in sort 0..; custom mulai 1000.
      let sort = 0;
      for (const s of BUILTIN_SHIFTS) {
        await pool.query(
          `INSERT IGNORE INTO shift_def
             (code, label, start_min, checkin_start_min, checkin_end_min, checkout_start_min, checkout_end_min, tolerance_min, is_libur, is_selectable, is_system, sort)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            s.code,
            s.label,
            s.startMin,
            s.checkinStartMin,
            s.checkinEndMin,
            s.checkoutStartMin,
            s.checkoutEndMin,
            s.toleranceMin,
            s.isLibur ? 1 : 0,
            s.isSelectable ? 1 : 0,
            sort,
          ],
        );
        sort += 10;
      }
    })();
  }
  return schemaReady;
}

function mapRow(r: DefRow): ShiftDef {
  return {
    code: r.code,
    label: r.label,
    startMin: r.start_min,
    checkinStartMin: r.checkin_start_min,
    checkinEndMin: r.checkin_end_min,
    checkoutStartMin: r.checkout_start_min,
    checkoutEndMin: r.checkout_end_min,
    toleranceMin: r.tolerance_min,
    isLibur: r.is_libur === 1,
    isSelectable: r.is_selectable === 1,
    isSystem: r.is_system === 1,
    sort: r.sort,
  };
}

export async function listShiftDefs(): Promise<ShiftDef[]> {
  await ensureShiftDefSchema();
  const [rows] = await pool.query<DefRow[]>(
    `SELECT * FROM shift_def ORDER BY sort ASC, id ASC`,
  );
  return rows.map(mapRow);
}

// Shift yang boleh dipilih untuk mengisi dropdown grup (built-in selectable + custom).
export async function getSelectableShifts(): Promise<{ code: string; label: string }[]> {
  const defs = await listShiftDefs();
  return defs.filter((d) => d.isSelectable).map((d) => ({ code: d.code, label: d.label }));
}

export async function getShiftLabelMap(): Promise<Map<string, string>> {
  const defs = await listShiftDefs();
  return new Map(defs.map((d) => [d.code, d.label] as const));
}

// Untuk augmentasi attendance: HANYA shift custom non-libur (built-in tetap hardcode).
export async function getCustomShiftAttendanceDefs(): Promise<CustomShiftAttendanceDef[]> {
  const defs = await listShiftDefs();
  return defs
    .filter((d) => !d.isSystem && !d.isLibur)
    .map((d) => ({
      code: d.code,
      startMin: d.startMin,
      toleranceMin: d.toleranceMin,
      checkinStartMin: d.checkinStartMin,
      checkinEndMin: d.checkinEndMin,
      checkoutStartMin: d.checkoutStartMin,
      checkoutEndMin: d.checkoutEndMin,
    }));
}

function slugifyCode(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18);
  return base || "shift";
}

export type CustomShiftInput = {
  label: string;
  masukMin: number; // jam masuk (menit sejak 00:00)
  pulangMin: number; // jam pulang
  toleranceMin: number;
};

function validateCustomInput(input: CustomShiftInput) {
  const label = input.label.trim();
  if (!label) throw new Error("Nama shift kosong.");
  if (label.length > 60) throw new Error("Nama shift terlalu panjang.");
  const { masukMin, pulangMin } = input;
  if (!Number.isInteger(masukMin) || masukMin < 0 || masukMin > 1439) throw new Error("Jam masuk tidak valid.");
  if (!Number.isInteger(pulangMin) || pulangMin < 0 || pulangMin > 1439) throw new Error("Jam pulang tidak valid.");
  if (pulangMin <= masukMin) throw new Error("Jam pulang harus setelah jam masuk.");
  const tol = Number.isInteger(input.toleranceMin) && input.toleranceMin >= 0 && input.toleranceMin <= 120 ? input.toleranceMin : 5;
  return { label, masukMin, pulangMin, tol };
}

// Turunkan 5 angka window dari jam masuk/pulang + toleransi.
function deriveWindows(masukMin: number, pulangMin: number, tol: number) {
  return {
    startMin: masukMin,
    checkinStartMin: Math.max(0, masukMin - 30),
    checkinEndMin: masukMin + tol,
    checkoutStartMin: pulangMin, // pulang sebelum ini = pulang awal (PA)
    checkoutEndMin: Math.min(1439, pulangMin + 60),
  };
}

async function uniqueCode(base: string): Promise<string> {
  let code = base;
  let n = 2;
  // Cegah bentrok dengan built-in & custom yang ada.
  for (;;) {
    const clashBuiltin = BUILTIN_CODES.has(code);
    const [rows] = await pool.query<(RowDataPacket & { code: string })[]>(
      `SELECT code FROM shift_def WHERE code = ? LIMIT 1`,
      [code],
    );
    if (!clashBuiltin && rows.length === 0) return code;
    code = `${base}_${n}`.slice(0, 24);
    n += 1;
  }
}

export async function createCustomShift(input: CustomShiftInput): Promise<void> {
  await ensureShiftDefSchema();
  const { label, masukMin, pulangMin, tol } = validateCustomInput(input);
  const w = deriveWindows(masukMin, pulangMin, tol);
  const code = await uniqueCode(slugifyCode(label));
  const [maxRow] = await pool.query<(RowDataPacket & { maxSort: number | null })[]>(
    `SELECT MAX(sort) AS maxSort FROM shift_def`,
  );
  const nextSort = Math.max(1000, Number(maxRow[0]?.maxSort ?? 0) + 10);
  await pool.query(
    `INSERT INTO shift_def
       (code, label, start_min, checkin_start_min, checkin_end_min, checkout_start_min, checkout_end_min, tolerance_min, is_libur, is_selectable, is_system, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, ?)`,
    [code, label, w.startMin, w.checkinStartMin, w.checkinEndMin, w.checkoutStartMin, w.checkoutEndMin, tol, nextSort],
  );
}

export async function updateCustomShift(code: string, input: CustomShiftInput): Promise<void> {
  await ensureShiftDefSchema();
  if (BUILTIN_CODES.has(code)) throw new Error("Shift bawaan tidak bisa diubah.");
  const { label, masukMin, pulangMin, tol } = validateCustomInput(input);
  const w = deriveWindows(masukMin, pulangMin, tol);
  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE shift_def
       SET label = ?, start_min = ?, checkin_start_min = ?, checkin_end_min = ?, checkout_start_min = ?, checkout_end_min = ?, tolerance_min = ?
     WHERE code = ? AND is_system = 0`,
    [label, w.startMin, w.checkinStartMin, w.checkinEndMin, w.checkoutStartMin, w.checkoutEndMin, tol, code],
  );
  if (res.affectedRows === 0) throw new Error("Shift tidak ditemukan atau bawaan.");
}

export async function deleteCustomShift(code: string): Promise<void> {
  await ensureShiftDefSchema();
  if (BUILTIN_CODES.has(code)) throw new Error("Shift bawaan tidak bisa dihapus.");
  // Cegah hapus bila masih dipakai di grup.
  const [used] = await pool.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM shift_group_shift WHERE shift_code = ?`,
    [code],
  );
  if (Number(used[0]?.total ?? 0) > 0) {
    throw new Error("Shift masih dipakai di grup. Lepas dulu dari grup sebelum menghapus.");
  }
  await pool.query(`DELETE FROM shift_def WHERE code = ? AND is_system = 0`, [code]);
}
