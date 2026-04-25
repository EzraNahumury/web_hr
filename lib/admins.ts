import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

export type ManagedRole = "admin" | "spv";

export const MANAGED_ROLES: ManagedRole[] = ["admin", "spv"];

export type AdminItem = {
  id: number;
  name: string;
  email: string;
  role: ManagedRole;
  isActive: boolean;
  createdAt: string | null;
};

type AdminRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  role: ManagedRole;
  status_aktif: number;
  created_at: string | null;
};

let usersRoleSchemaReady: Promise<void> | null = null;

export function ensureUsersRoleSchema(): Promise<void> {
  if (!usersRoleSchemaReady) {
    usersRoleSchemaReady = (async () => {
      try {
        await pool.query(
          `ALTER TABLE users MODIFY COLUMN role ENUM('admin','karyawan','spv') NOT NULL DEFAULT 'karyawan'`,
        );
      } catch (err) {
        console.error("Failed to widen users.role enum", err);
      }
    })();
  }
  return usersRoleSchemaReady;
}

function mapAdmin(row: AdminRow): AdminItem {
  return {
    id: row.id,
    name: row.nama,
    email: row.email,
    role: row.role,
    isActive: row.status_aktif === 1,
    createdAt: row.created_at,
  };
}

export async function listAdmins(): Promise<AdminItem[]> {
  await ensureUsersRoleSchema();
  const [rows] = await pool.query<AdminRow[]>(
    `
      SELECT id, nama, email, role, status_aktif, created_at
      FROM users
      WHERE role IN ('admin','spv')
      ORDER BY created_at DESC, id DESC
    `,
  );
  return rows.map(mapAdmin);
}

export async function getAdminById(id: number): Promise<AdminItem | null> {
  await ensureUsersRoleSchema();
  const [rows] = await pool.query<AdminRow[]>(
    `
      SELECT id, nama, email, role, status_aktif, created_at
      FROM users
      WHERE id = ? AND role IN ('admin','spv')
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
  role: ManagedRole;
  isActive: boolean;
};

export async function createAdmin(payload: CreateAdminPayload) {
  await ensureUsersRoleSchema();
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO users (nama, email, password, role, status_aktif)
      VALUES (?, ?, SHA2(?, 256), ?, ?)
    `,
    [
      payload.name,
      payload.email,
      payload.password,
      payload.role,
      payload.isActive ? 1 : 0,
    ],
  );
  return getAdminById(result.insertId);
}

export type UpdateAdminPayload = {
  name: string;
  email: string;
  password: string | null;
  role: ManagedRole;
  isActive: boolean;
};

export async function updateAdmin(id: number, payload: UpdateAdminPayload) {
  await ensureUsersRoleSchema();
  if (payload.password) {
    await pool.query(
      `
        UPDATE users
        SET nama = ?, email = ?, password = SHA2(?, 256), role = ?, status_aktif = ?
        WHERE id = ? AND role IN ('admin','spv')
      `,
      [
        payload.name,
        payload.email,
        payload.password,
        payload.role,
        payload.isActive ? 1 : 0,
        id,
      ],
    );
  } else {
    await pool.query(
      `
        UPDATE users
        SET nama = ?, email = ?, role = ?, status_aktif = ?
        WHERE id = ? AND role IN ('admin','spv')
      `,
      [payload.name, payload.email, payload.role, payload.isActive ? 1 : 0, id],
    );
  }
  return getAdminById(id);
}

export async function deleteAdmin(id: number) {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM users WHERE id = ? AND role IN ('admin','spv')`,
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
