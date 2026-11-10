import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";
import {
  formatPayrollPeriodLabel,
  getActivePayrollPeriod,
  getPayrollDateRange,
} from "@/lib/payroll-admin";

// ============================================================================
// SUMMARY BONUS (scaffold) — bonus Personal, Team, Company.
// - Omzet per periode: AVA Sportivo, Ayres, Gabungan.
// - Bonus Personal: syarat cair = telat <= 1 kali DAN masuk penuh (hadir semua hari kerja).
// - Bonus Team & Company: penilaian HR (centang). Team di-approve per-TIM (divisi), bukan orang.
// - NOMINAL/RUMUS belum final ("rumus menyusul") → sementara semua nominal 0.
// ============================================================================

export type BonusUnitOmzet = { avaSportivo: number; ayres: number; gabungan: number };

export type BonusSummaryRow = {
  employeeId: number;
  name: string;
  nip: string;
  division: string;
  department: string;
  lateCount: number;
  presentDays: number;
  workDays: number;
  // Personal cair: telat <= 1 kali & masuk penuh.
  personalEligible: boolean;
  // Centang HR (penilaian). Team = di-approve per tim/divisi.
  teamApproved: boolean;
  companyApproved: boolean;
  // Nominal bonus — RUMUS BELUM ADA, sementara 0.
  bonusPersonal: number;
  bonusTeam: number;
  bonusCompany: number;
};

export type BonusSummarySheet = {
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  rangeLabel: string;
  omzet: BonusUnitOmzet;
  rows: BonusSummaryRow[];
};

let schemaReady: Promise<void> | null = null;

export async function ensureBonusSummarySchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bonus_omzet_input (
          periode_bulan TINYINT UNSIGNED NOT NULL,
          periode_tahun SMALLINT UNSIGNED NOT NULL,
          ava_sportivo DECIMAL(16,2) NOT NULL DEFAULT 0,
          ayres DECIMAL(16,2) NOT NULL DEFAULT 0,
          gabungan DECIMAL(16,2) NOT NULL DEFAULT 0,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (periode_bulan, periode_tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bonus_distribution (
          periode_bulan TINYINT UNSIGNED NOT NULL,
          periode_tahun SMALLINT UNSIGNED NOT NULL,
          karyawan_id BIGINT UNSIGNED NOT NULL,
          team_approved TINYINT(1) NOT NULL DEFAULT 0,
          company_approved TINYINT(1) NOT NULL DEFAULT 0,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (periode_bulan, periode_tahun, karyawan_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })();
  }
  return schemaReady;
}

function countWorkDays(startSql: string, endSql: string): number {
  const start = new Date(`${startSql}T00:00:00Z`);
  const end = new Date(`${endSql}T00:00:00Z`);
  let total = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    if (new Date(t).getUTCDay() !== 0) total += 1; // bukan Minggu
  }
  return total;
}

function toNum(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getBonusSummarySheet(period?: {
  month?: number;
  year?: number;
}): Promise<BonusSummarySheet> {
  await ensureBonusSummarySchema();
  const active = getActivePayrollPeriod();
  const periodMonth = period?.month ?? active.month;
  const periodYear = period?.year ?? active.year;
  const range = getPayrollDateRange(periodMonth, periodYear);
  const workDays = countWorkDays(range.startSql, range.endSql);

  const [omzetRows] = await pool.query<(RowDataPacket & {
    ava_sportivo: string; ayres: string; gabungan: string;
  })[]>(
    `SELECT ava_sportivo, ayres, gabungan FROM bonus_omzet_input
     WHERE periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [periodMonth, periodYear],
  );
  const omzet: BonusUnitOmzet = {
    avaSportivo: toNum(omzetRows[0]?.ava_sportivo),
    ayres: toNum(omzetRows[0]?.ayres),
    gabungan: toNum(omzetRows[0]?.gabungan),
  };

  // Karyawan aktif (semua dapat bonus; syarat dicek per jenis). Freelance dikecualikan.
  const [empRows] = await pool.query<(RowDataPacket & {
    id: number; nama: string; no_karyawan: string | null; divisi: string | null; departemen: string | null;
  })[]>(
    `SELECT k.id, k.nama, k.no_karyawan, k.divisi, k.departemen
     FROM karyawan k
     WHERE k.status_data = 'aktif'
       AND COALESCE(LOWER(k.jabatan), '') <> 'freelance'
       AND COALESCE(LOWER(k.status_kepegawaian), '') <> 'freelance'
     ORDER BY k.divisi ASC, k.nama ASC`,
  );
  const employeeIds = empRows.map((r) => r.id);

  const lateMap = new Map<number, number>();
  const presentMap = new Map<number, number>();
  if (employeeIds.length > 0) {
    const placeholders = employeeIds.map(() => "?").join(",");
    const [attRows] = await pool.query<(RowDataPacket & {
      employee_id: number; late_count: number; present_count: number;
    })[]>(
      `SELECT karyawan_id AS employee_id,
              SUM(CASE WHEN terlambat_menit > 0 THEN 1 ELSE 0 END) AS late_count,
              SUM(CASE WHEN status_absensi = 'hadir' THEN 1 ELSE 0 END) AS present_count
       FROM absensi
       WHERE karyawan_id IN (${placeholders})
         AND tanggal BETWEEN ? AND ?
       GROUP BY karyawan_id`,
      [...employeeIds, range.startSql, range.endSql],
    );
    for (const r of attRows) {
      lateMap.set(r.employee_id, Number(r.late_count) || 0);
      presentMap.set(r.employee_id, Number(r.present_count) || 0);
    }
  }

  const distMap = new Map<number, { team: boolean; company: boolean }>();
  if (employeeIds.length > 0) {
    const [distRows] = await pool.query<(RowDataPacket & {
      karyawan_id: number; team_approved: number; company_approved: number;
    })[]>(
      `SELECT karyawan_id, team_approved, company_approved FROM bonus_distribution
       WHERE periode_bulan = ? AND periode_tahun = ?`,
      [periodMonth, periodYear],
    );
    for (const r of distRows) {
      distMap.set(r.karyawan_id, {
        team: Number(r.team_approved) === 1,
        company: Number(r.company_approved) === 1,
      });
    }
  }

  const rows: BonusSummaryRow[] = empRows.map((e) => {
    const lateCount = lateMap.get(e.id) ?? 0;
    const presentDays = presentMap.get(e.id) ?? 0;
    const dist = distMap.get(e.id);
    // Personal cair: telat <= 1 kali & masuk penuh (hadir semua hari kerja).
    const personalEligible = lateCount <= 1 && workDays > 0 && presentDays >= workDays;
    return {
      employeeId: e.id,
      name: e.nama,
      nip: e.no_karyawan || "-",
      division: e.divisi || "-",
      department: e.departemen || "-",
      lateCount,
      presentDays,
      workDays,
      personalEligible,
      teamApproved: dist?.team ?? false,
      companyApproved: dist?.company ?? false,
      // RUMUS BELUM ADA → 0. Nanti dihitung dari omzet + syarat.
      bonusPersonal: 0,
      bonusTeam: 0,
      bonusCompany: 0,
    };
  });

  return {
    periodMonth,
    periodYear,
    periodLabel: formatPayrollPeriodLabel(periodMonth, periodYear),
    rangeLabel: `${range.startSql} - ${range.endSql}`,
    omzet,
    rows,
  };
}

export async function upsertBonusOmzet(
  period: { month: number; year: number },
  omzet: BonusUnitOmzet,
): Promise<void> {
  await ensureBonusSummarySchema();
  await pool.query<ResultSetHeader>(
    `INSERT INTO bonus_omzet_input (periode_bulan, periode_tahun, ava_sportivo, ayres, gabungan)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE ava_sportivo = VALUES(ava_sportivo), ayres = VALUES(ayres), gabungan = VALUES(gabungan)`,
    [period.month, period.year, omzet.avaSportivo, omzet.ayres, omzet.gabungan],
  );
}

export async function setBonusDistribution(
  period: { month: number; year: number },
  karyawanId: number,
  field: "team" | "company",
  value: boolean,
): Promise<void> {
  await ensureBonusSummarySchema();
  const col = field === "team" ? "team_approved" : "company_approved";
  await pool.query<ResultSetHeader>(
    `INSERT INTO bonus_distribution (periode_bulan, periode_tahun, karyawan_id, ${col})
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE ${col} = VALUES(${col})`,
    [period.month, period.year, karyawanId, value ? 1 : 0],
  );
}

// Approve bonus TEAM per TIM (divisi) sekaligus — bukan per orang.
export async function setBonusDistributionByDivision(
  period: { month: number; year: number },
  division: string,
  field: "team" | "company",
  value: boolean,
): Promise<void> {
  await ensureBonusSummarySchema();
  const col = field === "team" ? "team_approved" : "company_approved";
  const [empRows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM karyawan
     WHERE status_data = 'aktif'
       AND COALESCE(LOWER(jabatan), '') <> 'freelance'
       AND COALESCE(LOWER(status_kepegawaian), '') <> 'freelance'
       AND COALESCE(divisi, '') = ?`,
    [division],
  );
  for (const e of empRows) {
    await pool.query<ResultSetHeader>(
      `INSERT INTO bonus_distribution (periode_bulan, periode_tahun, karyawan_id, ${col})
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ${col} = VALUES(${col})`,
      [period.month, period.year, e.id, value ? 1 : 0],
    );
  }
}
