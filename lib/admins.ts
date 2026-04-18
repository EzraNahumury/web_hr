import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

export type AdminItem = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string | null;
};

type AdminRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  status_aktif: number;
  created_at: string | null;
};

function mapAdmin(row: AdminRow): AdminItem {
  return {
    id: row.id,
    name: row.nama,
    email: row.email,
    isActive: row.status_aktif === 1,
    createdAt: row.created_at,
  };
}

export async function listAdmins(): Promise<AdminItem[]> {
  const [rows] = await pool.query<AdminRow[]>(
    `
      SELECT id, nama, email, status_aktif, created_at
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at DESC, id DESC
    `,
  );
  return rows.map(mapAdmin);
}

export async function getAdminById(id: number): Promise<AdminItem | null> {
  const [rows] = await pool.query<AdminRow[]>(
    `
      SELECT id, nama, email, status_aktif, created_at
      FROM users
      WHERE id = ? AND role = 'admin'
      LIMIT 1
    `,
    [id],
  );
  return rows[0] ? mapAdmin(rows[0]) : null;
}

export async function emailExists(email: string, excludeId?: number) {
  const [rows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM users WHERE email = ? ${excludeId ? "AND id <> ?" : ""} LIMIT 1`,
    excludeId ? [email, excludeId] : [email],
  );
  return rows.length > 0;
}

export type CreateAdminPayload = {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
};

export async function createAdmin(payload: CreateAdminPayload) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO users (nama, email, password, role, status_aktif)
      VALUES (?, ?, SHA2(?, 256), 'admin', ?)
    `,
    [payload.name, payload.email, payload.password, payload.isActive ? 1 : 0],
  );
  return getAdminById(result.insertId);
}

export type UpdateAdminPayload = {
  name: string;
  email: string;
  password: string | null;
  isActive: boolean;
};

export async function updateAdmin(id: number, payload: UpdateAdminPayload) {
  if (payload.password) {
    await pool.query(
      `
        UPDATE users
        SET nama = ?, email = ?, password = SHA2(?, 256), status_aktif = ?
        WHERE id = ? AND role = 'admin'
      `,
      [payload.name, payload.email, payload.password, payload.isActive ? 1 : 0, id],
    );
  } else {
    await pool.query(
      `
        UPDATE users
        SET nama = ?, email = ?, status_aktif = ?
        WHERE id = ? AND role = 'admin'
      `,
      [payload.name, payload.email, payload.isActive ? 1 : 0, id],
    );
  }
  return getAdminById(id);
}

export async function deleteAdmin(id: number) {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM users WHERE id = ? AND role = 'admin'`,
    [id],
  );
  return result.affectedRows > 0;
}

export async function countActiveAdmins() {
  const [rows] = await pool.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND status_aktif = 1`,
  );
  return Number(rows[0]?.total ?? 0);
}
