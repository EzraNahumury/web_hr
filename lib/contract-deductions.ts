import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import {
  addMonthsToIsoDate,
  buildContractDeductionDescription,
  getContractDeductionNominalByRole,
  getFirstFiveContractPeriods,
  isContractDeductionActive,
} from "@/lib/contract-timeline";
import { pool } from "@/lib/db";
import { getActivePayrollPeriod } from "@/lib/payroll-admin";

// Kelayakan potongan kontrak (deposit 5 bulan). Konsisten di modul Potongan Kontrak,
// Pengembalian Kontrak, dan pembuatan jadwal. TETAP & FREELANCE & Sales Nasional &
// penempatan JNE TIDAK kena.
export function isContractDeductionEligible(
  statusKepegawaian: string | null,
  jabatan: string | null,
  penempatan?: string | null,
): boolean {
  const s = (statusKepegawaian ?? "").trim().toLowerCase();
  const j = (jabatan ?? "").trim().toLowerCase();
  const p = (penempatan ?? "").trim().toLowerCase();
  if (s === "tetap" || s === "freelance") return false;
  if (j === "freelance" || j === "sales nasional") return false;
  if (p === "jne") return false;
  return true;
}

let ineligibleCleanupDone = false;
// Bersihkan jadwal potongan_kontrak yang tidak valid. Idempotent, jalan sekali per proses.
// (1) Karyawan TIDAK eligible (tetap/freelance/sales nasional/penempatan JNE).
// (2) Baris DI LUAR window 5 bulan berdasarkan tanggal_kontrak (bulan kontrak + 1 .. + 5).
//     Ini menghapus baris STALE dari tanggal_kontrak lama yang tidak ter-regenerate — mis.
//     karyawan kontrak Agustus punya baris Agustus (harusnya mulai September). ym = tahun*12+bulan.
export async function cleanupIneligibleContractSchedules(): Promise<void> {
  if (ineligibleCleanupDone) return;
  ineligibleCleanupDone = true;
  try {
    await pool.query(
      `DELETE pk FROM potongan_kontrak pk
       INNER JOIN karyawan k ON k.id = pk.karyawan_id
       WHERE LOWER(COALESCE(k.status_kepegawaian, '')) IN ('tetap', 'freelance')
          OR LOWER(COALESCE(k.jabatan, '')) IN ('freelance', 'sales nasional')
          OR LOWER(COALESCE(k.penempatan, '')) = 'jne'`,
    );
    await pool.query(
      `DELETE pk FROM potongan_kontrak pk
       INNER JOIN karyawan k ON k.id = pk.karyawan_id
       WHERE k.tanggal_kontrak IS NOT NULL
         AND (pk.tahun * 12 + pk.bulan) NOT BETWEEN
             (YEAR(k.tanggal_kontrak) * 12 + MONTH(k.tanggal_kontrak) + 1)
             AND (YEAR(k.tanggal_kontrak) * 12 + MONTH(k.tanggal_kontrak) + 5)`,
    );
  } catch (err) {
    ineligibleCleanupDone = false;
    console.error("cleanupIneligibleContractSchedules failed", err);
  }
}

let contractColumnsReady: Promise<void> | null = null;
// Kolom "bulan potongan terakhir" (cap) di karyawan. YYYYMM; null = penuh 5 bulan.
export async function ensureContractDeductionColumns(): Promise<void> {
  if (!contractColumnsReady) {
    contractColumnsReady = (async () => {
      try {
        await pool.query(
          `ALTER TABLE karyawan ADD COLUMN potongan_kontrak_stop_ym INT NULL DEFAULT NULL`,
        );
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code !== "ER_DUP_FIELDNAME") {
          contractColumnsReady = null;
          console.error("ensureContractDeductionColumns failed", err);
        }
      }
    })();
  }
  return contractColumnsReady;
}

export type ContractDeductionItem = {
  id: number;
  employeeId: number;
  employeeName: string;
  nip: string;
  role: string;
  division: string;
  department: string;
  contractDate: string | null;
  annualRaise: string;
  month: number;
  year: number;
  nominalDeduction: string;
  description: string | null;
};

export type ContractDeductionEmployeeOption = {
  employeeId: number;
  name: string;
  nip: string;
  role: string;
  division: string;
  department: string;
  firstJoinDate: string | null;
  contractDate: string | null;
  contractEndDate: string | null;
  annualRaise: string;
  workStatus?: string;
  // Bulan potongan terakhir (YYYYMM). null = penuh 5 bulan (tanpa cap).
  lastDeductionYm?: number | null;
};

export type ContractDeductionPayload = {
  employeeId: number;
  nominalDeduction: number;
  description: string | null;
};

export type ContractDeductionInstallment = {
  id: number | null;
  sequence: number;
  month: number | null;
  year: number | null;
  monthLabel: string;
  nominalDeduction: string | null;
  deductedAmount: string | null;
  autoDeducted: boolean;
  // true = bulan ini di luar batas "potongan terakhir" -> dihentikan (tidak dipotong).
  stopped: boolean;
};

export type ContractDeductionPlanItem = {
  employeeId: number;
  employeeName: string;
  nip: string;
  role: string;
  division: string;
  department: string;
  firstJoinDate: string | null;
  contractDate: string | null;
  contractEndDate: string | null;
  deductionStartDate: string | null;
  deductionEndDate: string | null;
  monthlyDeduction: string | null;
  totalPlannedDeduction: string;
  totalDeductedAmount: string;
  remainingDeduction: string;
  annualRaise: string;
  description: string | null;
  isActive: boolean;
  // Bulan potongan terakhir (YYYYMM) yang di-set admin. null = penuh 5 bulan.
  lastDeductionYm: number | null;
  installments: ContractDeductionInstallment[];
};

type ContractDeductionRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  nama: string;
  no_karyawan: string;
  jabatan: string;
  divisi: string;
  departemen: string;
  tanggal_kontrak: string | null;
  kenaikan_tiap_tahun: string;
  nominal_potongan: string;
  bulan: number;
  tahun: number;
  keterangan: string | null;
};

type ContractDeductionEmployeeRow = RowDataPacket & {
  employee_id: number;
  nama: string;
  no_karyawan: string;
  jabatan: string;
  divisi: string;
  departemen: string;
  tanggal_masuk_pertama: string | null;
  tanggal_kontrak: string | null;
  tanggal_selesai_kontrak: string | null;
  kenaikan_tiap_tahun: string;
  status_kerja: string;
  potongan_kontrak_stop_ym: number | null;
};

type ContractDeductionEmployeeIdentityRow = RowDataPacket & {
  employee_id: number;
  jabatan: string;
  status_kepegawaian: string | null;
  penempatan: string | null;
  tanggal_kontrak: string | null;
};

type ContractDeductionUsageRow = RowDataPacket & {
  employee_id: number;
  periode_bulan: number;
  periode_tahun: number;
  total_potongan_kontrak: string;
};

type ContractDeductionUsageItem = {
  employeeId: number;
  month: number;
  year: number;
  deductedAmount: string;
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

function mapRow(row: ContractDeductionRow): ContractDeductionItem {
  return {
    id: row.id,
    employeeId: row.karyawan_id,
    employeeName: row.nama,
    nip: row.no_karyawan,
    role: row.jabatan,
    division: row.divisi,
    department: row.departemen,
    contractDate: row.tanggal_kontrak,
    annualRaise: row.kenaikan_tiap_tahun,
    month: row.bulan,
    year: row.tahun,
    nominalDeduction: row.nominal_potongan,
    description: row.keterangan,
  };
}

function buildPlan(
  employee: ContractDeductionEmployeeOption,
  rows: ContractDeductionItem[],
  usages: ContractDeductionUsageItem[],
): ContractDeductionPlanItem | null {
  if (!employee.contractDate) {
    return null;
  }

  const periods = getFirstFiveContractPeriods(employee.contractDate);
  const employeeRows = rows.filter((row) => row.employeeId === employee.employeeId);
  const employeeUsages = usages.filter((usage) => usage.employeeId === employee.employeeId);
  const deductionEndDate = addMonthsToIsoDate(employee.contractDate, 5);
  const defaultMonthlyDeduction = getContractDeductionNominalByRole(employee.role);

  // Periode payroll AKTIF (mis. tgl > 25 -> bulan berikutnya).
  // - Periode SETELAH periode aktif = masa depan -> "Belum dipotong" (walau ada
  //   baris payroll-nya dari clone/browse periode depan).
  // - Periode <= periode aktif = sudah jatuh tempo -> dianggap terpotong
  //   (pakai nilai payroll bila ada, kalau belum ada tandai "Otomatis").
  const active = getActivePayrollPeriod();
  const activeYearMonth = active.year * 100 + active.month;
  const isFuturePeriod = (month: number, year: number) =>
    year * 100 + month > activeYearMonth;

  // Bulan potongan terakhir (cap). Periode SETELAH cap = dihentikan (tidak dipotong).
  const stopYm = employee.lastDeductionYm ?? null;

  const installments = periods.map((period) => {
    const periodYm = period.year * 100 + period.month;
    const stopped = stopYm != null && periodYm > stopYm;
    const future = isFuturePeriod(period.month, period.year);
    const matched = employeeRows.find(
      (row) => row.month === period.month && row.year === period.year,
    );
    const usage = future || stopped
      ? undefined
      : employeeUsages.find(
          (item) => item.month === period.month && item.year === period.year,
        );
    const planned = matched?.nominalDeduction ?? String(defaultMonthlyDeduction);
    const actualDeducted = usage?.deductedAmount ?? null;
    // Periode jatuh tempo (<= aktif) selalu dianggap terpotong di payroll
    // (potongannya memang sudah diterapkan di perhitungan payroll live).
    const autoDeducted = false;
    // Bulan yang dihentikan -> tidak dipotong (deductedAmount null).
    const effectiveDeducted = stopped ? null : (future ? null : (actualDeducted ?? planned));

    return {
      id: matched?.id ?? null,
      sequence: period.sequence,
      month: period.month,
      year: period.year,
      monthLabel: period.monthLabel,
      nominalDeduction: planned,
      deductedAmount: effectiveDeducted,
      autoDeducted,
      stopped,
    } satisfies ContractDeductionInstallment;
  });

  // Total & sisa hanya menghitung bulan yang TIDAK dihentikan.
  const totalPlannedDeduction = installments.reduce(
    (total, installment) => total + (installment.stopped ? 0 : toNumber(installment.nominalDeduction)),
    0,
  );
  const totalDeductedAmount = installments.reduce(
    (total, installment) => total + toNumber(installment.deductedAmount),
    0,
  );
  const remainingDeduction = Math.max(totalPlannedDeduction - totalDeductedAmount, 0);

  return {
    employeeId: employee.employeeId,
    employeeName: employee.name,
    nip: employee.nip,
    role: employee.role,
    division: employee.division,
    department: employee.department,
    firstJoinDate: employee.firstJoinDate,
    contractDate: employee.contractDate,
    contractEndDate: employee.contractEndDate,
    deductionStartDate: employee.contractDate,
    deductionEndDate,
    monthlyDeduction:
      employeeRows[0]?.nominalDeduction ?? String(defaultMonthlyDeduction),
    totalPlannedDeduction: String(totalPlannedDeduction),
    totalDeductedAmount: String(totalDeductedAmount),
    remainingDeduction: String(remainingDeduction),
    annualRaise: employee.annualRaise,
    description: employeeRows[0]?.description ?? null,
    isActive: isContractDeductionActive(employee.contractDate),
    lastDeductionYm: stopYm,
    installments,
  } satisfies ContractDeductionPlanItem;
}

export async function listContractDeductions() {
  const [rows] = await pool.query<ContractDeductionRow[]>(
    `
      SELECT
        pk.id,
        pk.karyawan_id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        k.kenaikan_tiap_tahun,
        pk.nominal_potongan,
        pk.bulan,
        pk.tahun,
        pk.keterangan
      FROM potongan_kontrak pk
      INNER JOIN karyawan k ON k.id = pk.karyawan_id
      ORDER BY pk.tahun DESC, pk.bulan DESC, k.nama ASC
    `,
  );

  return rows.map(mapRow);
}

async function listContractDeductionUsages() {
  const [rows] = await pool.query<ContractDeductionUsageRow[]>(
    `
      SELECT
        p.karyawan_id AS employee_id,
        p.periode_bulan,
        p.periode_tahun,
        SUM(p.potongan_kontrak) AS total_potongan_kontrak
      FROM payroll p
      WHERE p.potongan_kontrak > 0
      GROUP BY p.karyawan_id, p.periode_bulan, p.periode_tahun
    `,
  );

  return rows.map((row) => ({
    employeeId: row.employee_id,
    month: row.periode_bulan,
    year: row.periode_tahun,
    deductedAmount: row.total_potongan_kontrak,
  } satisfies ContractDeductionUsageItem));
}

export async function listContractDeductionEmployees() {
  await ensureContractDeductionColumns();
  const [rows] = await pool.query<ContractDeductionEmployeeRow[]>(
    `
      SELECT
        k.id AS employee_id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen,
        DATE_FORMAT(k.tanggal_masuk_pertama, '%Y-%m-%d') AS tanggal_masuk_pertama,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        DATE_FORMAT(k.tanggal_selesai_kontrak, '%Y-%m-%d') AS tanggal_selesai_kontrak,
        k.kenaikan_tiap_tahun,
        k.status_kerja,
        k.potongan_kontrak_stop_ym
      FROM karyawan k
      WHERE k.status_data = 'aktif'
        AND LOWER(COALESCE(k.status_kepegawaian, '')) NOT IN ('tetap', 'freelance')
        AND LOWER(COALESCE(k.jabatan, '')) NOT IN ('freelance', 'sales nasional')
        AND LOWER(COALESCE(k.penempatan, '')) <> 'jne'
      ORDER BY k.nama ASC
    `,
  );

  return rows.map((row) => ({
    employeeId: row.employee_id,
    name: row.nama,
    nip: row.no_karyawan,
    role: row.jabatan,
    division: row.divisi,
    department: row.departemen,
    firstJoinDate: row.tanggal_masuk_pertama,
    contractDate: row.tanggal_kontrak,
    contractEndDate: row.tanggal_selesai_kontrak,
    annualRaise: row.kenaikan_tiap_tahun,
    workStatus: row.status_kerja,
    lastDeductionYm: row.potongan_kontrak_stop_ym ?? null,
  }));
}

export async function listContractDeductionPlans(options?: { activeOnly?: boolean }) {
  await ensureContractDeductionColumns();
  await cleanupIneligibleContractSchedules();
  const [employees, rows, usages] = await Promise.all([
    listContractDeductionEmployees(),
    listContractDeductions(),
    listContractDeductionUsages(),
  ]);

  const plans = employees.flatMap((employee) => {
    const plan = buildPlan(employee, rows, usages);
    return plan ? [plan] : [];
  });

  return options?.activeOnly ? plans.filter((plan) => plan.isActive) : plans;
}

export async function getContractDeductionPlanByEmployeeId(
  employeeId: number,
  options?: { activeOnly?: boolean },
) {
  const plans = await listContractDeductionPlans(options);
  return plans.find((plan) => plan.employeeId === employeeId) ?? null;
}

export async function getContractDeductionById(id: number) {
  const [rows] = await pool.query<ContractDeductionRow[]>(
    `
      SELECT
        pk.id,
        pk.karyawan_id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        k.kenaikan_tiap_tahun,
        pk.nominal_potongan,
        pk.bulan,
        pk.tahun,
        pk.keterangan
      FROM potongan_kontrak pk
      INNER JOIN karyawan k ON k.id = pk.karyawan_id
      WHERE pk.id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapRow(rows[0]) : null;
}

export async function syncContractDeductionSchedule(
  payload: {
    employeeId: number;
    role: string;
    contractDate: string | null;
    workStatus?: string | null;
    penempatan?: string | null;
    nominalDeduction?: number | null;
    description?: string | null;
  },
  connection?: PoolConnection,
) {
  const executor = connection ?? pool;

  await executor.query<ResultSetHeader>(
    "DELETE FROM potongan_kontrak WHERE karyawan_id = ?",
    [payload.employeeId],
  );

  // Hanya karyawan yang ELIGIBLE potongan kontrak yang dibuatkan jadwal. Tidak eligible
  // (freelance/tetap/sales nasional/penempatan JNE) -> jadwal cukup dihapus, tidak dibuat ulang.
  if (!isContractDeductionEligible(payload.workStatus ?? null, payload.role, payload.penempatan ?? null)) {
    return null;
  }

  if (!payload.contractDate) {
    return null;
  }

  // Hormati cap "bulan potongan terakhir": jadwal tidak dibuat untuk bulan setelah cap.
  // Defensif — kalau kolom belum ada, anggap tanpa cap.
  let stopYm: number | null = null;
  try {
    const [capRows] = await executor.query<(RowDataPacket & { ym: number | null })[]>(
      "SELECT potongan_kontrak_stop_ym AS ym FROM karyawan WHERE id = ? LIMIT 1",
      [payload.employeeId],
    );
    stopYm = capRows[0]?.ym ?? null;
  } catch {
    stopYm = null;
  }

  const periods = getFirstFiveContractPeriods(payload.contractDate).filter(
    (p) => stopYm == null || p.year * 100 + p.month <= stopYm,
  );
  const nominalDeduction =
    payload.nominalDeduction ?? getContractDeductionNominalByRole(payload.role);

  for (const period of periods) {
    await executor.query<ResultSetHeader>(
      `
        INSERT INTO potongan_kontrak (
          karyawan_id,
          bulan,
          tahun,
          nominal_potongan,
          keterangan
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        payload.employeeId,
        period.month,
        period.year,
        nominalDeduction,
        payload.description ?? buildContractDeductionDescription(period.sequence),
      ],
    );
  }

  return nominalDeduction;
}

async function getEmployeeIdentityForDeduction(employeeId: number) {
  const [rows] = await pool.query<ContractDeductionEmployeeIdentityRow[]>(
    `
      SELECT
        k.id AS employee_id,
        k.jabatan,
        k.status_kepegawaian,
        k.penempatan,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak
      FROM karyawan k
      WHERE k.id = ?
      LIMIT 1
    `,
    [employeeId],
  );

  return rows[0] ?? null;
}

export async function insertContractDeduction(payload: ContractDeductionPayload) {
  const employee = await getEmployeeIdentityForDeduction(payload.employeeId);

  if (!employee?.tanggal_kontrak) {
    throw new Error("Karyawan belum memiliki tanggal kontrak.");
  }

  await syncContractDeductionSchedule({
    employeeId: payload.employeeId,
    role: employee.jabatan,
    contractDate: employee.tanggal_kontrak,
    workStatus: employee.status_kepegawaian,
    penempatan: employee.penempatan,
    nominalDeduction: payload.nominalDeduction,
    description: payload.description,
  });

  return getContractDeductionPlanByEmployeeId(payload.employeeId);
}

// Set "bulan potongan terakhir" (cap) untuk 1 karyawan. lastYm = YYYYMM, atau null untuk hapus cap.
// Efek: (1) simpan cap di karyawan; (2) jadwal potongan_kontrak untuk bulan SETELAH cap dihapus;
// (3) potongan kontrak yang SUDAH tersimpan di payroll untuk bulan SETELAH cap di-nol-kan
// (auto-reverse, mis. September yang terlanjur terpotong); (4) kalau cap dihapus (null),
// jadwal 5 bulan penuh dibangun ulang.
export async function setContractDeductionLastMonth(
  employeeId: number,
  lastYm: number | null,
) {
  await ensureContractDeductionColumns();

  await pool.query("UPDATE karyawan SET potongan_kontrak_stop_ym = ? WHERE id = ?", [
    lastYm,
    employeeId,
  ]);

  if (lastYm != null) {
    await pool.query(
      "DELETE FROM potongan_kontrak WHERE karyawan_id = ? AND (tahun * 100 + bulan) > ?",
      [employeeId, lastYm],
    );
    await pool.query(
      `UPDATE payroll SET potongan_kontrak = 0
       WHERE karyawan_id = ? AND (periode_tahun * 100 + periode_bulan) > ? AND potongan_kontrak > 0`,
      [employeeId, lastYm],
    );
  } else {
    // Cap dihapus -> bangun ulang jadwal 5 bulan penuh (sync membaca stop_ym = null).
    const employee = await getEmployeeIdentityForDeduction(employeeId);
    if (employee?.tanggal_kontrak) {
      await syncContractDeductionSchedule({
        employeeId,
        role: employee.jabatan,
        contractDate: employee.tanggal_kontrak,
        workStatus: employee.status_kepegawaian,
        penempatan: employee.penempatan,
      });
    }
  }

  return getContractDeductionPlanByEmployeeId(employeeId);
}

export async function updateContractDeduction(id: number, payload: ContractDeductionPayload) {
  const employee = await getEmployeeIdentityForDeduction(id);

  if (!employee?.tanggal_kontrak) {
    throw new Error("Karyawan belum memiliki tanggal kontrak.");
  }

  await syncContractDeductionSchedule({
    employeeId: id,
    role: employee.jabatan,
    contractDate: employee.tanggal_kontrak,
    workStatus: employee.status_kepegawaian,
    penempatan: employee.penempatan,
    nominalDeduction: payload.nominalDeduction,
    description: payload.description,
  });

  return getContractDeductionPlanByEmployeeId(id);
}

export async function deleteContractDeduction(id: number) {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM potongan_kontrak WHERE karyawan_id = ?",
    [id],
  );

  return result.affectedRows > 0;
}
