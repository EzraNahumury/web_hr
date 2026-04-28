import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

export type JadwalShift =
  | "pagi"
  | "lembur"
  | "siang"
  | "setengah_1"
  | "setengah_2"
  | "libur";

export const JADWAL_SHIFT_LABELS: Record<JadwalShift, string> = {
  pagi: "Pagi",
  lembur: "Lembur",
  siang: "Siang",
  setengah_1: "Setengah 1",
  setengah_2: "Setengah 2",
  libur: "Libur",
};

export const JADWAL_EFFECTIVE_FROM = "2026-05-01";

export type JadwalKaryawanItem = {
  id: number;
  karyawanId: number;
  tanggal: string;
  shift: JadwalShift;
  createdBy: number | null;
};

let jadwalSchemaReady: Promise<void> | null = null;

export function ensureJadwalKaryawanSchema(): Promise<void> {
  if (!jadwalSchemaReady) {
    jadwalSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jadwal_karyawan (
          id INT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id INT NOT NULL,
          tanggal DATE NOT NULL,
          shift ENUM('pagi','lembur','siang','setengah_1','setengah_2','libur') NOT NULL,
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_karyawan_tanggal (karyawan_id, tanggal),
          INDEX idx_tanggal (tanggal)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })();
  }
  return jadwalSchemaReady;
}

type JadwalRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  tanggal: string;
  shift: JadwalShift;
  created_by: number | null;
};

export async function getJadwalForMonth(
  year: number,
  month: number,
): Promise<JadwalKaryawanItem[]> {
  await ensureJadwalKaryawanSchema();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const [rows] = await pool.query<JadwalRow[]>(
    `
      SELECT id, karyawan_id, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, shift, created_by
      FROM jadwal_karyawan
      WHERE tanggal >= ? AND tanggal < DATE_ADD(?, INTERVAL 1 MONTH)
      ORDER BY karyawan_id, tanggal
    `,
    [startDate, startDate],
  );
  return rows.map((r) => ({
    id: r.id,
    karyawanId: r.karyawan_id,
    tanggal: r.tanggal,
    shift: r.shift,
    createdBy: r.created_by,
  }));
}

export type JadwalUpsertEntry = {
  karyawanId: number;
  tanggal: string;
  shift: JadwalShift;
};

export async function upsertJadwalBulk(
  entries: JadwalUpsertEntry[],
  createdBy: number,
) {
  if (entries.length === 0) return;
  await ensureJadwalKaryawanSchema();
  const placeholders = entries.map(() => "(?, ?, ?, ?)").join(", ");
  const values: (number | string)[] = [];
  for (const entry of entries) {
    values.push(entry.karyawanId, entry.tanggal, entry.shift, createdBy);
  }
  await pool.query(
    `
      INSERT INTO jadwal_karyawan (karyawan_id, tanggal, shift, created_by)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        shift = VALUES(shift),
        created_by = VALUES(created_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    values,
  );
}

export async function deleteJadwalEntries(
  pairs: { karyawanId: number; tanggal: string }[],
) {
  if (pairs.length === 0) return 0;
  await ensureJadwalKaryawanSchema();
  const placeholders = pairs.map(() => "(?, ?)").join(", ");
  const values: (number | string)[] = [];
  for (const p of pairs) {
    values.push(p.karyawanId, p.tanggal);
  }
  const [result] = await pool.query<ResultSetHeader>(
    `
      DELETE FROM jadwal_karyawan
      WHERE (karyawan_id, tanggal) IN (${placeholders})
    `,
    values,
  );
  return result.affectedRows;
}

export type TokoGudangKaryawan = {
  id: number;
  nama: string;
  noKaryawan: string | null;
  penempatan: string;
  jabatan: string | null;
};

type TokoGudangRow = RowDataPacket & {
  id: number;
  nama: string;
  no_karyawan: string | null;
  penempatan: string;
  jabatan: string | null;
};

export async function listTokoGudangKaryawan(): Promise<TokoGudangKaryawan[]> {
  const [rows] = await pool.query<TokoGudangRow[]>(
    `
      SELECT id, nama, no_karyawan, penempatan, jabatan
      FROM karyawan
      WHERE penempatan IN ('Toko', 'Toko Solo', 'Gudang')
        AND status_data = 'aktif'
      ORDER BY penempatan ASC, nama ASC
    `,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    noKaryawan: r.no_karyawan,
    penempatan: r.penempatan,
    jabatan: r.jabatan,
  }));
}

export async function getJadwalForKaryawanOnDate(
  karyawanId: number,
  tanggal: string,
): Promise<JadwalKaryawanItem | null> {
  await ensureJadwalKaryawanSchema();
  const [rows] = await pool.query<JadwalRow[]>(
    `
      SELECT id, karyawan_id, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, shift, created_by
      FROM jadwal_karyawan
      WHERE karyawan_id = ? AND tanggal = ?
      LIMIT 1
    `,
    [karyawanId, tanggal],
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    karyawanId: rows[0].karyawan_id,
    tanggal: rows[0].tanggal,
    shift: rows[0].shift,
    createdBy: rows[0].created_by,
  };
}
