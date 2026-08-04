import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { ensureEmployeeSchemaSupport } from "@/lib/employees";

export type JadwalShift =
  | "pagi"
  | "lembur"
  | "siang"
  | "setengah_1"
  | "setengah_2"
  | "libur"
  | "pagi_full"
  | "pagi_short"
  | "siang_sore"
  | "jne_pagi"
  | "jne_siang"
  | "jne_minggu"
  | "ayres_siang";

export const JADWAL_SHIFT_LABELS: Record<JadwalShift, string> = {
  pagi: "Pagi",
  lembur: "Lembur",
  siang: "Siang",
  setengah_1: "Setengah 1",
  setengah_2: "Setengah 2",
  libur: "Libur",
  pagi_full: "08:30 - 17:00",
  pagi_short: "08:30 - 15:00",
  siang_sore: "12:00 - 17:00",
  jne_pagi: "JNE Pagi (08:00 - 16:00)",
  jne_siang: "JNE Siang (14:00 - 21:00)",
  jne_minggu: "JNE Minggu/Libur (13:00 - 20:00)",
  ayres_siang: "Siang (14:00 - 22:00)",
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
          shift ENUM('pagi','lembur','siang','setengah_1','setengah_2','libur','pagi_full','pagi_short','siang_sore','jne_pagi','jne_siang','jne_minggu','ayres_siang') NOT NULL,
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_karyawan_tanggal (karyawan_id, tanggal),
          INDEX idx_tanggal (tanggal)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      try {
        await pool.query(`
          ALTER TABLE jadwal_karyawan
          MODIFY COLUMN shift ENUM('pagi','lembur','siang','setengah_1','setengah_2','libur','pagi_full','pagi_short','siang_sore','jne_pagi','jne_siang','jne_minggu','ayres_siang') NOT NULL
        `);
      } catch (error) {
        console.error("Migration warning jadwal_karyawan.shift:", error);
      }
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

export async function getScheduledShiftForDate(
  karyawanId: number,
  tanggal: string,
): Promise<JadwalShift | null> {
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
  return rows[0]?.shift ?? null;
}

export async function getJadwalForRange(
  startDate: string,
  endDate: string,
): Promise<JadwalKaryawanItem[]> {
  await ensureJadwalKaryawanSchema();
  const [rows] = await pool.query<JadwalRow[]>(
    `
      SELECT id, karyawan_id, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, shift, created_by
      FROM jadwal_karyawan
      WHERE tanggal >= ? AND tanggal <= ?
      ORDER BY karyawan_id, tanggal
    `,
    [startDate, endDate],
  );
  return rows.map((r) => ({
    id: r.id,
    karyawanId: r.karyawan_id,
    tanggal: r.tanggal,
    shift: r.shift,
    createdBy: r.created_by,
  }));
}

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
  subDivisi: string | null;
  jabatan: string | null;
};

type TokoGudangRow = RowDataPacket & {
  id: number;
  nama: string;
  no_karyawan: string | null;
  penempatan: string;
  sub_divisi: string | null;
  jabatan: string | null;
};

export async function listTokoGudangKaryawan(): Promise<TokoGudangKaryawan[]> {
  await ensureEmployeeSchemaSupport();
  // Karyawan ikut Set Jadwal kalau flag is_shift = 1 (dicentang di form Data Karyawan).
  const [rows] = await pool.query<TokoGudangRow[]>(
    `
      SELECT id, nama, no_karyawan, penempatan, sub_divisi, jabatan
      FROM karyawan
      WHERE status_data = 'aktif' AND is_shift = 1
      ORDER BY penempatan ASC, nama ASC
    `,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    noKaryawan: r.no_karyawan,
    penempatan: r.penempatan,
    subDivisi: r.sub_divisi,
    jabatan: r.jabatan,
  }));
}

// ── MASTER JADWAL (template mingguan Senin–Minggu per karyawan) ──
// hari: 1=Senin, 2=Selasa, ... 7=Minggu (ISO). Distribusikan ke jadwal_karyawan by day-of-week.

let jadwalMasterSchemaReady: Promise<void> | null = null;

export function ensureJadwalMasterSchema(): Promise<void> {
  if (!jadwalMasterSchemaReady) {
    jadwalMasterSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jadwal_master (
          id INT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id INT NOT NULL,
          hari TINYINT NOT NULL,
          shift ENUM('pagi','lembur','siang','setengah_1','setengah_2','libur','pagi_full','pagi_short','siang_sore','jne_pagi','jne_siang','jne_minggu','ayres_siang') NOT NULL,
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_karyawan_hari (karyawan_id, hari)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      // Tabel lama (dibuat sebelum shift baru ditambah) perlu di-MODIFY agar ENUM
      // menyertakan 'ayres_siang' dll — kalau tidak, nilai baru di-truncate ke '' saat simpan.
      try {
        await pool.query(`
          ALTER TABLE jadwal_master
          MODIFY COLUMN shift ENUM('pagi','lembur','siang','setengah_1','setengah_2','libur','pagi_full','pagi_short','siang_sore','jne_pagi','jne_siang','jne_minggu','ayres_siang') NOT NULL
        `);
      } catch (error) {
        console.error("Migration warning jadwal_master.shift:", error);
      }
    })();
  }
  return jadwalMasterSchemaReady;
}

export type JadwalMasterItem = {
  karyawanId: number;
  hari: number; // 1=Senin..7=Minggu
  shift: JadwalShift;
};

type JadwalMasterRow = RowDataPacket & {
  karyawan_id: number;
  hari: number;
  shift: JadwalShift;
};

export async function getJadwalMasterAll(): Promise<JadwalMasterItem[]> {
  await ensureJadwalMasterSchema();
  const [rows] = await pool.query<JadwalMasterRow[]>(
    `SELECT karyawan_id, hari, shift FROM jadwal_master ORDER BY karyawan_id, hari`,
  );
  return rows.map((r) => ({ karyawanId: r.karyawan_id, hari: r.hari, shift: r.shift }));
}

export async function upsertJadwalMasterBulk(
  entries: { karyawanId: number; hari: number; shift: JadwalShift }[],
  createdBy: number,
) {
  if (entries.length === 0) return;
  await ensureJadwalMasterSchema();
  const placeholders = entries.map(() => "(?, ?, ?, ?)").join(", ");
  const values: (number | string)[] = [];
  for (const e of entries) {
    values.push(e.karyawanId, e.hari, e.shift, createdBy);
  }
  await pool.query(
    `
      INSERT INTO jadwal_master (karyawan_id, hari, shift, created_by)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        shift = VALUES(shift),
        created_by = VALUES(created_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    values,
  );
}

// Distribusikan master mingguan ke jadwal_karyawan untuk 1 periode payroll (start–end, YYYY-MM-DD).
// FILL-ONLY: pakai INSERT IGNORE supaya jadwal yang sudah ada (edit manual/tukar shift) TIDAK tertimpa.
export async function distributeMasterToPeriod(
  startSql: string,
  endSql: string,
  createdBy: number,
) {
  await Promise.all([ensureJadwalKaryawanSchema(), ensureJadwalMasterSchema()]);
  const master = await getJadwalMasterAll();
  if (master.length === 0) return { inserted: 0 };

  // Map: karyawanId -> (hariISO -> shift)
  const byKaryawan = new Map<number, Map<number, JadwalShift>>();
  for (const m of master) {
    let inner = byKaryawan.get(m.karyawanId);
    if (!inner) {
      inner = new Map();
      byKaryawan.set(m.karyawanId, inner);
    }
    inner.set(m.hari, m.shift);
  }

  const rows: (number | string)[] = [];
  let count = 0;
  const [sy, sm, sd] = startSql.split("-").map(Number);
  const [ey, em, ed] = endSql.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = cur.getMonth() + 1;
    const d = cur.getDate();
    const dateStr = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = cur.getDay(); // 0=Min..6=Sab
    const hariIso = dow === 0 ? 7 : dow;
    for (const [karyawanId, inner] of byKaryawan) {
      const shift = inner.get(hariIso);
      if (shift) {
        rows.push(karyawanId, dateStr, shift, createdBy);
        count += 1;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (count === 0) return { inserted: 0 };

  // Timpa bagan agar sinkron dengan master (konsisten dengan simpan bagan manual yang juga
  // ON DUPLICATE KEY UPDATE). Hanya menyentuh tanggal dalam range periode yang diminta, jadi
  // periode lampau di luar range tidak tersentuh. Master yang diedit -> bagan ikut ter-update.
  const placeholders = Array.from({ length: count }, () => "(?, ?, ?, ?)").join(", ");
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO jadwal_karyawan (karyawan_id, tanggal, shift, created_by) VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE shift = VALUES(shift), created_by = VALUES(created_by)`,
    rows,
  );
  return { inserted: result.affectedRows };
}

// Saat cell Master DIKOSONGKAN (removeKeys), hapus juga Bagan (jadwal_karyawan) untuk
// hari (day-of-week) tsb di dalam periode aktif, supaya Bagan ikut ter-update (kosong).
// pairs.hari: 1=Senin..7=Minggu (ISO).
export async function clearMasterDowFromPeriod(
  startSql: string,
  endSql: string,
  pairs: { karyawanId: number; hari: number }[],
): Promise<{ deleted: number }> {
  if (pairs.length === 0) return { deleted: 0 };
  await ensureJadwalKaryawanSchema();

  const byHari = new Map<number, Set<number>>();
  for (const p of pairs) {
    let s = byHari.get(p.hari);
    if (!s) {
      s = new Set();
      byHari.set(p.hari, s);
    }
    s.add(p.karyawanId);
  }

  const conds: string[] = [];
  const values: (number | string)[] = [];
  const [sy, sm, sd] = startSql.split("-").map(Number);
  const [ey, em, ed] = endSql.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = cur.getMonth() + 1;
    const d = cur.getDate();
    const dateStr = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = cur.getDay(); // 0=Min..6=Sab
    const hariIso = dow === 0 ? 7 : dow;
    const ids = byHari.get(hariIso);
    if (ids) {
      for (const id of ids) {
        conds.push("(karyawan_id = ? AND tanggal = ?)");
        values.push(id, dateStr);
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (conds.length === 0) return { deleted: 0 };

  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM jadwal_karyawan WHERE ${conds.join(" OR ")}`,
    values,
  );
  return { deleted: result.affectedRows };
}

export async function deleteJadwalMasterEntries(
  pairs: { karyawanId: number; hari: number }[],
) {
  if (pairs.length === 0) return 0;
  await ensureJadwalMasterSchema();
  const placeholders = pairs.map(() => "(?, ?)").join(", ");
  const values: number[] = [];
  for (const p of pairs) values.push(p.karyawanId, p.hari);
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM jadwal_master WHERE (karyawan_id, hari) IN (${placeholders})`,
    values,
  );
  return result.affectedRows;
}

// ── PERIZINAN AKSES SET JADWAL (jadwal_editor) ──
// Karyawan yang diberi izin -> di akunnya muncul Bagan + Master Set Jadwal.

export type KaryawanAksesOption = {
  id: number;
  nama: string;
  noKaryawan: string | null;
  penempatan: string | null;
  jabatan: string | null;
};

export async function listKaryawanForAccess(): Promise<KaryawanAksesOption[]> {
  const [rows] = await pool.query<
    (RowDataPacket & { id: number; nama: string; no_karyawan: string | null; penempatan: string | null; jabatan: string | null })[]
  >(
    `SELECT id, nama, no_karyawan, penempatan, jabatan
       FROM karyawan WHERE status_data = 'aktif' ORDER BY nama ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    noKaryawan: r.no_karyawan,
    penempatan: r.penempatan,
    jabatan: r.jabatan,
  }));
}

export async function listJadwalEditors(): Promise<KaryawanAksesOption[]> {
  await ensureEmployeeSchemaSupport();
  const [rows] = await pool.query<
    (RowDataPacket & { id: number; nama: string; no_karyawan: string | null; penempatan: string | null; jabatan: string | null })[]
  >(
    `SELECT id, nama, no_karyawan, penempatan, jabatan
       FROM karyawan WHERE status_data = 'aktif' AND jadwal_editor = 1 ORDER BY nama ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    noKaryawan: r.no_karyawan,
    penempatan: r.penempatan,
    jabatan: r.jabatan,
  }));
}

export async function setJadwalEditor(karyawanId: number, granted: boolean) {
  await ensureEmployeeSchemaSupport();
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE karyawan SET jadwal_editor = ? WHERE id = ?`,
    [granted ? 1 : 0, karyawanId],
  );
  return result.affectedRows;
}

export async function isUserJadwalEditor(userId: number): Promise<boolean> {
  await ensureEmployeeSchemaSupport();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM karyawan WHERE user_id = ? AND jadwal_editor = 1 AND status_data = 'aktif' LIMIT 1`,
    [userId],
  );
  return rows.length > 0;
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
