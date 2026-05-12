import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";

let holidayTableReady: Promise<void> | null = null;

export async function ensureHolidayTable() {
  if (!holidayTableReady) {
    holidayTableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS libur_nasional (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          tanggal DATE NOT NULL,
          keterangan VARCHAR(255) NULL,
          created_by BIGINT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_libur_tanggal (tanggal)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    })();
  }
  await holidayTableReady;
}

export type NationalHolidayResult = {
  date: string;
  description: string;
  affectedEmployees: number;
};

export async function setNationalHoliday(
  dateIso: string,
  description: string,
  adminId?: number | null,
): Promise<NationalHolidayResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error("Tanggal libur tidak valid.");
  }
  const cleanDescription = description.trim().slice(0, 255);
  if (!cleanDescription) {
    throw new Error("Keterangan libur wajib diisi.");
  }

  await ensureHolidayTable();

  await pool.query<ResultSetHeader>(
    `
      INSERT INTO libur_nasional (tanggal, keterangan, created_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE keterangan = VALUES(keterangan), updated_at = CURRENT_TIMESTAMP
    `,
    [dateIso, cleanDescription, adminId ?? null],
  );

  const [insertResult] = await pool.query<ResultSetHeader>(
    `
      INSERT IGNORE INTO absensi (karyawan_id, tanggal, status_absensi, kode_absensi, keterangan)
      SELECT k.id, ?, 'libur', 'L', ?
      FROM karyawan k
      WHERE k.status_data = 'aktif'
    `,
    [dateIso, cleanDescription],
  );

  return {
    date: dateIso,
    description: cleanDescription,
    affectedEmployees: insertResult.affectedRows,
  };
}

type HolidayRow = RowDataPacket & {
  tanggal: string;
  keterangan: string | null;
};

export async function listNationalHolidaysInRange(startDate: string, endDate: string) {
  await ensureHolidayTable();
  const [rows] = await pool.query<HolidayRow[]>(
    `
      SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, keterangan
      FROM libur_nasional
      WHERE tanggal BETWEEN ? AND ?
      ORDER BY tanggal ASC
    `,
    [startDate, endDate],
  );
  return rows.map((row) => ({ date: row.tanggal, description: row.keterangan ?? "" }));
}
