import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";
import { saveBufferToUploads } from "@/lib/uploads";

let visitReportSchemaReady: Promise<void> | null = null;

export async function ensureVisitReportSchema() {
  if (!visitReportSchemaReady) {
    visitReportSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS laporan_kunjungan (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          karyawan_id BIGINT UNSIGNED NOT NULL,
          tanggal DATE NOT NULL,
          waktu_submit DATETIME NOT NULL,
          nama_toko VARCHAR(255) NOT NULL,
          foto_path VARCHAR(500) NOT NULL,
          latitude DECIMAL(10,7) NULL,
          longitude DECIMAL(10,7) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_laporan_kunjungan_karyawan_tanggal (karyawan_id, tanggal),
          KEY idx_laporan_kunjungan_tanggal (tanggal)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    })();
  }

  await visitReportSchemaReady;
}

export type VisitReport = {
  id: number;
  employeeId: number;
  employeeName: string;
  role: string | null;
  division: string | null;
  tanggal: string;
  waktuSubmit: string;
  namaToko: string;
  fotoPath: string;
  latitude: number | null;
  longitude: number | null;
};

type VisitReportRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  nama: string;
  jabatan: string | null;
  divisi: string | null;
  tanggal: string;
  waktu_submit: string;
  nama_toko: string;
  foto_path: string;
  latitude: string | null;
  longitude: string | null;
};

function mapRow(row: VisitReportRow): VisitReport {
  return {
    id: row.id,
    employeeId: row.karyawan_id,
    employeeName: row.nama,
    role: row.jabatan,
    division: row.divisi,
    tanggal: row.tanggal,
    waktuSubmit: row.waktu_submit,
    namaToko: row.nama_toko,
    fotoPath: row.foto_path,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
  };
}

export async function saveVisitReportPhoto(dataUrl: string, employeeId: number) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);

  if (!match) {
    throw new Error("Format foto tidak valid.");
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const extension =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const fileName = `visit-${employeeId}-${Date.now()}.${extension}`;
  return saveBufferToUploads(Buffer.from(base64Data, "base64"), "visit-reports", fileName);
}

export async function createVisitReport(payload: {
  employeeId: number;
  tanggal: string;
  waktuSubmit: string;
  namaToko: string;
  fotoPath: string;
  latitude: number | null;
  longitude: number | null;
}) {
  await ensureVisitReportSchema();

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO laporan_kunjungan
        (karyawan_id, tanggal, waktu_submit, nama_toko, foto_path, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.employeeId,
      payload.tanggal,
      payload.waktuSubmit,
      payload.namaToko,
      payload.fotoPath,
      payload.latitude,
      payload.longitude,
    ],
  );

  return result.insertId;
}

export async function listVisitReportsForEmployee(employeeId: number, tanggal: string) {
  await ensureVisitReportSchema();

  const [rows] = await pool.query<VisitReportRow[]>(
    `
      SELECT
        l.id,
        l.karyawan_id,
        k.nama,
        k.jabatan,
        k.divisi,
        DATE_FORMAT(l.tanggal, '%Y-%m-%d') AS tanggal,
        DATE_FORMAT(l.waktu_submit, '%Y-%m-%d %H:%i:%s') AS waktu_submit,
        l.nama_toko,
        l.foto_path,
        l.latitude,
        l.longitude
      FROM laporan_kunjungan l
      INNER JOIN karyawan k ON k.id = l.karyawan_id
      WHERE l.karyawan_id = ? AND l.tanggal = ?
      ORDER BY l.waktu_submit DESC
    `,
    [employeeId, tanggal],
  );

  return rows.map(mapRow);
}

export async function listVisitReports(filter: {
  startDate: string;
  endDate: string;
  employeeId?: number;
}) {
  await ensureVisitReportSchema();

  const conditions: string[] = ["l.tanggal BETWEEN ? AND ?"];
  const params: (string | number)[] = [filter.startDate, filter.endDate];

  if (filter.employeeId) {
    conditions.push("l.karyawan_id = ?");
    params.push(filter.employeeId);
  }

  const [rows] = await pool.query<VisitReportRow[]>(
    `
      SELECT
        l.id,
        l.karyawan_id,
        k.nama,
        k.jabatan,
        k.divisi,
        DATE_FORMAT(l.tanggal, '%Y-%m-%d') AS tanggal,
        DATE_FORMAT(l.waktu_submit, '%Y-%m-%d %H:%i:%s') AS waktu_submit,
        l.nama_toko,
        l.foto_path,
        l.latitude,
        l.longitude
      FROM laporan_kunjungan l
      INNER JOIN karyawan k ON k.id = l.karyawan_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY l.tanggal DESC, l.waktu_submit DESC
    `,
    params,
  );

  return rows.map(mapRow);
}

export type VisitReportMonthlySummary = {
  employeeId: number;
  employeeName: string;
  role: string | null;
  totalVisits: number;
  uniqueStores: number;
  activeDays: number;
};

type SummaryRow = RowDataPacket & {
  karyawan_id: number;
  nama: string;
  jabatan: string | null;
  total_visits: number;
  unique_stores: number;
  active_days: number;
};

export async function getVisitReportMonthlySummary(month: number, year: number) {
  await ensureVisitReportSchema();

  const [rows] = await pool.query<SummaryRow[]>(
    `
      SELECT
        l.karyawan_id,
        k.nama,
        k.jabatan,
        COUNT(*) AS total_visits,
        COUNT(DISTINCT LOWER(TRIM(l.nama_toko))) AS unique_stores,
        COUNT(DISTINCT l.tanggal) AS active_days
      FROM laporan_kunjungan l
      INNER JOIN karyawan k ON k.id = l.karyawan_id
      WHERE MONTH(l.tanggal) = ? AND YEAR(l.tanggal) = ?
      GROUP BY l.karyawan_id, k.nama, k.jabatan
      ORDER BY total_visits DESC, k.nama ASC
    `,
    [month, year],
  );

  return rows.map<VisitReportMonthlySummary>((row) => ({
    employeeId: row.karyawan_id,
    employeeName: row.nama,
    role: row.jabatan,
    totalVisits: Number(row.total_visits),
    uniqueStores: Number(row.unique_stores),
    activeDays: Number(row.active_days),
  }));
}

export async function listSalesAreaEmployees() {
  const [rows] = await pool.query<(RowDataPacket & { id: number; nama: string })[]>(
    `
      SELECT id, nama FROM karyawan
      WHERE status_data = 'aktif'
        AND LOWER(TRIM(jabatan)) IN ('sales area', 'sales nasional')
      ORDER BY nama ASC
    `,
  );

  return rows.map((row) => ({ id: row.id, name: row.nama }));
}

export async function getEmployeeRoleByUserId(userId: number) {
  const [rows] = await pool.query<
    (RowDataPacket & { id: number; jabatan: string | null })[]
  >(
    `SELECT id, jabatan FROM karyawan WHERE user_id = ? LIMIT 1`,
    [userId],
  );

  return rows[0] ? { employeeId: rows[0].id, role: rows[0].jabatan } : null;
}
