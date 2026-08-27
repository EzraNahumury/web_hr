import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";
import {
  attachLoanInstallmentsToPayroll,
  detachLoanInstallmentsFromPayroll,
  ensureLoanSupportTables,
  getLoanDeductionForPeriod,
} from "@/lib/loans";
import { ensureReimbursementSchema } from "@/lib/reimbursements";
import { isSalesNasionalRole } from "@/lib/sales-roles";
import { PAYROLL_OMZET_BONUS_RATE } from "@/lib/payroll-constants";

type PayrollEmployeeOptionRow = RowDataPacket & {
  employee_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  sub_divisi: string | null;
  departemen: string;
  pembagian_rekapan: string | null;
  status_kepegawaian: string | null;
  tipe_payroll_penjahit: string | null;
  tanggal_masuk_pertama: string | null;
  tanggal_kontrak: string | null;
  tanggal_selesai_kontrak: string | null;
};

type AttendanceAggregateRow = RowDataPacket & {
  present_count: number;
  leave_count: number;
  sick_count: number;
  sick_without_note_count: number;
  half_day_count: number;
  late_count: number;
};

type OvertimeAggregateRow = RowDataPacket & {
  total_jam: string | null;
};

type ContractAggregateRow = RowDataPacket & {
  nominal_potongan: string | null;
};

type PayrollEmployeeRow = RowDataPacket & {
  employee_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  sub_divisi: string | null;
  status_kepegawaian: string | null;
};

type FreelanceHoursRow = RowDataPacket & {
  total_menit: number | null;
};

type OmzetMonthlyRow = RowDataPacket & {
  id: number;
  periode_bulan: number;
  periode_tahun: number;
  unit: string;
  total_omzet: string;
  is_custom_bonus: number;
};

type PeriodRow = RowDataPacket & {
  periode_bulan: number;
  periode_tahun: number;
};

type PayrollIdentityRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  periode_bulan: number;
  periode_tahun: number;
  nama: string;
};

export type PayrollEmployeeOption = {
  employeeId: number;
  name: string;
  role: string;
  division: string;
  subDivision: string | null;
  department: string;
  recapGroup: string;
  isSales: boolean;
  employmentStatus: string | null;
  isWeekly: boolean;
  firstJoinDate: string | null;
  contractDate: string | null;
  contractEndDate: string | null;
};

export type PayrollFormPayload = {
  employeeId: number;
  payrollType: "non_sales" | "sales";
  gajiPerDay: number;
  tunjanganJabatan: number;
  uangMakan: number;
  subsidi: number;
  uangKerajinan: number;
  bpjs: number;
  bonusPerforma: number;
  totalOmzet: number;
  insentif: number;
  uangTransport: number;
  kendaraan: number;
  perjalananDinasReimburse: number;
  overrideMasuk?: number | null;
  overrideLembur?: number | null;
  overrideIzin?: number | null;
  overrideSakit?: number | null;
  overrideSakitTanpaSurat?: number | null;
  overrideSetengahHari?: number | null;
  overrideKontrak?: number | null;
  overridePinjaman?: number | null;
  overridePinjamanPribadi?: number | null;
  overrideGajiPokok?: number | null;
  potonganSp2?: number | null;
  potonganSp2Note?: string | null;
  freelanceRateType?: "per_hari" | "per_jam" | null;
  gajiPerJam?: number;
};

export type PayrollOmzetUnitEntry = {
  unit: string;
  label: string;
  totalOmzet: number;
  bonusOmzet: number;
  isCustomBonus: boolean;
  isLocked: boolean;
};

export type OmzetGroupConfig = {
  key: string;
  label: string;
  units: string[];
  defaultCustomBonus: boolean;
};

export const OMZET_GROUPS: OmzetGroupConfig[] = [
  {
    key: "AVA+Ayres",
    label: "AVA + Ayres",
    units: ["AVA Sportivo", "Ayres Apparel"],
    defaultCustomBonus: false,
  },
  {
    key: "JNE",
    label: "JNE",
    units: ["JNE"],
    defaultCustomBonus: true,
  },
];

export function getOmzetGroupKeyForUnit(unit: string | null | undefined): string | null {
  const normalized = (unit ?? "").trim().toLowerCase();
  if (!normalized) return null;
  for (const group of OMZET_GROUPS) {
    if (group.key.toLowerCase() === normalized) return group.key;
    if (group.units.some((u) => u.toLowerCase() === normalized)) return group.key;
  }
  return null;
}

export type PayrollOmzetPeriod = {
  periodMonth: number;
  periodYear: number;
  totalOmzet: number;
  bonusOmzet: number;
  isLocked: boolean;
  units: PayrollOmzetUnitEntry[];
};

export type PayrollPeriodOption = {
  month: number;
  year: number;
  label: string;
};

type PayrollPeriodInput = {
  month?: number;
  year?: number;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getJakartaNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [yearRaw, monthRaw, dayRaw] = formatter.format(now).split("-");
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
    day: Number(dayRaw),
  };
}

export function getActivePayrollPeriod() {
  const now = getJakartaNow();
  if (now.day > 25) {
    if (now.month === 12) {
      return { month: 1, year: now.year + 1 };
    }
    return { month: now.month + 1, year: now.year };
  }
  return { month: now.month, year: now.year };
}

// Periode absensi yang sedang berjalan: tgl 26 (M-1) s/d tgl 25 M.
// Jika hari ini > 25, periode aktif sudah pindah ke bulan berikutnya
// (mis. 28 April → periode "Mei" = 26 Apr–25 Mei).
export function getCurrentAttendancePeriod() {
  const now = getJakartaNow();
  if (now.day > 25) {
    if (now.month === 12) {
      return { month: 1, year: now.year + 1 };
    }
    return { month: now.month + 1, year: now.year };
  }
  return { month: now.month, year: now.year };
}

function resolvePayrollPeriod(period?: PayrollPeriodInput) {
  const active = getActivePayrollPeriod();
  return {
    month: period?.month ?? active.month,
    year: period?.year ?? active.year,
  };
}

export function getPayrollDateRange(periodMonth: number, periodYear: number) {
  const start = new Date(periodYear, periodMonth - 2, 26);
  const end = new Date(periodYear, periodMonth - 1, 25);

  const toSqlDate = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start,
    end,
    startSql: toSqlDate(start),
    endSql: toSqlDate(end),
  };
}

export function formatPayrollPeriodLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(year, month - 1, 1));
}

function countWorkDays(start: Date, end: Date) {
  const cursor = new Date(start);
  let total = 0;

  while (cursor <= end) {
    if (cursor.getDay() !== 0) {
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

export function isSalesEmployeeFromValues(role: string | null | undefined, _division?: string | null | undefined, _subDivision?: string | null) {
  void _division;
  void _subDivision;
  const roleText = (role ?? "").trim().toLowerCase();

  if (["secretary", "manager", "admin", "supervisor"].some((keyword) => roleText.includes(keyword))) {
    return false;
  }

  return roleText.includes("sales");
}

type QueryExecutor = PoolConnection | typeof pool;

function getMysqlErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: string }).code
    : undefined;
}

export async function ensurePayrollSupportTables(connection?: QueryExecutor) {
  const executor = connection ?? pool;

  await executor.query(`
    CREATE TABLE IF NOT EXISTS omzet_bulanan (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      periode_bulan TINYINT UNSIGNED NOT NULL,
      periode_tahun SMALLINT UNSIGNED NOT NULL,
      unit VARCHAR(100) NOT NULL DEFAULT '',
      total_omzet DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      is_custom_bonus TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_omzet_bulanan_periode_unit (periode_bulan, periode_tahun, unit)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const safeMigrateOmzet = async (sql: string, ignoreCode: string, label: string) => {
    try {
      await executor.query(sql);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code !== ignoreCode) {
        console.error(`Migration warning ${label}:`, err);
      }
    }
  };

  await safeMigrateOmzet(
    `ALTER TABLE omzet_bulanan ADD COLUMN unit VARCHAR(100) NOT NULL DEFAULT '' AFTER periode_tahun`,
    "ER_DUP_FIELDNAME",
    "omzet_bulanan.unit",
  );
  await safeMigrateOmzet(
    `ALTER TABLE omzet_bulanan ADD COLUMN is_custom_bonus TINYINT(1) NOT NULL DEFAULT 0 AFTER total_omzet`,
    "ER_DUP_FIELDNAME",
    "omzet_bulanan.is_custom_bonus",
  );
  await safeMigrateOmzet(
    `ALTER TABLE omzet_bulanan DROP INDEX uq_omzet_bulanan_periode`,
    "ER_CANT_DROP_FIELD_OR_KEY",
    "omzet_bulanan drop old unique",
  );
  await safeMigrateOmzet(
    `ALTER TABLE omzet_bulanan ADD UNIQUE KEY uq_omzet_bulanan_periode_unit (periode_bulan, periode_tahun, unit)`,
    "ER_DUP_KEYNAME",
    "omzet_bulanan unique unit",
  );

  // karyawan.tanggal_nonaktif: dipakai filter Summary agar nonaktif hilang dari periode resign & seterusnya.
  await safeMigrateOmzet(
    `ALTER TABLE karyawan ADD COLUMN tanggal_nonaktif DATE NULL DEFAULT NULL AFTER status_data`,
    "ER_DUP_FIELDNAME",
    "karyawan.tanggal_nonaktif",
  );
  await safeMigrateOmzet(
    `UPDATE karyawan SET tanggal_nonaktif = DATE(updated_at) WHERE status_data = 'nonaktif' AND tanggal_nonaktif IS NULL`,
    "ER_BAD_FIELD_ERROR",
    "karyawan.tanggal_nonaktif backfill",
  );

  await executor.query(`
    CREATE TABLE IF NOT EXISTS payroll_employee_input (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      payroll_id BIGINT UNSIGNED NOT NULL,
      karyawan_id BIGINT UNSIGNED NOT NULL,
      payroll_type ENUM('non_sales', 'sales') NOT NULL DEFAULT 'non_sales',
      gaji_pokok_per_hari DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      uang_makan_per_hari DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      subsidi DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      uang_kerajinan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      bpjs DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      bonus_performa DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      insentif DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      uang_transport DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      kendaraan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      perjalanan_dinas_reimburse DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      override_masuk INT NULL DEFAULT NULL,
      override_lembur DECIMAL(14,2) NULL DEFAULT NULL,
      override_izin INT NULL DEFAULT NULL,
      override_sakit INT NULL DEFAULT NULL,
      override_sakit_tanpa_surat INT NULL DEFAULT NULL,
      override_setengah_hari INT NULL DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_payroll_employee_input_payroll (payroll_id),
      KEY idx_payroll_employee_input_karyawan (karyawan_id),
      CONSTRAINT fk_payroll_employee_input_payroll
        FOREIGN KEY (payroll_id) REFERENCES payroll (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT fk_payroll_employee_input_karyawan
        FOREIGN KEY (karyawan_id) REFERENCES karyawan (id)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input 
      ADD COLUMN override_masuk INT NULL DEFAULT NULL,
      ADD COLUMN override_lembur DECIMAL(14,2) NULL DEFAULT NULL,
      ADD COLUMN override_izin INT NULL DEFAULT NULL,
      ADD COLUMN override_sakit INT NULL DEFAULT NULL,
      ADD COLUMN override_sakit_tanpa_surat INT NULL DEFAULT NULL,
      ADD COLUMN override_setengah_hari INT NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for payroll_employee_input:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input 
      ADD COLUMN override_kontrak DECIMAL(14,2) NULL DEFAULT NULL,
      ADD COLUMN override_pinjaman DECIMAL(14,2) NULL DEFAULT NULL,
      ADD COLUMN override_pinjaman_pribadi DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for deduction overrides:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN override_gaji_pokok DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for override_gaji_pokok:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN override_potongan_absensi DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for override_potongan_absensi:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN override_denda DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for override_denda:", err);
    }
  }

  // Potongan lain-lain (mis. SP2) — berlaku HANYA periode ini (tidak di-clone ke periode
  // berikutnya), jadi periode selanjutnya otomatis kembali normal.
  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN potongan_sp2 DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for potongan_sp2:", err);
    }
  }

  // Catatan/alasan potongan lain-lain (SP2) — per periode, mengikuti potongan_sp2.
  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN potongan_sp2_note TEXT NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for potongan_sp2_note:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN override_kerajinan DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for override_kerajinan:", err);
    }
  }

  // is_manual = 1 bila baris ini disimpan MANUAL oleh admin (form payroll); 0 bila hasil
  // clone antar periode. Dipakai untuk carry Gaji Kontrak ke periode berikutnya secara andal
  // (clone tidak ikut nge-bump seperti updated_at).
  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN is_manual TINYINT(1) NOT NULL DEFAULT 0
    `);
    // Kolom BARU dibuat → backfill SEKALI: tandai baris pei terakhir-diupdate per karyawan
    // sebagai manual (asumsi = edit admin terakhir). Baris lain (clone) tetap 0. Dengan begitu
    // carry Gaji Kontrak langsung berlaku untuk data yang sudah ada tanpa perlu re-save.
    await executor.query(`
      UPDATE payroll_employee_input pei
      INNER JOIN (
        SELECT karyawan_id, MAX(updated_at) AS mx
        FROM payroll_employee_input GROUP BY karyawan_id
      ) t ON t.karyawan_id = pei.karyawan_id AND t.mx = pei.updated_at
      SET pei.is_manual = 1
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for is_manual:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN kendaraan DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER uang_transport,
      ADD COLUMN perjalanan_dinas_reimburse DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER kendaraan
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for sales nasional payroll fields:", err);
    }
  }

  try {
    await executor.query(`
      ALTER TABLE payroll_employee_input
      ADD COLUMN freelance_rate_type ENUM('per_hari','per_jam') NULL DEFAULT NULL,
      ADD COLUMN gaji_pokok_per_jam DECIMAL(14,2) NULL DEFAULT NULL
    `);
  } catch (err: unknown) {
    if (getMysqlErrorCode(err) !== 'ER_DUP_FIELDNAME') {
      console.error("Migration warning for freelance columns:", err);
    }
  }
}

export async function listPayrollEmployeeOptions(options?: {
  placementFilter?: string;
  excludePlacement?: string;
}) {
  const placementFilter = options?.placementFilter?.trim();
  const excludePlacement = options?.excludePlacement?.trim();
  const [rows] = await pool.query<PayrollEmployeeOptionRow[]>(
    `
      SELECT
        k.id AS employee_id,
        k.nama,
        k.jabatan,
        k.divisi,
        k.sub_divisi,
        k.departemen,
        k.pembagian_rekapan,
        k.status_kepegawaian,
        k.tipe_payroll_penjahit,
        DATE_FORMAT(k.tanggal_masuk_pertama, '%Y-%m-%d') AS tanggal_masuk_pertama,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        DATE_FORMAT(k.tanggal_selesai_kontrak, '%Y-%m-%d') AS tanggal_selesai_kontrak
      FROM karyawan k
      WHERE k.status_data = 'aktif'
        ${placementFilter ? "AND LOWER(COALESCE(k.penempatan, '')) = LOWER(?)" : ""}
        ${excludePlacement ? "AND LOWER(COALESCE(k.penempatan, '')) <> LOWER(?)" : ""}
      ORDER BY k.nama ASC
    `,
    [
      ...(placementFilter ? [placementFilter] : []),
      ...(excludePlacement ? [excludePlacement] : []),
    ],
  );

  return rows.map((row) => ({
    employeeId: row.employee_id,
    name: row.nama,
    role: row.jabatan,
    division: row.divisi,
    subDivision: row.sub_divisi,
    department: row.departemen,
    recapGroup: row.pembagian_rekapan ?? "-",
    isSales: isSalesEmployeeFromValues(row.jabatan, row.divisi, row.sub_divisi),
    employmentStatus: row.status_kepegawaian ?? null,
    firstJoinDate: row.tanggal_masuk_pertama ?? null,
    contractDate: row.tanggal_kontrak ?? null,
    contractEndDate: row.tanggal_selesai_kontrak ?? null,
    isWeekly:
      (row.sub_divisi ?? "").trim().toLowerCase() === "penjahit" &&
      (row.tipe_payroll_penjahit ?? "").trim().toLowerCase() === "mingguan",
  }));
}

async function runOneOffMigrationsSilently() {
  try {
    const { clearStaleLoanOverridesOnce } = await import("./attendance-recompute");
    await clearStaleLoanOverridesOnce();
  } catch (error) {
    console.error("clearStaleLoanOverridesOnce failed", error);
  }
}

// Dedup panggilan CONCURRENT untuk periode yang sama: bila beberapa pemanggil
// (mis. main + penjahit + partime sheet) meminta clone periode yang sama secara
// bersamaan, mereka berbagi SATU transaksi INSERT...SELECT — mencegah deadlock &
// pool exhaustion. Memo dihapus saat selesai agar request berikutnya tetap jalan.
const inFlightPeriodClone = new Map<
  string,
  Promise<{ cloned: boolean; sourceMonth?: number; sourceYear?: number }>
>();

export async function ensurePayrollPeriodCloned(
  targetMonth: number,
  targetYear: number,
): Promise<{ cloned: boolean; sourceMonth?: number; sourceYear?: number }> {
  const key = `${targetYear}-${targetMonth}`;
  const existing = inFlightPeriodClone.get(key);
  if (existing) return existing;
  const p = ensurePayrollPeriodClonedImpl(targetMonth, targetYear);
  inFlightPeriodClone.set(key, p);
  try {
    return await p;
  } finally {
    inFlightPeriodClone.delete(key);
  }
}

async function ensurePayrollPeriodClonedImpl(
  targetMonth: number,
  targetYear: number,
): Promise<{ cloned: boolean; sourceMonth?: number; sourceYear?: number }> {
  await runOneOffMigrationsSilently();
  if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12) {
    return { cloned: false };
  }
  if (!Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 2100) {
    return { cloned: false };
  }

  await ensurePayrollSupportTables();

  const [sourceRows] = await pool.query<RowDataPacket[]>(
    `SELECT periode_bulan, periode_tahun FROM payroll
     WHERE (periode_tahun < ? OR (periode_tahun = ? AND periode_bulan < ?))
     ORDER BY periode_tahun DESC, periode_bulan DESC LIMIT 1`,
    [targetYear, targetYear, targetMonth],
  );
  if (!sourceRows[0]) return { cloned: false };

  const sourceMonth = (sourceRows[0] as { periode_bulan: number }).periode_bulan;
  const sourceYear = (sourceRows[0] as { periode_tahun: number }).periode_tahun;

  const targetRange = getPayrollDateRange(targetMonth, targetYear);
  const targetWorkDays = countWorkDays(targetRange.start, targetRange.end);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `
        INSERT IGNORE INTO payroll (
          karyawan_id, periode_bulan, periode_tahun,
          hari_kerja, total_masuk, total_lembur_jam, total_terlambat, total_setengah_hari,
          gaji_pokok, tunjangan_jabatan, tunjangan_lain, bonus_performa, bpjs,
          uang_makan, transport, insentif, upah_lembur,
          potongan_keterlambatan, potongan_setengah_hari, potongan_kontrak,
          potongan_pinjaman, potongan_kerajinan, total_potongan, gaji_bersih, status_payroll
        )
        SELECT
          p.karyawan_id, ?, ?,
          ?, 0, 0, 0, 0,
          0, 0, 0, 0, 0,
          0, 0, 0, 0,
          0, 0, 0,
          0, 0, 0, 0, 'draft'
        FROM payroll p
        INNER JOIN karyawan k ON k.id = p.karyawan_id AND k.status_data = 'aktif'
        WHERE p.periode_bulan = ? AND p.periode_tahun = ?
          AND NOT EXISTS (
            SELECT 1 FROM payroll p2
            WHERE p2.karyawan_id = p.karyawan_id
              AND p2.periode_bulan = ?
              AND p2.periode_tahun = ?
          )
      `,
      [targetMonth, targetYear, targetWorkDays, sourceMonth, sourceYear, targetMonth, targetYear],
    );

    await connection.query(
      `
        INSERT IGNORE INTO payroll_employee_input (
          payroll_id, karyawan_id, payroll_type,
          gaji_pokok_per_hari, uang_makan_per_hari, subsidi, uang_kerajinan, bpjs,
          bonus_performa, insentif, uang_transport, kendaraan,
          freelance_rate_type, gaji_pokok_per_jam, override_gaji_pokok
        )
        SELECT
          new_p.id, src.karyawan_id, src.payroll_type,
          src.gaji_pokok_per_hari, src.uang_makan_per_hari, src.subsidi, src.uang_kerajinan, src.bpjs,
          src.bonus_performa, src.insentif, src.uang_transport, src.kendaraan,
          src.freelance_rate_type, src.gaji_pokok_per_jam, src.override_gaji_pokok
        FROM payroll_employee_input src
        INNER JOIN payroll old_p ON old_p.id = src.payroll_id
        INNER JOIN payroll new_p ON new_p.karyawan_id = src.karyawan_id
          AND new_p.periode_bulan = ?
          AND new_p.periode_tahun = ?
        WHERE old_p.periode_bulan = ? AND old_p.periode_tahun = ?
      `,
      [targetMonth, targetYear, sourceMonth, sourceYear],
    );

    await connection.commit();
    return { cloned: true, sourceMonth, sourceYear };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listPayrollPeriods() {
  await ensurePayrollSupportTables();

  const [rows] = await pool.query<PeriodRow[]>(
    `
      SELECT periode_bulan, periode_tahun FROM payroll
      UNION
      SELECT periode_bulan, periode_tahun FROM omzet_bulanan
      ORDER BY periode_tahun DESC, periode_bulan DESC
    `,
  );

  if (!rows.length) {
    const active = getActivePayrollPeriod();
    return [{ month: active.month, year: active.year, label: formatPayrollPeriodLabel(active.month, active.year) }];
  }

  return rows.map((row) => ({
    month: row.periode_bulan,
    year: row.periode_tahun,
    label: formatPayrollPeriodLabel(row.periode_bulan, row.periode_tahun),
  }));
}

export async function getPayrollOmzetPeriod(
  period?: PayrollPeriodInput,
  options?: { groups?: OmzetGroupConfig[]; includeOtherSaved?: boolean },
): Promise<PayrollOmzetPeriod> {
  const resolved = resolvePayrollPeriod(period);
  await ensurePayrollSupportTables();

  const activeGroups = options?.groups ?? OMZET_GROUPS;
  const includeOtherSaved = options?.includeOtherSaved ?? true;

  const [rows] = await pool.query<OmzetMonthlyRow[]>(
    `
      SELECT id, periode_bulan, periode_tahun, unit, total_omzet, is_custom_bonus
      FROM omzet_bulanan
      WHERE periode_bulan = ? AND periode_tahun = ?
    `,
    [resolved.month, resolved.year],
  );

  // Map data tersimpan ke group key (mendukung data lama yang masih pakai nama unit asli)
  const savedByGroup = new Map<string, OmzetMonthlyRow>();
  for (const row of rows) {
    const unitName = (row.unit ?? "").trim();
    if (!unitName) continue;
    // Match by active groups first (so custom groups like "Toko Solo" can be resolved)
    let groupKey = activeGroups.find(
      (g) =>
        g.key.toLowerCase() === unitName.toLowerCase() ||
        g.units.some((u) => u.toLowerCase() === unitName.toLowerCase()),
    )?.key;
    if (!groupKey) groupKey = getOmzetGroupKeyForUnit(unitName) ?? unitName;
    savedByGroup.set(groupKey, row);
  }

  const units: PayrollOmzetUnitEntry[] = activeGroups.map((group) => {
    const saved = savedByGroup.get(group.key);
    const totalOmzet = toNumber(saved?.total_omzet);
    const isCustomBonus = saved ? Boolean(saved.is_custom_bonus) : group.defaultCustomBonus;
    const bonusOmzet = isCustomBonus ? totalOmzet : totalOmzet * PAYROLL_OMZET_BONUS_RATE;
    return {
      unit: group.key,
      label: group.label,
      totalOmzet,
      bonusOmzet,
      isCustomBonus,
      isLocked: Boolean(saved),
    };
  });

  // Sertakan grup lain yang sudah tersimpan tapi tidak ada di daftar default
  if (includeOtherSaved) {
    for (const row of rows) {
      const unitName = (row.unit ?? "").trim();
      if (!unitName) continue;
      const groupKey = getOmzetGroupKeyForUnit(unitName) ?? unitName;
      if (activeGroups.some((g) => g.key === groupKey)) continue;
      const totalOmzet = toNumber(row.total_omzet);
      const isCustomBonus = Boolean(row.is_custom_bonus);
      units.push({
        unit: groupKey,
        label: groupKey,
        totalOmzet,
        bonusOmzet: isCustomBonus ? totalOmzet : totalOmzet * PAYROLL_OMZET_BONUS_RATE,
        isCustomBonus,
        isLocked: true,
      });
    }
  }

  const totalOmzet = units.reduce((sum, item) => sum + item.totalOmzet, 0);
  const bonusOmzet = units.reduce((sum, item) => sum + item.bonusOmzet, 0);
  const isLocked = units.some((item) => item.isLocked);

  return {
    periodMonth: resolved.month,
    periodYear: resolved.year,
    totalOmzet,
    bonusOmzet,
    isLocked,
    units,
  };
}

export type OmzetUnitInput = {
  unit: string;
  totalOmzet: number;
  isCustomBonus: boolean;
};

export async function upsertPayrollPeriodOmzet(
  inputs: OmzetUnitInput[] | number,
  period?: PayrollPeriodInput,
) {
  const resolved = resolvePayrollPeriod(period);
  await ensurePayrollSupportTables();

  // Backward compat: jika dipanggil dengan single number, taruh ke group pertama (legacy)
  const normalizedInputs: OmzetUnitInput[] = Array.isArray(inputs)
    ? inputs
    : [{ unit: OMZET_GROUPS[0].key, totalOmzet: inputs, isCustomBonus: false }];

  let isUpdateAny = false;

  for (const item of normalizedInputs) {
    const rawUnitName = item.unit.trim();
    if (!rawUnitName) continue;
    // Normalisasi ke group key (kalau user kirim "AVA Sportivo", auto map ke "AVA+Ayres")
    const unitName = getOmzetGroupKeyForUnit(rawUnitName) ?? rawUnitName;

    const [existingRows] = await pool.query<OmzetMonthlyRow[]>(
      `
        SELECT id FROM omzet_bulanan
        WHERE periode_bulan = ? AND periode_tahun = ? AND unit = ?
        LIMIT 1
      `,
      [resolved.month, resolved.year, unitName],
    );

    if (existingRows[0]) {
      isUpdateAny = true;
      await pool.query<ResultSetHeader>(
        `
          UPDATE omzet_bulanan
          SET total_omzet = ?, is_custom_bonus = ?
          WHERE periode_bulan = ? AND periode_tahun = ? AND unit = ?
        `,
        [item.totalOmzet, item.isCustomBonus ? 1 : 0, resolved.month, resolved.year, unitName],
      );
    } else {
      await pool.query<ResultSetHeader>(
        `
          INSERT INTO omzet_bulanan (periode_bulan, periode_tahun, unit, total_omzet, is_custom_bonus)
          VALUES (?, ?, ?, ?, ?)
        `,
        [resolved.month, resolved.year, unitName, item.totalOmzet, item.isCustomBonus ? 1 : 0],
      );
    }
  }

  const refreshed = await getPayrollOmzetPeriod({ month: resolved.month, year: resolved.year });

  return {
    periodMonth: resolved.month,
    periodYear: resolved.year,
    totalOmzet: refreshed.totalOmzet,
    bonusOmzet: refreshed.bonusOmzet,
    units: refreshed.units,
    isLocked: refreshed.isLocked,
    isUpdate: isUpdateAny,
  };
}

export async function upsertPayrollFromForm(payload: PayrollFormPayload, period?: PayrollPeriodInput) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensurePayrollSupportTables(connection);
    await ensureLoanSupportTables(connection);
    await ensureReimbursementSchema();

    const [employees] = await connection.query<PayrollEmployeeRow[]>(
      `
        SELECT
          id AS employee_id,
          nama,
          jabatan,
          divisi,
          sub_divisi,
          status_kepegawaian
        FROM karyawan
        WHERE id = ?
        LIMIT 1
      `,
      [payload.employeeId],
    );

    const employee = employees[0];

    if (!employee) {
      throw new Error("Karyawan tidak ditemukan.");
    }

    const payrollType = isSalesEmployeeFromValues(employee.jabatan, employee.divisi, employee.sub_divisi)
      ? "sales"
      : "non_sales";
    const isSalesNasional = isSalesNasionalRole(employee.jabatan);
    const resolved = resolvePayrollPeriod(period);
    const range = getPayrollDateRange(resolved.month, resolved.year);
    const workDays = countWorkDays(range.start, range.end);

    const [attendanceRows] = await connection.query<AttendanceAggregateRow[]>(
      `
        SELECT
          SUM(CASE WHEN status_absensi = 'hadir' THEN 1 ELSE 0 END) AS present_count,
          SUM(CASE WHEN status_absensi = 'izin' THEN 1 ELSE 0 END) AS leave_count,
          SUM(CASE WHEN status_absensi = 'sakit' AND kode_absensi <> 'SX' THEN 1 ELSE 0 END) AS sick_count,
          SUM(CASE WHEN status_absensi = 'sakit' AND kode_absensi = 'SX' THEN 1 ELSE 0 END) AS sick_without_note_count,
          SUM(CASE WHEN status_absensi = 'setengah_hari' OR setengah_hari = 1 THEN 1 ELSE 0 END) AS half_day_count,
          SUM(CASE WHEN terlambat_menit > 0 THEN 1 ELSE 0 END) AS late_count
        FROM absensi
        WHERE karyawan_id = ?
          AND tanggal BETWEEN ? AND ?
      `,
      [payload.employeeId, range.startSql, range.endSql],
    );

    const attendance = attendanceRows[0] ?? {
      present_count: 0,
      leave_count: 0,
      sick_count: 0,
      sick_without_note_count: 0,
      half_day_count: 0,
      late_count: 0,
    };

    const [overtimeRows] = await connection.query<OvertimeAggregateRow[]>(
      `
        SELECT COALESCE(SUM(total_jam), 0) AS total_jam
        FROM lembur
        WHERE karyawan_id = ?
          AND tanggal BETWEEN ? AND ?
          AND status_approval = 'approved'
      `,
      [payload.employeeId, range.startSql, range.endSql],
    );

    const [contractRows] = await connection.query<ContractAggregateRow[]>(
      `
        SELECT nominal_potongan
        FROM potongan_kontrak
        WHERE karyawan_id = ? AND bulan = ? AND tahun = ?
        LIMIT 1
      `,
      [payload.employeeId, resolved.month, resolved.year],
    );

    const automaticLoanCut = await getLoanDeductionForPeriod(
      payload.employeeId,
      resolved.month,
      resolved.year,
      connection,
    );
    const presentDays = payload.overrideMasuk ?? attendance.present_count ?? 0;
    const leaveCount = payload.overrideIzin ?? attendance.leave_count ?? 0;
    const sickCount = payload.overrideSakit ?? attendance.sick_count ?? 0;
    const sickWithoutNoteCount = payload.overrideSakitTanpaSurat ?? attendance.sick_without_note_count ?? 0;
    void leaveCount;
    void sickWithoutNoteCount;
    const halfDayCount = payload.overrideSetengahHari ?? attendance.half_day_count ?? 0;
    const lateCount = attendance.late_count ?? 0;
    const overtimeHours = payload.overrideLembur ?? toNumber(overtimeRows[0]?.total_jam);
    const contractCut = payload.overrideKontrak ?? toNumber(contractRows[0]?.nominal_potongan);
    const loanCut = payload.overridePinjaman ?? automaticLoanCut;
    const personalLoanCut = payload.overridePinjamanPribadi ?? 0;
    const gajiPerDay = payload.gajiPerDay;

    // Freelance detection — selalu dihitung per jam: rate × total jam dari absensi
    const isFreelance = (employee.status_kepegawaian ?? "").trim().toLowerCase() === "freelance";
    const freelanceRateType = payload.freelanceRateType ?? "per_hari";
    let freelancePay = 0;
    if (isFreelance) {
      // Rate per jam diambil dari field per_jam (kalau ada), fallback ke per_hari (treat as per jam)
      const ratePerJam = (payload.gajiPerJam ?? 0) || gajiPerDay;
      const [hoursRows] = await connection.query<FreelanceHoursRow[]>(
        `SELECT COALESCE(SUM(
           CASE
             WHEN jam_masuk IS NOT NULL AND jam_pulang IS NOT NULL
               THEN FLOOR(TIMESTAMPDIFF(MINUTE, jam_masuk, jam_pulang) / 30) * 30
             WHEN jam_masuk IS NOT NULL
               THEN 480
             ELSE 0
           END
         ), 0) AS total_menit
         FROM absensi
         WHERE karyawan_id = ? AND tanggal BETWEEN ? AND ?
           AND status_absensi = 'hadir'`,
        [payload.employeeId, range.startSql, range.endSql],
      );
      freelancePay = (toNumber(hoursRows[0]?.total_menit) / 60) * ratePerJam;
    }

    const monthlyBaseSalary = isFreelance ? freelancePay : (payload.overrideGajiPokok ?? gajiPerDay * workDays);
    const tunjanganJabatan = payload.tunjanganJabatan;
    const subsidi = payload.subsidi;
    const uangMakanPerDay = payload.uangMakan;
    const uangMakanTotal = uangMakanPerDay * presentDays;
    const uangKerajinan = payload.uangKerajinan;
    const bpjs = payload.bpjs;
    const bonusPerforma = payrollType === "sales" && !isSalesNasional ? 0 : payload.bonusPerforma;
    const kendaraan = isSalesNasional ? payload.kendaraan : 0;
    const perjalananDinasReimburse = 0;
    const diligenceAllowance = presentDays + sickCount >= workDays ? uangKerajinan : 0;
    const diligenceCut = Math.max(uangKerajinan - diligenceAllowance, 0);
    const overtimeBonus = overtimeHours * 20000;
    const halfDayDeduction = (gajiPerDay / 2) * halfDayCount;
    const lateDeduction = lateCount * 20000;
    const totalBaseSalary = gajiPerDay * presentDays;
    const totalSalaryBeforeDeduction =
      totalBaseSalary +
      tunjanganJabatan +
      uangMakanTotal +
      subsidi +
      bonusPerforma +
      diligenceAllowance +
      bpjs +
      overtimeBonus +
      (payrollType === "sales" ? payload.insentif + payload.uangTransport : 0) +
      kendaraan +
      perjalananDinasReimburse;
    const totalSalary = totalSalaryBeforeDeduction - halfDayDeduction - lateDeduction;
    const totalPotongan = halfDayDeduction + lateDeduction + diligenceCut + contractCut + loanCut + personalLoanCut;
    const netIncome = totalSalary - contractCut - loanCut - personalLoanCut;

    // For freelance: override all components — only gaji pokok counts
    const finalMonthlyBaseSalary = isFreelance ? freelancePay : monthlyBaseSalary;
    const finalOvertimeBonus = isFreelance ? 0 : overtimeBonus;
    const finalHalfDayDeduction = isFreelance ? 0 : halfDayDeduction;
    const finalLateDeduction = isFreelance ? 0 : lateDeduction;
    // Freelance (by status ATAU jabatan) tidak kena potongan kontrak.
    const isFreelanceContract =
      isFreelance || (employee.jabatan ?? "").trim().toLowerCase() === "freelance";
    const finalContractCut = isFreelanceContract ? 0 : contractCut;
    const finalLoanCut = isFreelance ? 0 : loanCut;
    const finalDiligenceCut = isFreelance ? 0 : diligenceCut;
    // Selaraskan dengan finalContractCut: bila kontrak di-waive (jabatan freelance),
    // keluarkan contractCut dari total potongan & kembalikan ke net income.
    const finalTotalPotongan = isFreelance ? 0 : totalPotongan - contractCut + finalContractCut;
    const finalNetIncome = isFreelance ? freelancePay : netIncome + contractCut - finalContractCut;
    const finalOverrideGajiPokok = isFreelance ? freelancePay : (payload.overrideGajiPokok ?? null);

    const [payrollResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO payroll (
          karyawan_id,
          periode_bulan,
          periode_tahun,
          hari_kerja,
          total_masuk,
          total_lembur_jam,
          total_terlambat,
          total_setengah_hari,
          gaji_pokok,
          tunjangan_jabatan,
          tunjangan_lain,
          bonus_performa,
          bpjs,
          uang_makan,
          transport,
          insentif,
          upah_lembur,
          potongan_keterlambatan,
          potongan_setengah_hari,
          potongan_kontrak,
          potongan_pinjaman,
          potongan_kerajinan,
          total_potongan,
          gaji_bersih,
          status_payroll
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        ON DUPLICATE KEY UPDATE
          hari_kerja = VALUES(hari_kerja),
          total_masuk = VALUES(total_masuk),
          total_lembur_jam = VALUES(total_lembur_jam),
          total_terlambat = VALUES(total_terlambat),
          total_setengah_hari = VALUES(total_setengah_hari),
          gaji_pokok = VALUES(gaji_pokok),
          tunjangan_jabatan = VALUES(tunjangan_jabatan),
          tunjangan_lain = VALUES(tunjangan_lain),
          bonus_performa = VALUES(bonus_performa),
          bpjs = VALUES(bpjs),
          uang_makan = VALUES(uang_makan),
          transport = VALUES(transport),
          insentif = VALUES(insentif),
          upah_lembur = VALUES(upah_lembur),
          potongan_keterlambatan = VALUES(potongan_keterlambatan),
          potongan_setengah_hari = VALUES(potongan_setengah_hari),
          potongan_kontrak = VALUES(potongan_kontrak),
          potongan_pinjaman = VALUES(potongan_pinjaman),
          potongan_kerajinan = VALUES(potongan_kerajinan),
          total_potongan = VALUES(total_potongan),
          gaji_bersih = VALUES(gaji_bersih),
          status_payroll = 'draft'
      `,
      [
        payload.employeeId,
        resolved.month,
        resolved.year,
        workDays,
        presentDays,
        isFreelance ? 0 : overtimeHours,
        isFreelance ? 0 : lateCount,
        isFreelance ? 0 : halfDayCount,
        finalMonthlyBaseSalary,
        isFreelance ? 0 : tunjanganJabatan,
        isFreelance ? 0 : subsidi,
        isFreelance ? 0 : bonusPerforma,
        isFreelance ? 0 : bpjs,
        isFreelance ? 0 : uangMakanTotal,
        isFreelance ? 0 : (payrollType === "sales" ? payload.uangTransport : 0),
        isFreelance ? 0 : (payrollType === "sales" ? payload.insentif : 0),
        finalOvertimeBonus,
        finalLateDeduction,
        finalHalfDayDeduction,
        finalContractCut,
        finalLoanCut,
        finalDiligenceCut,
        finalTotalPotongan,
        finalNetIncome,
      ],
    );

    const [payrollRows] = await connection.query<(RowDataPacket & { id: number })[]>(
      `
        SELECT id
        FROM payroll
        WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ?
        LIMIT 1
      `,
      [payload.employeeId, resolved.month, resolved.year],
    );

    const payrollId = payrollRows[0]?.id ?? payrollResult.insertId;

    await connection.query(
      `
        INSERT INTO payroll_employee_input (
          payroll_id,
          karyawan_id,
          payroll_type,
          gaji_pokok_per_hari,
          uang_makan_per_hari,
          subsidi,
          uang_kerajinan,
          bpjs,
          bonus_performa,
          insentif,
          uang_transport,
          kendaraan,
          perjalanan_dinas_reimburse,
          override_masuk,
          override_lembur,
          override_izin,
          override_sakit,
          override_sakit_tanpa_surat,
          override_setengah_hari,
          override_kontrak,
          override_pinjaman,
          override_pinjaman_pribadi,
          override_gaji_pokok,
          freelance_rate_type,
          gaji_pokok_per_jam,
          potongan_sp2,
          potongan_sp2_note,
          is_manual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          is_manual = 1,
          payroll_type = VALUES(payroll_type),
          gaji_pokok_per_hari = VALUES(gaji_pokok_per_hari),
          uang_makan_per_hari = VALUES(uang_makan_per_hari),
          subsidi = VALUES(subsidi),
          uang_kerajinan = VALUES(uang_kerajinan),
          bpjs = VALUES(bpjs),
          bonus_performa = VALUES(bonus_performa),
          insentif = VALUES(insentif),
          uang_transport = VALUES(uang_transport),
          kendaraan = VALUES(kendaraan),
          perjalanan_dinas_reimburse = VALUES(perjalanan_dinas_reimburse),
          override_masuk = VALUES(override_masuk),
          override_lembur = VALUES(override_lembur),
          override_izin = VALUES(override_izin),
          override_sakit = VALUES(override_sakit),
          override_sakit_tanpa_surat = VALUES(override_sakit_tanpa_surat),
          override_setengah_hari = VALUES(override_setengah_hari),
          override_kontrak = VALUES(override_kontrak),
          override_pinjaman = VALUES(override_pinjaman),
          override_pinjaman_pribadi = VALUES(override_pinjaman_pribadi),
          override_gaji_pokok = VALUES(override_gaji_pokok),
          freelance_rate_type = VALUES(freelance_rate_type),
          gaji_pokok_per_jam = VALUES(gaji_pokok_per_jam),
          potongan_sp2 = VALUES(potongan_sp2),
          potongan_sp2_note = VALUES(potongan_sp2_note)
      `,
      [
        payrollId,
        payload.employeeId,
        payrollType,
        isFreelance && freelanceRateType === "per_jam" ? 0 : gajiPerDay,
        isFreelance ? 0 : uangMakanPerDay,
        isFreelance ? 0 : subsidi,
        isFreelance ? 0 : uangKerajinan,
        isFreelance ? 0 : bpjs,
        isFreelance ? 0 : bonusPerforma,
        isFreelance ? 0 : (payrollType === "sales" ? payload.insentif : 0),
        isFreelance ? 0 : (payrollType === "sales" ? payload.uangTransport : 0),
        isFreelance ? 0 : kendaraan,
        isFreelance ? 0 : perjalananDinasReimburse,
        isFreelance ? null : (payload.overrideMasuk ?? null),
        isFreelance ? null : (payload.overrideLembur ?? null),
        isFreelance ? null : (payload.overrideIzin ?? null),
        isFreelance ? null : (payload.overrideSakit ?? null),
        isFreelance ? null : (payload.overrideSakitTanpaSurat ?? null),
        isFreelance ? null : (payload.overrideSetengahHari ?? null),
        isFreelance ? null : (payload.overrideKontrak ?? null),
        isFreelance ? null : (payload.overridePinjaman ?? null),
        isFreelance ? null : (payload.overridePinjamanPribadi ?? null),
        finalOverrideGajiPokok,
        isFreelance ? freelanceRateType : null,
        isFreelance && freelanceRateType === "per_jam" ? (payload.gajiPerJam ?? null) : null,
        isFreelance ? null : (payload.potonganSp2 ?? null),
        isFreelance ? null : (payload.potonganSp2Note ?? null),
      ],
    );

    await attachLoanInstallmentsToPayroll(
      payload.employeeId,
      payrollId,
      resolved.month,
      resolved.year,
      finalLoanCut,
      connection,
    );

    await connection.commit();

    return {
      payrollId,
      periodMonth: resolved.month,
      periodYear: resolved.year,
      payrollType,
      employeeName: employee.nama,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Override Potongan Absensi (potongan kerajinan) hanya untuk SATU periode.
// value = null -> kembali otomatis dari sistem. Periode lain tidak terpengaruh.
export async function setPotonganAbsensiOverride(
  employeeId: number,
  period: { month: number; year: number },
  value: number | null,
) {
  await ensurePayrollSupportTables();

  const [payrollRows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM payroll WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [employeeId, period.month, period.year],
  );
  const payrollId = payrollRows[0]?.id;
  if (!payrollId) {
    throw new Error("Data payroll periode ini belum ada untuk karyawan tersebut.");
  }

  await pool.query(
    `
      INSERT INTO payroll_employee_input (payroll_id, karyawan_id, override_potongan_absensi)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE override_potongan_absensi = VALUES(override_potongan_absensi)
    `,
    [payrollId, employeeId, value],
  );

  return { payrollId, employeeId, periodMonth: period.month, periodYear: period.year };
}

// Update nominal Potongan Lain-lain (SP2) untuk SATU periode dari tabel (klik nominal).
// Catatan/alasan (potongan_sp2_note) TIDAK diubah di sini. value = null -> hapus potongan.
export async function setPotonganSp2Override(
  employeeId: number,
  period: { month: number; year: number },
  value: number | null,
) {
  await ensurePayrollSupportTables();

  const [payrollRows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM payroll WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [employeeId, period.month, period.year],
  );
  const payrollId = payrollRows[0]?.id;
  if (!payrollId) {
    throw new Error("Data payroll periode ini belum ada untuk karyawan tersebut.");
  }

  await pool.query(
    `
      INSERT INTO payroll_employee_input (payroll_id, karyawan_id, potongan_sp2)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE potongan_sp2 = VALUES(potongan_sp2)
    `,
    [payrollId, employeeId, value],
  );

  return { payrollId, employeeId, periodMonth: period.month, periodYear: period.year };
}

// Override Denda (penjahit) hanya untuk SATU periode. value = null -> otomatis dari sistem.
export async function setDendaPenjahitOverride(
  employeeId: number,
  period: { month: number; year: number },
  value: number | null,
) {
  await ensurePayrollSupportTables();

  const [payrollRows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM payroll WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [employeeId, period.month, period.year],
  );
  const payrollId = payrollRows[0]?.id;
  if (!payrollId) {
    throw new Error("Data payroll periode ini belum ada untuk karyawan tersebut.");
  }

  await pool.query(
    `
      INSERT INTO payroll_employee_input (payroll_id, karyawan_id, override_denda)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE override_denda = VALUES(override_denda)
    `,
    [payrollId, employeeId, value],
  );

  return { payrollId, employeeId, periodMonth: period.month, periodYear: period.year };
}

// Override Kerajinan (penjahit) hanya untuk SATU periode. value = null -> otomatis dari sistem.
export async function setKerajinanPenjahitOverride(
  employeeId: number,
  period: { month: number; year: number },
  value: number | null,
) {
  await ensurePayrollSupportTables();

  const [payrollRows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM payroll WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [employeeId, period.month, period.year],
  );
  const payrollId = payrollRows[0]?.id;
  if (!payrollId) {
    throw new Error("Data payroll periode ini belum ada untuk karyawan tersebut.");
  }

  await pool.query(
    `
      INSERT INTO payroll_employee_input (payroll_id, karyawan_id, override_kerajinan)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE override_kerajinan = VALUES(override_kerajinan)
    `,
    [payrollId, employeeId, value],
  );

  return { payrollId, employeeId, periodMonth: period.month, periodYear: period.year };
}

export async function deletePayrollById(payrollId: number) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureLoanSupportTables(connection);

    const [rows] = await connection.query<PayrollIdentityRow[]>(
      `
        SELECT p.id, p.karyawan_id, p.periode_bulan, p.periode_tahun, k.nama
        FROM payroll p
        INNER JOIN karyawan k ON k.id = p.karyawan_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [payrollId],
    );

    const payroll = rows[0];

    if (!payroll) {
      throw new Error("Data payroll tidak ditemukan.");
    }

    await detachLoanInstallmentsFromPayroll(payrollId, connection);
    await connection.query<ResultSetHeader>(`DELETE FROM payroll WHERE id = ?`, [payrollId]);

    await connection.commit();

    return {
      payrollId,
      employeeId: payroll.karyawan_id,
      employeeName: payroll.nama,
      periodMonth: payroll.periode_bulan,
      periodYear: payroll.periode_tahun,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

