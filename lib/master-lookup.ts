import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";
import {
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_DIVISIONS,
  EMPLOYEE_ROLES,
  EMPLOYEE_SUB_DIVISIONS,
  EMPLOYEE_UNITS,
} from "@/lib/employees";

// Master dropdown yang bisa dikelola admin (tambah/hapus) tanpa ubah kode.
// value === label (string apa adanya). Di-seed dari const default bila tabel kosong.
export const MASTER_CATEGORIES = {
  unit: { label: "Unit", lookupKey: "units", seed: EMPLOYEE_UNITS },
  jabatan: { label: "Jabatan", lookupKey: "roles", seed: EMPLOYEE_ROLES },
  departemen: { label: "Departemen", lookupKey: "departments", seed: EMPLOYEE_DEPARTMENTS },
  divisi: { label: "Divisi", lookupKey: "divisions", seed: EMPLOYEE_DIVISIONS },
  sub_divisi: { label: "Sub Divisi", lookupKey: "subDivisions", seed: EMPLOYEE_SUB_DIVISIONS },
} as const;

export type MasterCategory = keyof typeof MASTER_CATEGORIES;

export function isMasterCategory(v: unknown): v is MasterCategory {
  return typeof v === "string" && v in MASTER_CATEGORIES;
}

let masterSchemaReady: Promise<void> | null = null;

function ensureMasterLookupSchema(): Promise<void> {
  if (!masterSchemaReady) {
    masterSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS master_lookup (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category VARCHAR(32) NOT NULL,
          value VARCHAR(150) NOT NULL,
          sort INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_master_cat_value (category, value),
          INDEX idx_master_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Seed per kategori bila kosong (agar dropdown tidak hilang di instalasi lama).
      for (const [category, cfg] of Object.entries(MASTER_CATEGORIES)) {
        const [rows] = await pool.query<(RowDataPacket & { total: number })[]>(
          `SELECT COUNT(*) AS total FROM master_lookup WHERE category = ?`,
          [category],
        );
        if ((rows[0]?.total ?? 0) > 0) continue;
        const seed = cfg.seed as readonly string[];
        if (seed.length === 0) continue;
        const placeholders = seed.map(() => "(?, ?, ?)").join(", ");
        const values: (string | number)[] = [];
        seed.forEach((v, i) => values.push(category, v, i));
        await pool.query(
          `INSERT IGNORE INTO master_lookup (category, value, sort) VALUES ${placeholders}`,
          values,
        );
      }
    })();
  }
  return masterSchemaReady;
}

export type MasterLookupItem = { id: number; value: string };

export async function listMasterLookup(category: MasterCategory): Promise<MasterLookupItem[]> {
  await ensureMasterLookupSchema();
  const [rows] = await pool.query<(RowDataPacket & { id: number; value: string })[]>(
    `SELECT id, value FROM master_lookup WHERE category = ? ORDER BY sort ASC, id ASC`,
    [category],
  );
  return rows.map((r) => ({ id: r.id, value: r.value }));
}

// Semua opsi 5 kategori untuk getEmployeeLookups (fallback ke seed bila kosong).
export async function getMasterLookupOptions(): Promise<
  Record<(typeof MASTER_CATEGORIES)[MasterCategory]["lookupKey"], { label: string; value: string }[]>
> {
  await ensureMasterLookupSchema();
  const [rows] = await pool.query<(RowDataPacket & { category: string; value: string })[]>(
    `SELECT category, value FROM master_lookup ORDER BY sort ASC, id ASC`,
  );
  const byCat = new Map<string, string[]>();
  for (const r of rows) {
    const arr = byCat.get(r.category) ?? [];
    arr.push(r.value);
    byCat.set(r.category, arr);
  }
  const out = {} as Record<string, { label: string; value: string }[]>;
  for (const [category, cfg] of Object.entries(MASTER_CATEGORIES)) {
    const list = byCat.get(category) ?? (cfg.seed as readonly string[]).slice();
    out[cfg.lookupKey] = list.map((value) => ({ label: value, value }));
  }
  return out as Record<(typeof MASTER_CATEGORIES)[MasterCategory]["lookupKey"], { label: string; value: string }[]>;
}

export async function addMasterLookup(category: MasterCategory, value: string): Promise<void> {
  await ensureMasterLookupSchema();
  const clean = value.trim();
  if (!clean) throw new Error("Nilai tidak boleh kosong.");
  if (clean.length > 150) throw new Error("Nilai terlalu panjang (maks 150 karakter).");
  const [maxRows] = await pool.query<(RowDataPacket & { maxSort: number | null })[]>(
    `SELECT MAX(sort) AS maxSort FROM master_lookup WHERE category = ?`,
    [category],
  );
  const nextSort = (maxRows[0]?.maxSort ?? -1) + 1;
  await pool.query<ResultSetHeader>(
    `INSERT IGNORE INTO master_lookup (category, value, sort) VALUES (?, ?, ?)`,
    [category, clean, nextSort],
  );
}

export async function deleteMasterLookup(category: MasterCategory, id: number): Promise<void> {
  await ensureMasterLookupSchema();
  await pool.query<ResultSetHeader>(
    `DELETE FROM master_lookup WHERE id = ? AND category = ?`,
    [id, category],
  );
}
