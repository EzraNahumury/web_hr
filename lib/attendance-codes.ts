import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "@/lib/db";

// Kategori payroll = nilai kolom absensi.status_absensi (ENUM di DB). Kode absensi apa pun
// WAJIB dipetakan ke salah satu kategori ini agar payroll selalu tahu cara memperlakukannya.
export const ATTENDANCE_STATUS_CATEGORIES = [
  "hadir",
  "setengah_hari",
  "sakit",
  "izin",
  "alfa",
  "libur",
] as const;

export type AttendanceStatusCategory = (typeof ATTENDANCE_STATUS_CATEGORIES)[number];

export function isAttendanceStatusCategory(v: unknown): v is AttendanceStatusCategory {
  return typeof v === "string" && (ATTENDANCE_STATUS_CATEGORIES as readonly string[]).includes(v);
}

// Nama kategori NETRAL (dipakai di dropdown pemetaan). Efek gaji per-KODE yang detail
// & akurat ada di lib/attendance-code-effects.ts (describeAttendanceEffect), karena satu
// kategori bisa berperilaku beda per kode (mis. libur LN/LP/C dibayar, L/'-' tidak).
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatusCategory, string> = {
  hadir: "Hadir",
  setengah_hari: "Setengah Hari",
  sakit: "Sakit",
  izin: "Izin",
  alfa: "Alfa",
  libur: "Libur",
};

export type AttendanceCodeItem = {
  id: number;
  code: string;
  label: string;
  status: AttendanceStatusCategory;
  sort: number;
};

// Seed awal = 13 kode yang selama ini hardcode, beserta kategori payroll-nya.
const DEFAULT_ATTENDANCE_CODES: Array<Omit<AttendanceCodeItem, "id" | "sort">> = [
  { code: "O", label: "Hadir (O)", status: "hadir" },
  { code: "T", label: "Terlambat (T)", status: "hadir" },
  { code: "PA", label: "Pulang Awal (PA)", status: "hadir" },
  { code: "H", label: "Setengah Hari (H)", status: "setengah_hari" },
  { code: "S", label: "Sakit + Surat (S)", status: "sakit" },
  { code: "SX", label: "Sakit Tanpa Surat (SX)", status: "sakit" },
  { code: "I", label: "Izin (I)", status: "izin" },
  { code: "A", label: "Alfa (A)", status: "alfa" },
  { code: "L", label: "Libur (L)", status: "libur" },
  { code: "LN", label: "Libur Nasional (LN)", status: "libur" },
  { code: "LP", label: "Libur Perusahaan (LP)", status: "libur" },
  { code: "C", label: "Cuti (C)", status: "libur" },
  { code: "-", label: "Tidak Absen (-)", status: "libur" },
];

function normalizeCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  return trimmed;
}

type CodeRow = RowDataPacket & {
  id: number;
  code: string;
  label: string;
  status: AttendanceStatusCategory;
  sort: number;
};

let schemaReady: Promise<void> | null = null;

export function ensureAttendanceCodeSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(
        `
          CREATE TABLE IF NOT EXISTS attendance_code (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(8) NOT NULL UNIQUE,
            label VARCHAR(100) NOT NULL,
            status ENUM('hadir','setengah_hari','sakit','izin','alfa','libur') NOT NULL,
            sort INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,
      );

      // Seed hanya sekali (saat tabel kosong) agar tidak menimpa perubahan admin.
      const [rows] = await pool.query<(RowDataPacket & { total: number })[]>(
        `SELECT COUNT(*) AS total FROM attendance_code`,
      );
      if (Number(rows[0]?.total ?? 0) === 0) {
        let sort = 0;
        for (const seed of DEFAULT_ATTENDANCE_CODES) {
          await pool.query(
            `INSERT IGNORE INTO attendance_code (code, label, status, sort) VALUES (?, ?, ?, ?)`,
            [seed.code, seed.label, seed.status, sort],
          );
          sort += 10;
        }
      }
    })();
  }
  return schemaReady;
}

export async function listAttendanceCodes(): Promise<AttendanceCodeItem[]> {
  await ensureAttendanceCodeSchema();
  const [rows] = await pool.query<CodeRow[]>(
    `SELECT id, code, label, status, sort FROM attendance_code ORDER BY sort ASC, id ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    label: r.label,
    status: r.status,
    sort: r.sort,
  }));
}

// Untuk dropdown "Ubah Kode" pada lembar absensi.
export async function getAttendanceCodeOptions(): Promise<{ code: string; label: string }[]> {
  const codes = await listAttendanceCodes();
  return codes.map((c) => ({ code: c.code, label: c.label }));
}

// Peta kode -> kategori payroll (status_absensi). Dipakai saat menyimpan kode absensi.
export async function getAttendanceCodeStatusMap(): Promise<Record<string, AttendanceStatusCategory>> {
  const codes = await listAttendanceCodes();
  const map: Record<string, AttendanceStatusCategory> = {};
  for (const c of codes) {
    map[c.code] = c.status;
  }
  return map;
}

export async function addAttendanceCode(
  codeRaw: string,
  labelRaw: string,
  status: string,
): Promise<void> {
  const code = normalizeCode(codeRaw);
  const label = labelRaw.trim();
  if (!code) throw new Error("Kode kosong.");
  if (code.length > 8) throw new Error("Kode terlalu panjang (maks 8 karakter).");
  if (!label) throw new Error("Label kosong.");
  if (label.length > 100) throw new Error("Label terlalu panjang.");
  if (!isAttendanceStatusCategory(status)) throw new Error("Kategori status tidak valid.");

  await ensureAttendanceCodeSchema();

  const [existing] = await pool.query<CodeRow[]>(
    `SELECT id FROM attendance_code WHERE code = ? LIMIT 1`,
    [code],
  );
  if (existing.length > 0) throw new Error("Kode sudah ada.");

  const [maxRow] = await pool.query<(RowDataPacket & { maxSort: number | null })[]>(
    `SELECT MAX(sort) AS maxSort FROM attendance_code`,
  );
  const nextSort = Number(maxRow[0]?.maxSort ?? 0) + 10;

  await pool.query(
    `INSERT INTO attendance_code (code, label, status, sort) VALUES (?, ?, ?, ?)`,
    [code, label, status, nextSort],
  );
}

// Kode (huruf) tidak diubah di sini — mengubah kode berisiko meng-orphan data absensi lama
// yang masih menyimpan kode tersebut. Untuk ganti kode: hapus lalu tambah baru.
export async function updateAttendanceCode(
  id: number,
  labelRaw: string,
  status: string,
): Promise<void> {
  const label = labelRaw.trim();
  if (!label) throw new Error("Label kosong.");
  if (label.length > 100) throw new Error("Label terlalu panjang.");
  if (!isAttendanceStatusCategory(status)) throw new Error("Kategori status tidak valid.");

  await ensureAttendanceCodeSchema();
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE attendance_code SET label = ?, status = ? WHERE id = ?`,
    [label, status, id],
  );
  if (result.affectedRows === 0) throw new Error("Kode absensi tidak ditemukan.");
}

export async function deleteAttendanceCode(id: number): Promise<void> {
  await ensureAttendanceCodeSchema();
  await pool.query(`DELETE FROM attendance_code WHERE id = ?`, [id]);
}
