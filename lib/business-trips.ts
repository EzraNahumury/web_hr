import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";

export type BusinessTripStatus = "pending" | "approved" | "rejected";

export type BusinessTripItem = {
  id: number;
  employeeId: number;
  employeeName: string;
  nip: string | null;
  role: string | null;
  department: string | null;
  startDate: string;
  endDate: string;
  letterPath: string;
  note: string | null;
  status: BusinessTripStatus;
  adminNote: string | null;
  approverName: string | null;
  approvedAt: string | null;
  createdAt: string;
};

type BusinessTripRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  nama: string;
  no_karyawan: string | null;
  jabatan: string | null;
  departemen: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  surat_path: string;
  catatan: string | null;
  status_approval: BusinessTripStatus;
  catatan_admin: string | null;
  approver_name: string | null;
  approved_at: string | null;
  created_at: string;
};

type QueryExecutor = PoolConnection | typeof pool;

type ExistingAttendanceRow = RowDataPacket & {
  id: number;
  status_absensi: string | null;
  keterangan: string | null;
};

let businessTripSchemaReady: Promise<void> | null = null;

function toSqlDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(sourceDate: Date, amount: number) {
  const next = new Date(sourceDate);
  next.setDate(next.getDate() + amount);
  return next;
}

function parseSqlDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function mapRow(row: BusinessTripRow): BusinessTripItem {
  return {
    id: row.id,
    employeeId: row.karyawan_id,
    employeeName: row.nama,
    nip: row.no_karyawan,
    role: row.jabatan,
    department: row.departemen,
    startDate: row.tanggal_mulai,
    endDate: row.tanggal_selesai,
    letterPath: row.surat_path,
    note: row.catatan,
    status: row.status_approval,
    adminNote: row.catatan_admin,
    approverName: row.approver_name,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  };
}

export async function ensureBusinessTripSchema() {
  if (!businessTripSchemaReady) {
    businessTripSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS perjalanan_dinas (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          karyawan_id BIGINT UNSIGNED NOT NULL,
          tanggal_mulai DATE NOT NULL,
          tanggal_selesai DATE NOT NULL,
          surat_path VARCHAR(500) NOT NULL,
          catatan TEXT NULL,
          status_approval ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
          approved_by BIGINT UNSIGNED NULL DEFAULT NULL,
          approved_at DATETIME NULL DEFAULT NULL,
          catatan_admin VARCHAR(255) NULL DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_perjalanan_dinas_karyawan (karyawan_id),
          KEY idx_perjalanan_dinas_status (status_approval),
          KEY idx_perjalanan_dinas_tanggal (tanggal_mulai, tanggal_selesai),
          CONSTRAINT fk_perjalanan_dinas_karyawan
            FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
            ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    })();
  }

  await businessTripSchemaReady;
}

async function listBusinessTrips(whereSql = "", params: Array<string | number> = []) {
  await ensureBusinessTripSchema();
  const [rows] = await pool.query<BusinessTripRow[]>(
    `
      SELECT
        pd.id,
        pd.karyawan_id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.departemen,
        DATE_FORMAT(pd.tanggal_mulai, '%Y-%m-%d') AS tanggal_mulai,
        DATE_FORMAT(pd.tanggal_selesai, '%Y-%m-%d') AS tanggal_selesai,
        pd.surat_path,
        pd.catatan,
        pd.status_approval,
        pd.catatan_admin,
        u.nama AS approver_name,
        DATE_FORMAT(pd.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at,
        DATE_FORMAT(pd.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM perjalanan_dinas pd
      INNER JOIN karyawan k ON k.id = pd.karyawan_id
      LEFT JOIN users u ON u.id = pd.approved_by
      ${whereSql}
      ORDER BY pd.created_at DESC, pd.id DESC
    `,
    params,
  );
  return rows.map(mapRow);
}

async function getBusinessTripById(id: number, connection?: QueryExecutor) {
  const executor = connection ?? pool;
  await ensureBusinessTripSchema();
  const [rows] = await executor.query<BusinessTripRow[]>(
    `
      SELECT
        pd.id,
        pd.karyawan_id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.departemen,
        DATE_FORMAT(pd.tanggal_mulai, '%Y-%m-%d') AS tanggal_mulai,
        DATE_FORMAT(pd.tanggal_selesai, '%Y-%m-%d') AS tanggal_selesai,
        pd.surat_path,
        pd.catatan,
        pd.status_approval,
        pd.catatan_admin,
        u.nama AS approver_name,
        DATE_FORMAT(pd.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at,
        DATE_FORMAT(pd.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM perjalanan_dinas pd
      INNER JOIN karyawan k ON k.id = pd.karyawan_id
      LEFT JOIN users u ON u.id = pd.approved_by
      WHERE pd.id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listEmployeeBusinessTrips(employeeId: number) {
  return listBusinessTrips("WHERE pd.karyawan_id = ?", [employeeId]);
}

export async function listAdminBusinessTrips() {
  return listBusinessTrips();
}

export async function createEmployeeBusinessTrip(payload: {
  employeeId: number;
  startDate: string;
  endDate: string;
  letterPath: string;
  note: string | null;
}) {
  await ensureBusinessTripSchema();
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO perjalanan_dinas (
        karyawan_id,
        tanggal_mulai,
        tanggal_selesai,
        surat_path,
        catatan,
        status_approval
      ) VALUES (?, ?, ?, ?, ?, 'pending')
    `,
    [payload.employeeId, payload.startDate, payload.endDate, payload.letterPath, payload.note],
  );

  return getBusinessTripById(result.insertId);
}

async function applyBusinessTripAttendance(
  connection: PoolConnection,
  trip: {
    id: number;
    employeeId: number;
    startDate: string;
    endDate: string;
  },
) {
  const start = parseSqlDate(trip.startDate);
  const end = parseSqlDate(trip.endDate);
  const effectiveStart = start; // otomatis hadir mulai hari H
  const attendanceNote = `Auto hadir perjalanan dinas #${trip.id} (${toSqlDate(start)} s/d ${toSqlDate(end)})`;

  let cursor = effectiveStart;
  while (cursor <= end) {
    const sqlDate = toSqlDate(cursor);
    const [existingRows] = await connection.query<ExistingAttendanceRow[]>(
      `
        SELECT id, status_absensi, keterangan
        FROM absensi
        WHERE karyawan_id = ? AND tanggal = ?
        LIMIT 1
      `,
      [trip.employeeId, sqlDate],
    );

    const existing = existingRows[0];

    if (!existing) {
      await connection.query(
        `
          INSERT INTO absensi (
            karyawan_id,
            tanggal,
            jam_masuk,
            jam_pulang,
            status_absensi,
            kode_absensi,
            foto_masuk,
            foto_pulang,
            latitude_masuk,
            longitude_masuk,
            latitude_pulang,
            longitude_pulang,
            terlambat_menit,
            setengah_hari,
            lembur_jam,
            keterangan
          ) VALUES (?, ?, NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, ?)
        `,
        [trip.employeeId, sqlDate, attendanceNote],
      );
    } else {
      await connection.query(
        `
          UPDATE absensi
          SET
            status_absensi = 'hadir',
            kode_absensi = 'O',
            terlambat_menit = 0,
            setengah_hari = 0,
            keterangan = ?
          WHERE id = ?
        `,
        [attendanceNote, existing.id],
      );
    }

    cursor = addDays(cursor, 1);
  }
}

export async function updateBusinessTripApproval(payload: {
  id: number;
  adminId: number;
  status: Exclude<BusinessTripStatus, "pending">;
  note: string | null;
}) {
  await ensureBusinessTripSchema();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<(RowDataPacket & {
      id: number;
      karyawan_id: number;
      tanggal_mulai: string;
      tanggal_selesai: string;
      status_approval: BusinessTripStatus;
    })[]>(
      `
        SELECT
          id,
          karyawan_id,
          DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') AS tanggal_mulai,
          DATE_FORMAT(tanggal_selesai, '%Y-%m-%d') AS tanggal_selesai,
          status_approval
        FROM perjalanan_dinas
        WHERE id = ?
        LIMIT 1
      `,
      [payload.id],
    );

    const existing = rows[0];
    if (!existing) {
      throw new Error("Pengajuan perjalanan dinas tidak ditemukan.");
    }
    if (existing.status_approval !== "pending") {
      throw new Error("Pengajuan perjalanan dinas ini sudah diproses sebelumnya.");
    }

    if (payload.status === "approved") {
      await applyBusinessTripAttendance(connection, {
        id: existing.id,
        employeeId: existing.karyawan_id,
        startDate: existing.tanggal_mulai,
        endDate: existing.tanggal_selesai,
      });
    }

    await connection.query<ResultSetHeader>(
      `
        UPDATE perjalanan_dinas
        SET
          status_approval = ?,
          approved_by = ?,
          approved_at = NOW(),
          catatan_admin = ?
        WHERE id = ?
      `,
      [payload.status, payload.adminId, payload.note, payload.id],
    );

    await connection.commit();
    return getBusinessTripById(payload.id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
