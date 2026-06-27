import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FreelanceJamRow = {
  employeeId: number;
  name: string;
  jamKerja: number;
  ratePerJam: number;
  total: number;
};

export type FreelancePengerjaanRow = {
  entryId: number | null;
  employeeId: number;
  name: string;
  hargaPerPcs: number;
  jumlahPcs: number;
  total: number;
};

export type FreelanceHarianRow = {
  entryId: number | null;
  employeeId: number;
  name: string;
  hargaPerHari: number;
  hariMasuk: number;
  total: number;
};

export type FreelanceCustomItem = {
  id: number;
  karyawanId: number;
  namaJenis: string;
  urutan: number;
};

export type FreelanceCustomPengerjaanEntry = {
  entryId: number | null;
  itemId: number;
  namaJenis: string;
  hargaPerPcs: number;
  jumlahPcs: number;
  total: number;
};

export type FreelanceCustomRow = {
  employeeId: number;
  name: string;
  items: FreelanceCustomPengerjaanEntry[];
  grandTotal: number;
};

export type FreelanceSheet = {
  periodMonth: number;
  periodYear: number;
  jam: FreelanceJamRow[];
  pengerjaan: FreelancePengerjaanRow[];
  harian: FreelanceHarianRow[];
  custom: FreelanceCustomRow[];
};

// ─── DB row types ─────────────────────────────────────────────────────────────

type KaryawanFreelanceRow = RowDataPacket & {
  id: number;
  nama: string;
  tipe_freelance: "jam" | "pengerjaan" | "custom_pengerjaan" | "harian" | null;
  rate_per_jam: string | null;
  total_menit: string | null;
};

type PengerjaanRow = RowDataPacket & {
  id: number | null;
  karyawan_id: number;
  nama: string;
  harga_per_pcs: number;
  jumlah_pcs: number;
};

type HarianRow = RowDataPacket & {
  id: number | null;
  karyawan_id: number;
  nama: string;
  harga_per_hari: number;
  hari_masuk: number;
};

type CustomItemRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  nama_jenis: string;
  urutan: number;
};

type CustomPengerjaanRow = RowDataPacket & {
  entry_id: number | null;
  karyawan_id: number;
  nama: string;
  item_id: number;
  nama_jenis: string;
  harga_per_pcs: number;
  jumlah_pcs: number;
};

// ─── DB migration ─────────────────────────────────────────────────────────────

let freelanceSchemaReady: Promise<void> | null = null;

export async function ensureFreelanceSchemaSupport() {
  if (!freelanceSchemaReady) {
    freelanceSchemaReady = (async () => {
      // Catch semua error migrasi — jangan sampai schema setup mencrash halaman
      const safeMigrate = async (sql: string) => {
        try {
          await pool.query(sql);
        } catch (error: unknown) {
          // Abaikan error "already exists" / "duplicate column" — kondisi normal pada deploy ulang
          const code = typeof error === "object" && error !== null && "code" in error
            ? (error as { code: string }).code
            : null;
          const ignoredCodes = ["ER_TABLE_EXISTS_ERROR", "ER_DUP_FIELDNAME", "ER_BAD_FIELD_ERROR", "ER_DUP_KEY", "ER_DUP_KEYNAME"];
          if (!ignoredCodes.includes(code ?? "")) {
            console.error("[payroll-freelance] safeMigrate error", { code, sql: sql.slice(0, 120), error });
            throw error;
          }
        }
      };

      // Kolom tipe_freelance di karyawan
      await safeMigrate(
        `ALTER TABLE karyawan ADD COLUMN tipe_freelance ENUM('jam','pengerjaan','custom_pengerjaan','harian') NULL AFTER tipe_payroll_penjahit`,
      );

      // Tabel freelance — tanpa FOREIGN KEY agar kompatibel di semua MySQL config
      await safeMigrate(`
        CREATE TABLE IF NOT EXISTS freelance_pengerjaan (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id BIGINT NOT NULL,
          bulan TINYINT UNSIGNED NOT NULL,
          tahun SMALLINT UNSIGNED NOT NULL,
          harga_per_pcs INT NOT NULL DEFAULT 0,
          jumlah_pcs INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_fp (karyawan_id, bulan, tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await safeMigrate(`
        CREATE TABLE IF NOT EXISTS freelance_harian (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id BIGINT NOT NULL,
          bulan TINYINT UNSIGNED NOT NULL,
          tahun SMALLINT UNSIGNED NOT NULL,
          harga_per_hari INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_fh (karyawan_id, bulan, tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await safeMigrate(`
        CREATE TABLE IF NOT EXISTS freelance_custom_item (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id BIGINT NOT NULL,
          nama_jenis VARCHAR(100) NOT NULL,
          urutan INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await safeMigrate(`
        CREATE TABLE IF NOT EXISTS freelance_custom_pengerjaan (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id BIGINT NOT NULL,
          item_id BIGINT NOT NULL,
          bulan TINYINT UNSIGNED NOT NULL,
          tahun SMALLINT UNSIGNED NOT NULL,
          harga_per_pcs INT NOT NULL DEFAULT 0,
          jumlah_pcs INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_fcp (item_id, bulan, tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await safeMigrate(`
        CREATE TABLE IF NOT EXISTS freelance_jam (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id BIGINT NOT NULL,
          bulan TINYINT UNSIGNED NOT NULL,
          tahun SMALLINT UNSIGNED NOT NULL,
          rate_per_jam INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_fj (karyawan_id, bulan, tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })();
  }
  return freelanceSchemaReady;
}

// ─── Resolve period (same convention as payroll-summary) ─────────────────────

function resolvePeriod(month?: number | null, year?: number | null) {
  const now = new Date();
  const periodMonth = month ?? now.getMonth() + 1;
  const periodYear = year ?? now.getFullYear();
  // 26 prev month → 25 current month
  const startSql = `${periodYear - (periodMonth === 1 ? 1 : 0)}-${String(periodMonth === 1 ? 12 : periodMonth - 1).padStart(2, "0")}-26`;
  const endSql = `${periodYear}-${String(periodMonth).padStart(2, "0")}-25`;
  return { periodMonth, periodYear, startSql, endSql };
}

// ─── Main sheet query ─────────────────────────────────────────────────────────

export async function getFreelanceSheet(period?: {
  month?: number | null;
  year?: number | null;
}): Promise<FreelanceSheet> {
  try {
    await ensureFreelanceSchemaSupport();
  } catch (err) {
    console.error("[payroll-freelance] ensureFreelanceSchemaSupport gagal:", err);
    throw err;
  }
  const { periodMonth, periodYear, startSql, endSql } = resolvePeriod(period?.month, period?.year);

  // All active freelance employees
  const [allFreelance] = await pool.query<KaryawanFreelanceRow[]>(
    `SELECT k.id, k.nama, k.tipe_freelance,
            COALESCE(fj.rate_per_jam, 0) AS rate_per_jam,
            (SELECT COALESCE(SUM(
               CASE
                 WHEN a.jam_masuk IS NOT NULL AND a.jam_pulang IS NOT NULL
                   THEN FLOOR(TIMESTAMPDIFF(MINUTE, a.jam_masuk, a.jam_pulang) / 30) * 30
                 WHEN a.jam_masuk IS NOT NULL THEN 480
                 ELSE 0
               END
             ), 0)
             FROM absensi a
             WHERE a.karyawan_id = k.id AND a.tanggal BETWEEN ? AND ? AND a.status_absensi = 'hadir'
            ) AS total_menit
     FROM karyawan k
     LEFT JOIN freelance_jam fj ON fj.karyawan_id = k.id AND fj.bulan = ? AND fj.tahun = ?
     WHERE LOWER(k.jabatan) = 'freelance'
       AND k.status_data = 'aktif'
     ORDER BY k.nama ASC`,
    [startSql, endSql, periodMonth, periodYear],
  );

  // ── Table 1: Jam ────────────────────────────────────────────────────────────
  const jamRows: FreelanceJamRow[] = allFreelance
    .filter((r) => r.tipe_freelance === "jam")
    .map((r) => {
      const jamKerja = Number(r.total_menit ?? 0) / 60;
      const ratePerJam = Number(r.rate_per_jam ?? 0);
      return {
        employeeId: r.id,
        name: r.nama,
        jamKerja,
        ratePerJam,
        total: jamKerja * ratePerJam,
      };
    });

  // ── Table 2: Pengerjaan ─────────────────────────────────────────────────────
  const pengerjaanEmployeeIds = allFreelance
    .filter((r) => r.tipe_freelance === "pengerjaan")
    .map((r) => r.id);

  let pengerjaanRows: FreelancePengerjaanRow[] = [];
  if (pengerjaanEmployeeIds.length > 0) {
    const placeholders = pengerjaanEmployeeIds.map(() => "?").join(",");
    const [rows] = await pool.query<PengerjaanRow[]>(
      `SELECT fp.id, k.id AS karyawan_id, k.nama,
              COALESCE(fp.harga_per_pcs, 0) AS harga_per_pcs,
              COALESCE(fp.jumlah_pcs, 0) AS jumlah_pcs
       FROM karyawan k
       LEFT JOIN freelance_pengerjaan fp ON fp.karyawan_id = k.id AND fp.bulan = ? AND fp.tahun = ?
       WHERE k.id IN (${placeholders})
       ORDER BY k.nama ASC`,
      [periodMonth, periodYear, ...pengerjaanEmployeeIds],
    );
    pengerjaanRows = rows.map((r) => ({
      entryId: r.id ?? null,
      employeeId: r.karyawan_id,
      name: r.nama,
      hargaPerPcs: Number(r.harga_per_pcs),
      jumlahPcs: Number(r.jumlah_pcs),
      total: Number(r.harga_per_pcs) * Number(r.jumlah_pcs),
    }));
  }

  // ── Table 3: Harian ─────────────────────────────────────────────────────────
  const harianEmployeeIds = allFreelance
    .filter((r) => r.tipe_freelance === "harian")
    .map((r) => r.id);

  let harianRows: FreelanceHarianRow[] = [];
  if (harianEmployeeIds.length > 0) {
    const placeholders = harianEmployeeIds.map(() => "?").join(",");
    const [rows] = await pool.query<HarianRow[]>(
      `SELECT fh.id, k.id AS karyawan_id, k.nama,
              COALESCE(fh.harga_per_hari, 0) AS harga_per_hari,
              (SELECT COUNT(*) FROM absensi a
               WHERE a.karyawan_id = k.id AND a.tanggal BETWEEN ? AND ? AND a.status_absensi = 'hadir'
              ) AS hari_masuk
       FROM karyawan k
       LEFT JOIN freelance_harian fh ON fh.karyawan_id = k.id AND fh.bulan = ? AND fh.tahun = ?
       WHERE k.id IN (${placeholders})
       ORDER BY k.nama ASC`,
      [startSql, endSql, periodMonth, periodYear, ...harianEmployeeIds],
    );
    harianRows = rows.map((r) => ({
      entryId: r.id ?? null,
      employeeId: r.karyawan_id,
      name: r.nama,
      hargaPerHari: Number(r.harga_per_hari),
      hariMasuk: Number(r.hari_masuk),
      total: Number(r.harga_per_hari) * Number(r.hari_masuk),
    }));
  }

  // ── Table 4: Custom Pengerjaan ───────────────────────────────────────────────
  const customEmployeeIds = allFreelance
    .filter((r) => r.tipe_freelance === "custom_pengerjaan")
    .map((r) => r.id);

  let customRows: FreelanceCustomRow[] = [];
  if (customEmployeeIds.length > 0) {
    const placeholders = customEmployeeIds.map(() => "?").join(",");
    const [itemRows] = await pool.query<CustomPengerjaanRow[]>(
      `SELECT fcp.id AS entry_id, fci.karyawan_id, k.nama,
              fci.id AS item_id, fci.nama_jenis,
              COALESCE(fcp.harga_per_pcs, 0) AS harga_per_pcs,
              COALESCE(fcp.jumlah_pcs, 0) AS jumlah_pcs
       FROM freelance_custom_item fci
       INNER JOIN karyawan k ON k.id = fci.karyawan_id
       LEFT JOIN freelance_custom_pengerjaan fcp
         ON fcp.item_id = fci.id AND fcp.bulan = ? AND fcp.tahun = ?
       WHERE fci.karyawan_id IN (${placeholders})
       ORDER BY fci.karyawan_id ASC, fci.urutan ASC, fci.id ASC`,
      [periodMonth, periodYear, ...customEmployeeIds],
    );

    const byEmployee = new Map<number, FreelanceCustomRow>();
    for (const r of itemRows) {
      if (!byEmployee.has(r.karyawan_id)) {
        byEmployee.set(r.karyawan_id, { employeeId: r.karyawan_id, name: r.nama, items: [], grandTotal: 0 });
      }
      const emp = byEmployee.get(r.karyawan_id)!;
      const total = Number(r.harga_per_pcs) * Number(r.jumlah_pcs);
      emp.items.push({
        entryId: r.entry_id ?? null,
        itemId: r.item_id,
        namaJenis: r.nama_jenis,
        hargaPerPcs: Number(r.harga_per_pcs),
        jumlahPcs: Number(r.jumlah_pcs),
        total,
      });
      emp.grandTotal += total;
    }

    // Include custom employees with no items yet
    for (const emp of allFreelance.filter((r) => r.tipe_freelance === "custom_pengerjaan")) {
      if (!byEmployee.has(emp.id)) {
        byEmployee.set(emp.id, { employeeId: emp.id, name: emp.nama, items: [], grandTotal: 0 });
      }
    }

    customRows = [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  return { periodMonth, periodYear, jam: jamRows, pengerjaan: pengerjaanRows, harian: harianRows, custom: customRows };
}

// ─── CRUD: Pengerjaan ─────────────────────────────────────────────────────────

export async function upsertFreelanceJam(
  karyawanId: number,
  bulan: number,
  tahun: number,
  ratePerJam: number,
) {
  await ensureFreelanceSchemaSupport();
  await pool.query(
    `INSERT INTO freelance_jam (karyawan_id, bulan, tahun, rate_per_jam)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rate_per_jam = VALUES(rate_per_jam)`,
    [karyawanId, bulan, tahun, ratePerJam],
  );
}

export async function upsertFreelancePengerjaan(
  karyawanId: number,
  bulan: number,
  tahun: number,
  hargaPerPcs: number,
  jumlahPcs: number,
) {
  await ensureFreelanceSchemaSupport();
  await pool.query(
    `INSERT INTO freelance_pengerjaan (karyawan_id, bulan, tahun, harga_per_pcs, jumlah_pcs)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE harga_per_pcs = VALUES(harga_per_pcs), jumlah_pcs = VALUES(jumlah_pcs)`,
    [karyawanId, bulan, tahun, hargaPerPcs, jumlahPcs],
  );
}

// ─── CRUD: Harian ─────────────────────────────────────────────────────────────

export async function upsertFreelanceHarian(
  karyawanId: number,
  bulan: number,
  tahun: number,
  hargaPerHari: number,
) {
  await ensureFreelanceSchemaSupport();
  await pool.query(
    `INSERT INTO freelance_harian (karyawan_id, bulan, tahun, harga_per_hari)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE harga_per_hari = VALUES(harga_per_hari)`,
    [karyawanId, bulan, tahun, hargaPerHari],
  );
}

// ─── CRUD: Custom Items (template per karyawan) ───────────────────────────────

export async function getCustomItemsByEmployee(karyawanId: number): Promise<FreelanceCustomItem[]> {
  await ensureFreelanceSchemaSupport();
  const [rows] = await pool.query<CustomItemRow[]>(
    `SELECT id, karyawan_id, nama_jenis, urutan FROM freelance_custom_item WHERE karyawan_id = ? ORDER BY urutan ASC, id ASC`,
    [karyawanId],
  );
  return rows.map((r) => ({ id: r.id, karyawanId: r.karyawan_id, namaJenis: r.nama_jenis, urutan: r.urutan }));
}

export async function createCustomItem(karyawanId: number, namaJenis: string): Promise<FreelanceCustomItem> {
  await ensureFreelanceSchemaSupport();
  const [maxRow] = await pool.query<(RowDataPacket & { max_urutan: number | null })[]>(
    `SELECT MAX(urutan) AS max_urutan FROM freelance_custom_item WHERE karyawan_id = ?`,
    [karyawanId],
  );
  const urutan = (maxRow[0]?.max_urutan ?? 0) + 1;
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO freelance_custom_item (karyawan_id, nama_jenis, urutan) VALUES (?, ?, ?)`,
    [karyawanId, namaJenis, urutan],
  );
  return { id: result.insertId, karyawanId, namaJenis, urutan };
}

export async function updateCustomItem(id: number, namaJenis: string): Promise<void> {
  await pool.query(`UPDATE freelance_custom_item SET nama_jenis = ? WHERE id = ?`, [namaJenis, id]);
}

export async function deleteCustomItem(id: number): Promise<void> {
  await pool.query(`DELETE FROM freelance_custom_item WHERE id = ?`, [id]);
}

// ─── CRUD: Custom Pengerjaan entries ──────────────────────────────────────────

export async function upsertFreelanceCustomPengerjaan(
  karyawanId: number,
  itemId: number,
  bulan: number,
  tahun: number,
  hargaPerPcs: number,
  jumlahPcs: number,
) {
  await ensureFreelanceSchemaSupport();
  await pool.query(
    `INSERT INTO freelance_custom_pengerjaan (karyawan_id, item_id, bulan, tahun, harga_per_pcs, jumlah_pcs)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE harga_per_pcs = VALUES(harga_per_pcs), jumlah_pcs = VALUES(jumlah_pcs)`,
    [karyawanId, itemId, bulan, tahun, hargaPerPcs, jumlahPcs],
  );
}
