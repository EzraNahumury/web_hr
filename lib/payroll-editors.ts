import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

// Akun admin yang otomatis diberi hak tulis payroll saat tabel pertama kali dibuat,
// agar perilaku lama (hanya avafamily17) tetap sama sebelum admin mengubahnya dari Master.
const DEFAULT_PAYROLL_EDITORS = ["avafamily17@gmail.com"];

let schemaReady: Promise<void> | null = null;

export function ensurePayrollEditorSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(
        `
          CREATE TABLE IF NOT EXISTS payroll_editor (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(191) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,
      );

      // Seed default hanya sekali (saat tabel masih kosong) agar tidak menimpa perubahan admin.
      const [rows] = await pool.query<(RowDataPacket & { total: number })[]>(
        `SELECT COUNT(*) AS total FROM payroll_editor`,
      );
      if (Number(rows[0]?.total ?? 0) === 0) {
        for (const email of DEFAULT_PAYROLL_EDITORS) {
          await pool.query(`INSERT IGNORE INTO payroll_editor (email) VALUES (?)`, [
            email.trim().toLowerCase(),
          ]);
        }
      }
    })();
  }
  return schemaReady;
}

export async function getPayrollEditorEmails(): Promise<string[]> {
  await ensurePayrollEditorSchema();
  const [rows] = await pool.query<(RowDataPacket & { email: string })[]>(
    `SELECT email FROM payroll_editor ORDER BY email ASC`,
  );
  return rows.map((r) => r.email.trim().toLowerCase());
}

export async function isPayrollEditor(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const emails = await getPayrollEditorEmails();
  return emails.includes(normalized);
}

export async function addPayrollEditor(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Email kosong.");
  }
  await ensurePayrollEditorSchema();
  await pool.query(`INSERT IGNORE INTO payroll_editor (email) VALUES (?)`, [normalized]);
}

export async function removePayrollEditor(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await ensurePayrollEditorSchema();

  // Jangan biarkan daftar jadi kosong — akan mengunci semua admin dari edit payroll.
  const current = await getPayrollEditorEmails();
  if (current.length <= 1 && current.includes(normalized)) {
    throw new Error("Minimal harus ada 1 akun payroll.");
  }
  await pool.query(`DELETE FROM payroll_editor WHERE email = ?`, [normalized]);
}
