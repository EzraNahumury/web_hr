import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type EmployeeListItem = {
  id: number;
  userId: number;
  name: string;
  nip: string;
  email: string;
  passwordLabel: string;
  role: string;
  division: string;
  department: string;
  recapGroup: string | null;
  bank: string | null;
  accountNumber: string | null;
  workStatus: "tetap" | "kontrak" | "freelance" | "magang" | "resign";
  contractDate: string | null;
  contractEndDate: string | null;
  annualRaise: string;
  userActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LookupOption = {
  label: string;
  value: string;
};

export type EmployeePayload = {
  name: string;
  nip: string;
  email: string;
  password: string | null;
  role: string;
  division: string;
  department: string;
  recapGroup: string | null;
  bank: string | null;
  accountNumber: string | null;
  workStatus: "tetap" | "kontrak" | "freelance" | "magang" | "resign";
  contractDate: string | null;
  contractEndDate: string | null;
  annualRaise: number;
  userActive: boolean;
};

type EmployeeRow = RowDataPacket & {
  id: number;
  user_id: number;
  nama: string;
  no_karyawan: string;
  email: string;
  jabatan: string;
  divisi: string;
  departemen: string;
  pembagian_rekapan: string | null;
  bank: string | null;
  no_rekening: string | null;
  status_kerja: EmployeeListItem["workStatus"];
  tanggal_kontrak: string | null;
  tanggal_selesai_kontrak: string | null;
  kenaikan_tiap_tahun: string;
  status_aktif: number;
  created_at: string;
  updated_at: string;
};

type ValueRow = RowDataPacket & {
  value: string;
};

type CountRow = RowDataPacket & {
  total: number;
};

function mapEmployee(row: EmployeeRow): EmployeeListItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.nama,
    nip: row.no_karyawan,
    email: row.email,
    passwordLabel: "Tersimpan",
    role: row.jabatan,
    division: row.divisi,
    department: row.departemen,
    recapGroup: row.pembagian_rekapan,
    bank: row.bank,
    accountNumber: row.no_rekening,
    workStatus: row.status_kerja,
    contractDate: row.tanggal_kontrak,
    contractEndDate: row.tanggal_selesai_kontrak,
    annualRaise: row.kenaikan_tiap_tahun,
    userActive: row.status_aktif === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchDistinctOptions(column: "jabatan" | "divisi" | "departemen" | "pembagian_rekapan") {
  const [rows] = await pool.query<ValueRow[]>(
    `
      SELECT DISTINCT ${column} AS value
      FROM karyawan
      WHERE ${column} IS NOT NULL AND ${column} <> ''
      ORDER BY ${column} ASC
    `,
  );

  return rows.map((row) => ({
    label: row.value,
    value: row.value,
  }));
}

export async function listEmployees() {
  const [rows] = await pool.query<EmployeeRow[]>(
    `
      SELECT
        k.id,
        k.user_id,
        k.nama,
        k.no_karyawan,
        u.email,
        k.jabatan,
        k.divisi,
        k.departemen,
        k.pembagian_rekapan,
        k.bank,
        k.no_rekening,
        k.status_kerja,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        DATE_FORMAT(k.tanggal_selesai_kontrak, '%Y-%m-%d') AS tanggal_selesai_kontrak,
        k.kenaikan_tiap_tahun,
        u.status_aktif,
        DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM karyawan k
      INNER JOIN users u ON u.id = k.user_id
      ORDER BY k.created_at DESC, k.id DESC
    `,
  );

  return rows.map(mapEmployee);
}

export async function getEmployeeById(id: number) {
  const [rows] = await pool.query<EmployeeRow[]>(
    `
      SELECT
        k.id,
        k.user_id,
        k.nama,
        k.no_karyawan,
        u.email,
        k.jabatan,
        k.divisi,
        k.departemen,
        k.pembagian_rekapan,
        k.bank,
        k.no_rekening,
        k.status_kerja,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        DATE_FORMAT(k.tanggal_selesai_kontrak, '%Y-%m-%d') AS tanggal_selesai_kontrak,
        k.kenaikan_tiap_tahun,
        u.status_aktif,
        DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM karyawan k
      INNER JOIN users u ON u.id = k.user_id
      WHERE k.id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapEmployee(rows[0]) : null;
}

export async function getEmployeeLookups() {
  const [roles, divisions] = await Promise.all([
    fetchDistinctOptions("jabatan"),
    fetchDistinctOptions("divisi"),
  ]);

  return {
    roles,
    divisions,
    departments: [
      { label: "Ayres Apparel", value: "Ayres Apparel" },
      { label: "AVA Group", value: "AVA Group" },
      { label: "JNE", value: "JNE" },
    ],
    recapGroups: [
      { label: "Logistik AVA", value: "Logistik AVA" },
      { label: "Penjualan AVA", value: "Penjualan AVA" },
      { label: "Umum AVA", value: "Umum AVA" },
      { label: "Produksi Ayres", value: "Produksi Ayres" },
      { label: "Penjualan Ayres", value: "Penjualan Ayres" },
      { label: "Umum Ayres", value: "Umum Ayres" },
    ],
    banks: [
      { label: "BCA", value: "BCA" },
    ],
    workStatuses: [
      { label: "Tetap", value: "tetap" },
      { label: "Kontrak", value: "kontrak" },
      { label: "Freelance", value: "freelance" },
      { label: "Magang", value: "magang" },
      { label: "Resign", value: "resign" },
    ],
  };
}

export async function getEmployeeStats() {
  const [employeeRows, contractRows, activeLoanRows] = await Promise.all([
    pool.query<CountRow[]>("SELECT COUNT(*) AS total FROM karyawan"),
    pool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM karyawan WHERE status_kerja = 'kontrak'",
    ),
    pool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM pinjaman WHERE status_pinjaman IN ('approved', 'berjalan')",
    ),
  ]);

  return {
    totalEmployees: employeeRows[0][0]?.total ?? 0,
    totalContract: contractRows[0][0]?.total ?? 0,
    activeLoans: activeLoanRows[0][0]?.total ?? 0,
  };
}

export async function insertEmployee(payload: EmployeePayload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [userResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO users (nama, email, password, role, status_aktif)
        VALUES (?, ?, SHA2(?, 256), 'karyawan', ?)
      `,
      [payload.name, payload.email, payload.password, payload.userActive ? 1 : 0],
    );

    const userId = userResult.insertId;

    const [employeeResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO karyawan (
          user_id,
          no_karyawan,
          nama,
          jabatan,
          divisi,
          departemen,
          pembagian_rekapan,
          bank,
          no_rekening,
          status_kerja,
          tanggal_kontrak,
          tanggal_selesai_kontrak,
          kenaikan_tiap_tahun
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        payload.nip,
        payload.name,
        payload.role,
        payload.division,
        payload.department,
        payload.recapGroup,
        payload.bank,
        payload.accountNumber,
        payload.workStatus,
        payload.contractDate,
        payload.contractEndDate,
        payload.annualRaise,
      ],
    );

    await connection.commit();

    return getEmployeeById(employeeResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployee(id: number, payload: EmployeePayload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query<(RowDataPacket & { user_id: number })[]>(
      "SELECT user_id FROM karyawan WHERE id = ? LIMIT 1",
      [id],
    );

    const existing = existingRows[0];

    if (!existing) {
      await connection.rollback();
      return null;
    }

    if (payload.password) {
      await connection.query(
        `
          UPDATE users
          SET nama = ?, email = ?, password = SHA2(?, 256), status_aktif = ?
          WHERE id = ?
        `,
        [
          payload.name,
          payload.email,
          payload.password,
          payload.userActive ? 1 : 0,
          existing.user_id,
        ],
      );
    } else {
      await connection.query(
        `
          UPDATE users
          SET nama = ?, email = ?, status_aktif = ?
          WHERE id = ?
        `,
        [payload.name, payload.email, payload.userActive ? 1 : 0, existing.user_id],
      );
    }

    await connection.query(
      `
        UPDATE karyawan
        SET
          no_karyawan = ?,
          nama = ?,
          jabatan = ?,
          divisi = ?,
          departemen = ?,
          pembagian_rekapan = ?,
          bank = ?,
          no_rekening = ?,
          status_kerja = ?,
          tanggal_kontrak = ?,
          tanggal_selesai_kontrak = ?,
          kenaikan_tiap_tahun = ?
        WHERE id = ?
      `,
      [
        payload.nip,
        payload.name,
        payload.role,
        payload.division,
        payload.department,
        payload.recapGroup,
        payload.bank,
        payload.accountNumber,
        payload.workStatus,
        payload.contractDate,
        payload.contractEndDate,
        payload.annualRaise,
        id,
      ],
    );

    await connection.commit();

    return getEmployeeById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEmployee(id: number) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query<(RowDataPacket & { user_id: number })[]>(
      "SELECT user_id FROM karyawan WHERE id = ? LIMIT 1",
      [id],
    );

    const existing = existingRows[0];

    if (!existing) {
      await connection.rollback();
      return false;
    }

    await connection.query("DELETE FROM karyawan WHERE id = ?", [id]);
    await connection.query("DELETE FROM users WHERE id = ?", [existing.user_id]);

    await connection.commit();

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
