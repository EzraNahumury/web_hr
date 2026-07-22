import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";

// Pencatatan peminjaman barang oleh karyawan (aset/inventaris perusahaan).
export type ItemLoanRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  nip: string;
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
    })();
  }
  await tableReady;
}

// Barang disimpan sebagai JSON array string di kolom TEXT (bisa >1 barang per record).
function parseItems(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
  } catch {
    // fallback: dipisah koma untuk data lama
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type ItemLoanRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  nama: string;
  no_karyawan: string | null;
  barang: string | null;
  tanggal_peminjaman: string | null;
  keterangan: string | null;
  created_at: string | null;
};

function mapRow(row: ItemLoanRow): ItemLoanRecord {
  return {
    id: row.id,
    employeeId: row.karyawan_id,
    employeeName: row.nama,
    nip: row.no_karyawan || "-",
    items: parseItems(row.barang),
    loanDate: row.tanggal_peminjaman,
    note: row.keterangan,
    createdAt: row.created_at,
  };
}

const SELECT_QUERY = `
  SELECT pb.id, pb.karyawan_id, k.nama, k.no_karyawan, pb.barang,
         DATE_FORMAT(pb.tanggal_peminjaman, '%Y-%m-%d') AS tanggal_peminjaman,
         pb.keterangan,
         DATE_FORMAT(pb.created_at, '%Y-%m-%d %H:%i') AS created_at
  FROM peminjaman_barang pb
  INNER JOIN karyawan k ON k.id = pb.karyawan_id
`;

export async function listItemLoans(): Promise<ItemLoanRecord[]> {
  await ensureItemLoanTable();
  const [rows] = await pool.query<ItemLoanRow[]>(
    `${SELECT_QUERY} ORDER BY pb.tanggal_peminjaman DESC, pb.id DESC`,
  );
  return rows.map(mapRow);
}

export async function listItemLoansByEmployee(employeeId: number): Promise<ItemLoanRecord[]> {
  await ensureItemLoanTable();
  const [rows] = await pool.query<ItemLoanRow[]>(
    `${SELECT_QUERY} WHERE pb.karyawan_id = ? ORDER BY pb.tanggal_peminjaman DESC, pb.id DESC`,
    [employeeId],
  );
  return rows.map(mapRow);
}

export async function createItemLoan(payload: {
  employeeId: number;
  items: string[];
  loanDate: string | null;
  note: string | null;
  adminId?: number | null;
}) {
  await ensureItemLoanTable();

  if (!Number.isInteger(payload.employeeId) || payload.employeeId <= 0) {
    throw new Error("Karyawan tidak valid.");
  }
  const items = payload.items.map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) {
    throw new Error("Minimal satu barang yang dipinjam wajib diisi.");
  }
  const loanDate =
    payload.loanDate && /^\d{4}-\d{2}-\d{2}$/.test(payload.loanDate) ? payload.loanDate : null;
  const note = payload.note?.trim().slice(0, 500) || null;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO peminjaman_barang (karyawan_id, barang, tanggal_peminjaman, keterangan, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [payload.employeeId, JSON.stringify(items), loanDate, note, payload.adminId ?? null],
  );
  return result.insertId;
}

export async function deleteItemLoan(id: number) {
  await ensureItemLoanTable();
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM peminjaman_barang WHERE id = ?`,
    [id],
  );
  return result.affectedRows > 0;
}
