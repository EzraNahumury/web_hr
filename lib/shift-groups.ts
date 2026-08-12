import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { ensureEmployeeSchemaSupport } from "@/lib/employees";
import { getShiftOptionsFor, type ShiftOption } from "@/lib/jadwal-shift-options";

// ── FASE 1: grup shift (targeting jabatan/departemen/penempatan/custom + pengecualian) ──
// Grup hanya MENYUSUN dropdown shift dari shift yang SUDAH ADA. Belum menyentuh jam absensi.
// Karyawan yang tidak masuk grup mana pun tetap memakai perilaku lama (getShiftOptionsFor).

export const SHIFT_TARGET_TYPES = ["jabatan", "departemen", "penempatan", "custom"] as const;
export type ShiftTargetType = (typeof SHIFT_TARGET_TYPES)[number];

export function isShiftTargetType(v: unknown): v is ShiftTargetType {
  return typeof v === "string" && (SHIFT_TARGET_TYPES as readonly string[]).includes(v);
}

// Katalog shift yang boleh dipilih untuk mengisi dropdown sebuah grup (Fase 1 = shift existing).
export const SELECTABLE_SHIFTS: { code: string; label: string }[] = [
  { code: "pagi", label: "Pagi (08:30 - 16:30)" },
  { code: "siang", label: "Siang (12:00 - 21:00)" },
  { code: "lembur", label: "Lembur (10:00 - 21:00)" },
  { code: "ayres_siang", label: "Siang (14:00 - 22:00)" },
  { code: "jne_pagi", label: "JNE Pagi (08:00 - 16:00)" },
  { code: "jne_siang", label: "JNE Siang (14:00 - 21:00)" },
  { code: "jne_minggu", label: "JNE Minggu (13:00 - 20:00)" },
  { code: "libur", label: "Libur" },
];

const SELECTABLE_CODES = new Set(SELECTABLE_SHIFTS.map((s) => s.code));
const SHIFT_LABEL = new Map(SELECTABLE_SHIFTS.map((s) => [s.code, s.label] as const));

export type ShiftGroupRoster = {
  id: number;
  nama: string;
  noKaryawan: string | null;
  penempatan: string;
  departemen: string | null;
  subDivisi: string | null;
  jabatan: string | null;
};

export type ShiftGroup = {
  id: number;
  name: string;
  targetType: ShiftTargetType;
  targetValue: string | null;
  sort: number;
  shiftCodes: string[];
  // karyawan_id yang dikecualikan (target-based) atau dimasukkan (custom).
  memberIds: number[];
};

let schemaReady: Promise<void> | null = null;

export function ensureShiftGroupSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(
        `
          CREATE TABLE IF NOT EXISTS shift_group (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            target_type ENUM('jabatan','departemen','penempatan','custom') NOT NULL,
            target_value VARCHAR(120) NULL,
            sort INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,
      );
      await pool.query(
        `
          CREATE TABLE IF NOT EXISTS shift_group_shift (
            id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            shift_code VARCHAR(24) NOT NULL,
            sort INT NOT NULL DEFAULT 0,
            UNIQUE KEY uk_group_shift (group_id, shift_code)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,
      );
      await pool.query(
        `
          CREATE TABLE IF NOT EXISTS shift_group_member (
            id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            karyawan_id INT NOT NULL,
            kind ENUM('include','exclude') NOT NULL,
            UNIQUE KEY uk_group_member (group_id, karyawan_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,
      );

      // Seed grup bawaan (Ayres & JNE) sekali agar perilaku existing terwakili di DB.
      // Standard = fallback (tanpa grup), sama seperti getShiftOptionsFor.
      const [rows] = await pool.query<(RowDataPacket & { total: number })[]>(
        `SELECT COUNT(*) AS total FROM shift_group`,
      );
      if (Number(rows[0]?.total ?? 0) === 0) {
        await seedGroup("Ayres", "penempatan", "Ayres", ["pagi", "ayres_siang", "libur"], 0);
        await seedGroup("JNE", "penempatan", "JNE", ["jne_pagi", "jne_siang", "jne_minggu", "libur"], 10);
      }
    })();
  }
  return schemaReady;
}

async function seedGroup(
  name: string,
  targetType: ShiftTargetType,
  targetValue: string | null,
  shiftCodes: string[],
  sort: number,
) {
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO shift_group (name, target_type, target_value, sort) VALUES (?, ?, ?, ?)`,
    [name, targetType, targetValue, sort],
  );
  const groupId = res.insertId;
  let s = 0;
  for (const code of shiftCodes) {
    await pool.query(`INSERT INTO shift_group_shift (group_id, shift_code, sort) VALUES (?, ?, ?)`, [
      groupId,
      code,
      s,
    ]);
    s += 10;
  }
}

export async function getShiftGroupRoster(): Promise<ShiftGroupRoster[]> {
  await ensureEmployeeSchemaSupport();
  const [rows] = await pool.query<
    (RowDataPacket & {
      id: number;
      nama: string;
      no_karyawan: string | null;
      penempatan: string;
      departemen: string | null;
      sub_divisi: string | null;
      jabatan: string | null;
    })[]
  >(
    `
      SELECT id, nama, no_karyawan, penempatan, departemen, sub_divisi, jabatan
      FROM karyawan
      WHERE status_data = 'aktif' AND is_shift = 1
      ORDER BY penempatan ASC, nama ASC
    `,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    noKaryawan: r.no_karyawan,
    penempatan: r.penempatan,
    departemen: r.departemen,
    subDivisi: r.sub_divisi,
    jabatan: r.jabatan,
  }));
}

export async function listShiftGroups(): Promise<ShiftGroup[]> {
  await ensureShiftGroupSchema();
  const [groups] = await pool.query<
    (RowDataPacket & {
      id: number;
      name: string;
      target_type: ShiftTargetType;
      target_value: string | null;
      sort: number;
    })[]
  >(`SELECT id, name, target_type, target_value, sort FROM shift_group ORDER BY sort ASC, id ASC`);

  if (groups.length === 0) return [];

  const ids = groups.map((g) => g.id);
  const [shiftRows] = await pool.query<(RowDataPacket & { group_id: number; shift_code: string })[]>(
    `SELECT group_id, shift_code FROM shift_group_shift WHERE group_id IN (?) ORDER BY sort ASC, id ASC`,
    [ids],
  );
  const [memberRows] = await pool.query<(RowDataPacket & { group_id: number; karyawan_id: number })[]>(
    `SELECT group_id, karyawan_id FROM shift_group_member WHERE group_id IN (?)`,
    [ids],
  );

  const shiftsByGroup = new Map<number, string[]>();
  for (const r of shiftRows) {
    const arr = shiftsByGroup.get(r.group_id) ?? [];
    arr.push(r.shift_code);
    shiftsByGroup.set(r.group_id, arr);
  }
  const membersByGroup = new Map<number, number[]>();
  for (const r of memberRows) {
    const arr = membersByGroup.get(r.group_id) ?? [];
    arr.push(r.karyawan_id);
    membersByGroup.set(r.group_id, arr);
  }

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    targetType: g.target_type,
    targetValue: g.target_value,
    sort: g.sort,
    shiftCodes: shiftsByGroup.get(g.id) ?? [],
    memberIds: membersByGroup.get(g.id) ?? [],
  }));
}

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

// Apakah karyawan cocok dengan TARGET grup (sebelum pengecualian).
function matchesTarget(group: ShiftGroup, emp: ShiftGroupRoster): boolean {
  if (group.targetType === "custom") return false; // custom = pakai memberIds (include)
  const tv = norm(group.targetValue);
  if (!tv) return false;
  if (group.targetType === "jabatan") return norm(emp.jabatan) === tv;
  if (group.targetType === "departemen") return norm(emp.departemen) === tv;
  if (group.targetType === "penempatan") return norm(emp.penempatan) === tv;
  return false;
}

// Anggota efektif sebuah grup terhadap roster (is_shift=1):
// - custom  : hanya karyawan yang di-include (memberIds).
// - lainnya : semua yang match target, minus yang di-exclude (memberIds).
export function resolveGroupMemberIds(group: ShiftGroup, roster: ShiftGroupRoster[]): Set<number> {
  const memberSet = new Set(group.memberIds);
  if (group.targetType === "custom") {
    return new Set(roster.filter((e) => memberSet.has(e.id)).map((e) => e.id));
  }
  return new Set(
    roster.filter((e) => matchesTarget(group, e) && !memberSet.has(e.id)).map((e) => e.id),
  );
}

// Peta karyawanId -> grup pemenang (grup pertama berdasarkan sort,id). Konflik ditangani
// via peringatan saat menyimpan; di sini dipilih deterministik agar dropdown selalu stabil.
async function buildEmployeeGroupMap(): Promise<Map<number, ShiftGroup>> {
  const [groups, roster] = await Promise.all([listShiftGroups(), getShiftGroupRoster()]);
  const map = new Map<number, ShiftGroup>();
  for (const g of groups) {
    const members = resolveGroupMemberIds(g, roster);
    for (const id of members) {
      if (!map.has(id)) map.set(id, g); // grup pertama menang
    }
  }
  return map;
}

// Opsi dropdown per karyawan (dipakai server untuk mengisi Bagan/Master Set Jadwal).
// Fallback ke getShiftOptionsFor(penempatan) bila karyawan tak masuk grup mana pun.
export async function getShiftOptionsByKaryawan(
  roster: { id: number; penempatan: string }[],
): Promise<Record<number, { value: ShiftOption; label: string }[]>> {
  const groupMap = await buildEmployeeGroupMap();
  const out: Record<number, { value: ShiftOption; label: string }[]> = {};
  for (const emp of roster) {
    const group = groupMap.get(emp.id);
    if (group && group.shiftCodes.length > 0) {
      const codes = group.shiftCodes.filter((c) => SELECTABLE_CODES.has(c));
      // "libur" wajib selalu tersedia (hari off/libur nasional lewat Bagan), walau tak dipilih.
      if (!codes.includes("libur")) codes.push("libur");
      out[emp.id] = [
        { value: "", label: "—" },
        ...codes.map((c) => ({ value: c as ShiftOption, label: SHIFT_LABEL.get(c) ?? c })),
      ];
    } else {
      out[emp.id] = getShiftOptionsFor(emp.penempatan);
    }
  }
  return out;
}

// Nilai shift yang diizinkan per karyawan (untuk validasi server saat simpan jadwal).
export async function getAllowedShiftsByKaryawan(): Promise<Map<number, Set<string>>> {
  const [groupMap, roster] = await Promise.all([buildEmployeeGroupMap(), getShiftGroupRoster()]);
  const out = new Map<number, Set<string>>();
  for (const emp of roster) {
    const group = groupMap.get(emp.id);
    if (group && group.shiftCodes.length > 0) {
      const set = new Set(group.shiftCodes);
      set.add("libur"); // libur selalu diizinkan (set hari off/libur via Bagan)
      out.set(emp.id, set);
    }
  }
  return out;
}

// Untuk peringatan konflik di UI: karyawanId -> nama grup lain yang sudah memilikinya.
export async function getMembershipConflicts(
  excludeGroupId: number | null,
  candidateIds: number[],
): Promise<Record<number, string>> {
  const [groups, roster] = await Promise.all([listShiftGroups(), getShiftGroupRoster()]);
  const candidate = new Set(candidateIds);
  const out: Record<number, string> = {};
  for (const g of groups) {
    if (excludeGroupId != null && g.id === excludeGroupId) continue;
    const members = resolveGroupMemberIds(g, roster);
    for (const id of members) {
      if (candidate.has(id) && out[id] === undefined) out[id] = g.name;
    }
  }
  return out;
}

// ── CRUD ──
type SaveGroupInput = {
  name: string;
  targetType: ShiftTargetType;
  targetValue: string | null;
  shiftCodes: string[];
  memberIds: number[]; // include (custom) / exclude (target-based)
};

function validateGroupInput(input: SaveGroupInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Nama grup kosong.");
  if (name.length > 80) throw new Error("Nama grup terlalu panjang.");
  if (!isShiftTargetType(input.targetType)) throw new Error("Tipe target tidak valid.");
  const targetValue = input.targetType === "custom" ? null : (input.targetValue ?? "").trim();
  if (input.targetType !== "custom" && !targetValue) throw new Error("Nilai target wajib diisi.");
  const codes = input.shiftCodes.filter((c) => SELECTABLE_CODES.has(c));
  if (codes.length === 0) throw new Error("Pilih minimal 1 shift untuk dropdown grup.");
  return { name, targetValue: targetValue || null, codes };
}

async function replaceGroupChildren(groupId: number, codes: string[], memberIds: number[], kind: "include" | "exclude") {
  await pool.query(`DELETE FROM shift_group_shift WHERE group_id = ?`, [groupId]);
  let s = 0;
  for (const code of codes) {
    await pool.query(`INSERT INTO shift_group_shift (group_id, shift_code, sort) VALUES (?, ?, ?)`, [
      groupId,
      code,
      s,
    ]);
    s += 10;
  }
  await pool.query(`DELETE FROM shift_group_member WHERE group_id = ?`, [groupId]);
  const uniqueMembers = Array.from(new Set(memberIds.filter((n) => Number.isInteger(n) && n > 0)));
  for (const id of uniqueMembers) {
    await pool.query(`INSERT INTO shift_group_member (group_id, karyawan_id, kind) VALUES (?, ?, ?)`, [
      groupId,
      id,
      kind,
    ]);
  }
}

export async function createShiftGroup(input: SaveGroupInput): Promise<void> {
  await ensureShiftGroupSchema();
  const { name, targetValue, codes } = validateGroupInput(input);
  const [maxRow] = await pool.query<(RowDataPacket & { maxSort: number | null })[]>(
    `SELECT MAX(sort) AS maxSort FROM shift_group`,
  );
  const nextSort = Number(maxRow[0]?.maxSort ?? 0) + 10;
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO shift_group (name, target_type, target_value, sort) VALUES (?, ?, ?, ?)`,
    [name, input.targetType, targetValue, nextSort],
  );
  const kind = input.targetType === "custom" ? "include" : "exclude";
  await replaceGroupChildren(res.insertId, codes, input.memberIds, kind);
}

export async function updateShiftGroup(id: number, input: SaveGroupInput): Promise<void> {
  await ensureShiftGroupSchema();
  const { name, targetValue, codes } = validateGroupInput(input);
  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE shift_group SET name = ?, target_type = ?, target_value = ? WHERE id = ?`,
    [name, input.targetType, targetValue, id],
  );
  if (res.affectedRows === 0) throw new Error("Grup tidak ditemukan.");
  const kind = input.targetType === "custom" ? "include" : "exclude";
  await replaceGroupChildren(id, codes, input.memberIds, kind);
}

export async function deleteShiftGroup(id: number): Promise<void> {
  await ensureShiftGroupSchema();
  await pool.query(`DELETE FROM shift_group WHERE id = ?`, [id]);
  await pool.query(`DELETE FROM shift_group_shift WHERE group_id = ?`, [id]);
  await pool.query(`DELETE FROM shift_group_member WHERE group_id = ?`, [id]);
}
