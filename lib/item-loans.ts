import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";

// Pencatatan peminjaman barang oleh karyawan (aset/inventaris perusahaan).
// Satu catatan bisa melibatkan >1 karyawan dan >1 barang.
export type ItemLoanEmployee = { id: number; name: string; nip: string };

export type ItemLoanRecord = {
  id: number;
  employees: ItemLoanEmployee[];
  items: string[];
  loanDate: string | null;
  note: string | null;
  createdAt: string | null;
};

let tableReady: Promise<void> | null = null;

export async function ensureItemLoanTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS peminjaman_barang (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          karyawan_id BIGINT UNSIGNED NOT NULL,
          karyawan_ids TEXT NULL,
          barang TEXT NOT NULL,
          tanggal_peminjaman DATE NULL,
          keterangan VARCHAR(500) NULL,
          created_by BIGINT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_peminjaman_karyawan (karyawan_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      // Kolom karyawan_ids (banyak karyawan) untuk tabel yang sudah ada (idempotent).
      try {
        await pool.query(`ALTER TABLE peminjaman_barang ADD COLUMN karyawan_ids TEXT NULL AFTER karyawan_id`);
      } catch (err: unknown) {
        const code =
          typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
        if (code !== "ER_DUP_FIELDNAME") throw err;
      }
    })();
  }
  await tableReady;
}

function parseJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Barang disimpan sebagai JSON array string di kolom TEXT (bisa >1 barang).
function parseItems(raw: string | null): string[] {
  if (!raw) return [];
  const arr = parseJsonArray(raw);
  if (arr.length > 0) return arr.map((v) => String(v)).filter(Boolean);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Karyawan id: pakai karyawan_ids (JSON) bila ada, fallback ke kolom lama karyawan_id.
function parseEmployeeIds(karyawanIds: string | null, fallback: number): number[] {
  const arr = parseJsonArray(karyawanIds)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (arr.length > 0) return [...new Set(arr)];
  return Number.isInteger(fallback) && fallback > 0 ? [fallback] : [];
}

type ItemLoanRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  karyawan_ids: string | null;
  barang: string | null;
  tanggal_peminjaman: string | null;
  keterangan: string | null;
  created_at: string | null;
};

const SELECT_QUERY = `
  SELECT id, karyawan_id, karyawan_ids, barang,
         DATE_FORMAT(tanggal_peminjaman, '%Y-%m-%d') AS tanggal_peminjaman,
         keterangan,
         DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
  FROM peminjaman_barang
`;

async function resolveEmployees(ids: number[]): Promise<Map<number, ItemLoanEmployee>> {
  const map = new Map<number, ItemLoanEmployee>();
  const uniq = [...new Set(ids)];
  if (uniq.length === 0) return map;
  const [rows] = await pool.query<(RowDataPacket & { id: number; nama: string; no_karyawan: string | null })[]>(
    `SELECT id, nama, no_karyawan FROM karyawan WHERE id IN (?)`,
    [uniq],
  );
  for (const r of rows) {
    map.set(r.id, { id: r.id, name: r.nama, nip: r.no_karyawan || "-" });
  }
  return map;
}

async function mapRows(rows: ItemLoanRow[]): Promise<ItemLoanRecord[]> {
  const allIds = rows.flatMap((r) => parseEmployeeIds(r.karyawan_ids, r.karyawan_id));
  const empMap = await resolveEmployees(allIds);
  return rows.map((r) => {
    const ids = parseEmployeeIds(r.karyawan_ids, r.karyawan_id);
    const employees = ids.map((id) => empMap.get(id) ?? { id, name: `#${id}`, nip: "-" });
    return {
      id: r.id,
      employees,
      items: parseItems(r.barang),
      loanDate: r.tanggal_peminjaman,
      note: r.keterangan,
      createdAt: r.created_at,
    };
  });
}

export async function listItemLoans(): Promise<ItemLoanRecord[]> {
  await ensureItemLoanTable();
  const [rows] = await pool.query<ItemLoanRow[]>(
    `${SELECT_QUERY} ORDER BY tanggal_peminjaman DESC, id DESC`,
  );
  return mapRows(rows);
}

export async function listItemLoansByEmployee(employeeId: number): Promise<ItemLoanRecord[]> {
  if (!Number.isInteger(employeeId) || employeeId <= 0) return [];
  const all = await listItemLoans();
  return all.filter((r) => r.employees.some((e) => e.id === employeeId));
}

function normalizePayload(payload: { employeeIds: number[]; items: string[]; loanDate: string | null; note: string | null }) {
  const employeeIds = [...new Set(payload.employeeIds.filter((n) => Number.isInteger(n) && n > 0))];
  if (employeeIds.length === 0) {
    throw new Error("Minimal satu karyawan wajib dipilih.");
  }
  const items = payload.items.map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) {
    throw new Error("Minimal satu barang yang dipinjam wajib diisi.");
  }
  const loanDate =
    payload.loanDate && /^\d{4}-\d{2}-\d{2}$/.test(payload.loanDate) ? payload.loanDate : null;
  const note = payload.note?.trim().slice(0, 500) || null;
  return { employeeIds, items, loanDate, note };
}

export async function createItemLoan(payload: {
  employeeIds: number[];
  items: string[];
  loanDate: string | null;
  note: string | null;
  adminId?: number | null;
}) {
  await ensureItemLoanTable();
  const { employeeIds, items, loanDate, note } = normalizePayload(payload);

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO peminjaman_barang (karyawan_id, karyawan_ids, barang, tanggal_peminjaman, keterangan, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [employeeIds[0], JSON.stringify(employeeIds), JSON.stringify(items), loanDate, note, payload.adminId ?? null],
  );
  return result.insertId;
}

export async function updateItemLoan(
  id: number,
  payload: { employeeIds: number[]; items: string[]; loanDate: string | null; note: string | null },
) {
  await ensureItemLoanTable();
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID tidak valid.");
  }
  const { employeeIds, items, loanDate, note } = normalizePayload(payload);

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE peminjaman_barang
       SET karyawan_id = ?, karyawan_ids = ?, barang = ?, tanggal_peminjaman = ?, keterangan = ?
     WHERE id = ?`,
    [employeeIds[0], JSON.stringify(employeeIds), JSON.stringify(items), loanDate, note, id],
  );
  return result.affectedRows > 0;
}

export async function deleteItemLoan(id: number) {
  await ensureItemLoanTable();
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM peminjaman_barang WHERE id = ?`,
    [id],
  );
  return result.affectedRows > 0;
}
