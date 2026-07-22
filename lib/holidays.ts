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
          tipe VARCHAR(20) NOT NULL DEFAULT 'nasional',
          created_by BIGINT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_libur_tanggal (tanggal)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      // Kolom tipe untuk tabel yang sudah ada sebelumnya (idempotent).
      try {
        await pool.query(
          `ALTER TABLE libur_nasional ADD COLUMN tipe VARCHAR(20) NOT NULL DEFAULT 'nasional' AFTER keterangan`,
        );
      } catch (err: unknown) {
        const code =
          typeof err === "object" && err !== null && "code" in err
            ? (err as { code: string }).code
            : "";
        if (code !== "ER_DUP_FIELDNAME") throw err;
      }
    })();
  }
  await holidayTableReady;
}

// Libur Nasional -> kode LN; Libur Perusahaan -> kode LP. Keduanya sama di payroll
// (dapat gaji pokok, tidak uang makan), hanya beda label/kode. (Kode L dipakai untuk
// libur biasa/terjadwal & Minggu.)
export type HolidayType = "nasional" | "perusahaan";

function holidayKode(tipe: HolidayType) {
  return tipe === "perusahaan" ? "LP" : "LN";
}

export type NationalHolidayResult = {
  date: string;
  description: string;
  type: HolidayType;
  affectedEmployees: number;
};

export async function setNationalHoliday(
  dateIso: string,
  description: string,
  adminId?: number | null,
  tipe: HolidayType = "nasional",
): Promise<NationalHolidayResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error("Tanggal libur tidak valid.");
  }
  const cleanDescription = description.trim().slice(0, 255);
  if (!cleanDescription) {
    throw new Error("Keterangan libur wajib diisi.");
  }
  const normalizedType: HolidayType = tipe === "perusahaan" ? "perusahaan" : "nasional";
  const kode = holidayKode(normalizedType);

  await ensureHolidayTable();

  await pool.query<ResultSetHeader>(
    `
      INSERT INTO libur_nasional (tanggal, keterangan, tipe, created_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE keterangan = VALUES(keterangan), tipe = VALUES(tipe), updated_at = CURRENT_TIMESTAMP
    `,
    [dateIso, cleanDescription, normalizedType, adminId ?? null],
  );

  // Bersihkan record libur otomatis lama (L/LP) supaya ganti tipe konsisten. Hanya record
  // libur murni (tanpa jam masuk) — tidak menyentuh absensi karyawan yang benar-benar hadir.
  await pool.query<ResultSetHeader>(
    `DELETE FROM absensi
     WHERE tanggal = ? AND status_absensi = 'libur' AND kode_absensi IN ('L','LN','LP') AND jam_masuk IS NULL`,
    [dateIso],
  );

  const [insertResult] = await pool.query<ResultSetHeader>(
    `
      INSERT IGNORE INTO absensi (karyawan_id, tanggal, status_absensi, kode_absensi, keterangan)
      SELECT k.id, ?, 'libur', ?, ?
      FROM karyawan k
      WHERE k.status_data = 'aktif'
    `,
    [dateIso, kode, cleanDescription],
  );

  return {
    date: dateIso,
    description: cleanDescription,
    type: normalizedType,
    affectedEmployees: insertResult.affectedRows,
  };
}

type HolidayRow = RowDataPacket & {
  tanggal: string;
  keterangan: string | null;
  tipe: string | null;
};

export async function listNationalHolidaysInRange(startDate: string, endDate: string) {
  await ensureHolidayTable();
  const [rows] = await pool.query<HolidayRow[]>(
    `
      SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, keterangan, tipe
      FROM libur_nasional
      WHERE tanggal BETWEEN ? AND ?
      ORDER BY tanggal ASC
    `,
    [startDate, endDate],
  );
  return rows.map((row) => ({
    date: row.tanggal,
    description: row.keterangan ?? "",
    type: (row.tipe === "perusahaan" ? "perusahaan" : "nasional") as HolidayType,
  }));
}

export async function cancelNationalHoliday(dateIso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error("Tanggal libur tidak valid.");
  }
  await ensureHolidayTable();

  const [deleteAbsensi] = await pool.query<ResultSetHeader>(
    `DELETE FROM absensi
     WHERE tanggal = ? AND status_absensi = 'libur' AND kode_absensi IN ('L','LN','LP') AND jam_masuk IS NULL`,
    [dateIso],
  );

  const [deleteHoliday] = await pool.query<ResultSetHeader>(
    `DELETE FROM libur_nasional WHERE tanggal = ?`,
    [dateIso],
  );

  return {
    date: dateIso,
    affectedEmployees: deleteAbsensi.affectedRows,
    holidayDeleted: deleteHoliday.affectedRows > 0,
  };
}
