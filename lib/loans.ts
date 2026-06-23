import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { addMonthsToIsoDate } from "@/lib/contract-timeline";
import { pool } from "@/lib/db";

export const LOAN_MINIMUM_TENURE_MONTHS = 6;

export type LoanEligibility = {
  eligible: boolean;
  firstJoinDate: string | null;
  eligibleFromDate: string | null;
  monthsWorked: number;
  reason: string | null;
  hasActiveLoan: boolean;
  canReapplyDate: string | null;
};

function getJakartaTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function monthsBetweenIsoDates(fromIso: string, toIso: string) {
  const fromMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromIso);
  const toMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toIso);
  if (!fromMatch || !toMatch) return 0;
  const fromY = Number(fromMatch[1]);
  const fromM = Number(fromMatch[2]);
  const fromD = Number(fromMatch[3]);
  const toY = Number(toMatch[1]);
  const toM = Number(toMatch[2]);
  const toD = Number(toMatch[3]);
  let months = (toY - fromY) * 12 + (toM - fromM);
  if (toD < fromD) months -= 1;
  return Math.max(0, months);
}

export function checkLoanEligibility(firstJoinDate: string | null | undefined): LoanEligibility {
  if (!firstJoinDate || !/^\d{4}-\d{2}-\d{2}$/.test(firstJoinDate)) {
    return {
      eligible: false,
      firstJoinDate: null,
      eligibleFromDate: null,
      monthsWorked: 0,
      reason:
        "Tanggal masuk pertama Anda belum tercatat. Hubungi HR untuk melengkapi data sebelum mengajukan pinjaman.",
      hasActiveLoan: false,
      canReapplyDate: null,
    };
  }

  const today = getJakartaTodayIsoDate();
  const monthsWorked = monthsBetweenIsoDates(firstJoinDate, today);
  const eligibleFromDate = addMonthsToIsoDate(firstJoinDate, LOAN_MINIMUM_TENURE_MONTHS);

  if (monthsWorked < LOAN_MINIMUM_TENURE_MONTHS) {
    return {
      eligible: false,
      firstJoinDate,
      eligibleFromDate,
      monthsWorked,
      reason: `Pengajuan pinjaman baru bisa dilakukan setelah Anda bekerja minimal ${LOAN_MINIMUM_TENURE_MONTHS} bulan.`,
      hasActiveLoan: false,
      canReapplyDate: null,
    };
  }

  return {
    eligible: true,
    firstJoinDate,
    eligibleFromDate,
    monthsWorked,
    reason: null,
    hasActiveLoan: false,
    canReapplyDate: null,
  };
}

export const EMPLOYEE_LOAN_MAX_AMOUNT = 3_000_000;

type LunasLoanRow = RowDataPacket & { updated_at: Date };
type ActiveLoanRow = RowDataPacket & { id: number };

export async function checkFullLoanEligibility(
  employeeId: number,
  firstJoinDate: string | null | undefined,
): Promise<LoanEligibility> {
  const base = checkLoanEligibility(firstJoinDate);
  if (!base.eligible) return base;

  const [activeRows] = await pool.query<ActiveLoanRow[]>(
    `SELECT id FROM pinjaman WHERE karyawan_id = ? AND status_pinjaman IN ('pending', 'approved', 'berjalan') LIMIT 1`,
    [employeeId],
  );

  if (activeRows.length > 0) {
    return {
      ...base,
      eligible: false,
      reason: "Anda masih memiliki pinjaman yang aktif atau sedang dalam proses persetujuan.",
      hasActiveLoan: true,
      canReapplyDate: null,
    };
  }

  const [lunasRows] = await pool.query<LunasLoanRow[]>(
    `SELECT updated_at FROM pinjaman
     WHERE karyawan_id = ? AND status_pinjaman = 'lunas'
     ORDER BY updated_at DESC LIMIT 1`,
    [employeeId],
  );

  if (lunasRows.length > 0) {
    const jakartaStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
    }).format(lunasRows[0].updated_at);
    const lunasPeriodIso = `${jakartaStr}-01`;
    const canReapplyDate = addMonthsToIsoDate(lunasPeriodIso, 4);
    const today = getJakartaTodayIsoDate();

    if (canReapplyDate && today < canReapplyDate) {
      return {
        ...base,
        eligible: false,
        reason: `Pengajuan pinjaman kembali baru bisa dilakukan mulai ${canReapplyDate}.`,
        hasActiveLoan: false,
        canReapplyDate,
      };
    }
  }

  return { ...base };
}

export type LoanStatus =
  | "pending"
  | "approved"
  | "berjalan"
  | "lunas"
  | "rejected"
  | "cancelled";

export type LoanInstallment = {
  id: number;
  sequence: number;
  month: number;
  year: number;
  monthLabel: string;
  plannedDeduction: string;
  paidDeduction: string | null;
  payrollId: number | null;
  isPaid: boolean;
};

export type LoanListItem = {
  id: number;
  employeeId: number;
  employeeName: string;
  nip: string;
  role: string;
  department: string;
  totalLoan: string;
  installmentCount: number;
  monthlyDeduction: string;
  requestDate: string;
  approvalDate: string | null;
  deductionStartDate: string | null;
  deductionMonthsLabel: string;
  status: LoanStatus;
  totalPaid: string;
  remainingBalance: string;
  paidInstallmentCount: number;
  installments: LoanInstallment[];
};

export type CreateLoanRequestPayload = {
  employeeId: number;
  totalLoan: number;
  installmentCount: number;
  requestDate: string;
};

type LoanRow = RowDataPacket & {
  id: number;
  employee_id: number;
  employee_name: string;
  nip: string;
  role: string;
  department: string;
  jumlah_pinjaman: string;
  jumlah_angsuran: number;
  angsuran_per_bulan: string;
  total_sudah_bayar: string;
  sisa_pinjaman: string;
  tanggal_pengajuan: string;
  tanggal_approval: string | null;
  status_pinjaman: LoanStatus;
};

type LoanInstallmentRow = RowDataPacket & {
  id: number;
  pinjaman_id: number;
  urutan_cicilan: number;
  bulan: number;
  tahun: number;
  nominal_potongan: string;
  nominal_terpotong: string | null;
  payroll_id: number | null;
};

type LoanDeductionPeriodRow = RowDataPacket & {
  employee_id: number;
  total_deduction: string | null;
};

type LoanIdentityRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  jumlah_pinjaman: string;
  jumlah_angsuran: number;
  status_pinjaman: LoanStatus;
  tanggal_pengajuan?: string;
  tanggal_approval?: string | null;
};

type LoanIdRow = RowDataPacket & {
  id: number;
};

type LoanPaidAggregateRow = RowDataPacket & {
  total_paid: string | null;
};

type DueInstallmentRow = RowDataPacket & {
  has_due: number;
};

type ExistingScheduleRow = RowDataPacket & {
  id: number;
  jumlah_pinjaman: string;
  jumlah_angsuran: number;
  angsuran_per_bulan: string;
  tanggal_approval: string | null;
  tanggal_pengajuan: string;
  status_pinjaman: LoanStatus;
};

type LoanRemainingAggregateRow = RowDataPacket & {
  remaining_total: string | null;
};

type MysqlErrorLike = {
  code?: string;
};

type QueryExecutor = PoolConnection | typeof pool;

function isMysqlErrorWithCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && (error as MysqlErrorLike).code === code;
}

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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function isValidSqlDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(year, month - 1, 1));
}

function formatMonthOnlyLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(year, month - 1, 1));
}

function getJakartaTodaySqlDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function buildInstallmentAmounts(totalLoan: number, installmentCount: number) {
  const totalCents = Math.round(totalLoan * 100);
  const baseCents = Math.floor(totalCents / installmentCount);
  const remainder = totalCents - baseCents * installmentCount;

  return Array.from({ length: installmentCount }, (_, index) =>
    (baseCents + (index < remainder ? 1 : 0)) / 100,
  );
}

function getLoanDeductionStartDate(approvalDate: string) {
  if (!isValidSqlDate(approvalDate)) {
    return null;
  }

  // Periode payroll berjalan dari tgl 26 (M-1) s/d tgl 25 M.
  // Approval tgl 1-25 → masih masuk periode bulan ini, potongan mulai periode bulan approval.
  // Approval tgl 26-31 → sudah masuk periode bulan berikutnya.
  const approvalDay = Number(approvalDate.slice(8, 10));
  const monthStart = `${approvalDate.slice(0, 7)}-01`;
  return approvalDay <= 25 ? monthStart : addMonthsToIsoDate(monthStart, 1);
}

function buildLoanInstallmentPeriods(approvalDate: string, installmentCount: number) {
  const startDate = getLoanDeductionStartDate(approvalDate);

  if (!startDate) {
    return [] as Array<{
      sequence: number;
      month: number;
      year: number;
      monthLabel: string;
      monthOnlyLabel: string;
    }>;
  }

  return Array.from({ length: installmentCount }, (_, index) => {
    const periodDate = addMonthsToIsoDate(startDate, index);

    if (!periodDate) {
      throw new Error("Periode cicilan pinjaman tidak valid.");
    }

    const [yearRaw, monthRaw] = periodDate.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);

    return {
      sequence: index + 1,
      month,
      year,
      monthLabel: formatMonthLabel(month, year),
      monthOnlyLabel: formatMonthOnlyLabel(month, year),
    };
  });
}

function buildLoanItem(row: LoanRow, installments: LoanInstallmentRow[]): LoanListItem {
  const loanInstallments = installments
    .filter((installment) => installment.pinjaman_id === row.id)
    .sort((left, right) => left.urutan_cicilan - right.urutan_cicilan)
    .map((installment) => {
      const planned = toNumber(installment.nominal_potongan);
      const paid = toNumber(installment.nominal_terpotong);

      return {
        id: installment.id,
        sequence: installment.urutan_cicilan,
        month: installment.bulan,
        year: installment.tahun,
        monthLabel: formatMonthLabel(installment.bulan, installment.tahun),
        plannedDeduction: installment.nominal_potongan,
        paidDeduction: installment.nominal_terpotong,
        payrollId: installment.payroll_id,
        isPaid: paid >= planned && planned > 0,
      } satisfies LoanInstallment;
    });

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    nip: row.nip,
    role: row.role,
    department: row.department,
    totalLoan: row.jumlah_pinjaman,
    installmentCount: row.jumlah_angsuran,
    monthlyDeduction: row.angsuran_per_bulan,
    requestDate: row.tanggal_pengajuan,
    approvalDate: row.tanggal_approval,
    deductionStartDate: row.tanggal_approval ? getLoanDeductionStartDate(row.tanggal_approval) : null,
    deductionMonthsLabel: loanInstallments.length
      ? loanInstallments.map((installment) => formatMonthOnlyLabel(installment.month, installment.year)).join(", ")
      : "-",
    status: row.status_pinjaman,
    totalPaid: row.total_sudah_bayar,
    remainingBalance: row.sisa_pinjaman,
    paidInstallmentCount: loanInstallments.filter((installment) => installment.isPaid).length,
    installments: loanInstallments,
  };
}

async function syncLoanSummary(loanId: number, connection?: QueryExecutor) {
  const executor = connection ?? pool;
  const [loanRows] = await executor.query<LoanIdentityRow[]>(
    `
      SELECT id, karyawan_id, jumlah_pinjaman, jumlah_angsuran, status_pinjaman
      FROM pinjaman
      WHERE id = ?
      LIMIT 1
    `,
    [loanId],
  );

  const loan = loanRows[0];

  if (!loan) {
    return null;
  }

  const [paidRows] = await executor.query<LoanPaidAggregateRow[]>(
    `
      SELECT COALESCE(SUM(nominal_terpotong), 0) AS total_paid
      FROM pinjaman_cicilan
      WHERE pinjaman_id = ?
    `,
    [loanId],
  );

  const totalPaid = toNumber(paidRows[0]?.total_paid);
  const totalLoan = toNumber(loan.jumlah_pinjaman);
  const remaining = Math.max(roundMoney(totalLoan - totalPaid), 0);
  const active = getActiveLoanPayrollPeriod();
  const activePeriodKey = active.year * 100 + active.month;
  const [dueRows] = await executor.query<DueInstallmentRow[]>(
    `
      SELECT 1 AS has_due
      FROM pinjaman_cicilan
      WHERE pinjaman_id = ?
        AND (tahun * 100 + bulan) <= ?
        AND nominal_potongan > 0
      LIMIT 1
    `,
    [loanId, activePeriodKey],
  );

  let nextStatus = loan.status_pinjaman;

  if (["approved", "berjalan", "lunas"].includes(loan.status_pinjaman)) {
    if (remaining <= 0 && totalLoan > 0) {
      nextStatus = "lunas";
    } else if (totalPaid > 0 || dueRows.length > 0) {
      nextStatus = "berjalan";
    } else {
      nextStatus = "approved";
    }
  }

  await executor.query<ResultSetHeader>(
    `
      UPDATE pinjaman
      SET total_sudah_bayar = ?, sisa_pinjaman = ?, status_pinjaman = ?
      WHERE id = ?
    `,
    [totalPaid, remaining, nextStatus, loanId],
  );

  return {
    loanId,
    employeeId: loan.karyawan_id,
    totalPaid,
    remaining,
    status: nextStatus,
  };
}

async function syncLoanSummariesByIds(loanIds: number[], connection?: QueryExecutor) {
  const uniqueLoanIds = Array.from(new Set(loanIds.filter((loanId) => loanId > 0)));

  for (const loanId of uniqueLoanIds) {
    await syncLoanSummary(loanId, connection);
  }
}

async function rebuildLoanInstallments(
  loanId: number,
  totalLoan: number,
  installmentCount: number,
  approvalDate: string,
  connection?: QueryExecutor,
  customAmounts?: number[],
) {
  const executor = connection ?? pool;
  const periods = buildLoanInstallmentPeriods(approvalDate, installmentCount);
  // Kalau admin kirim customAmounts dan jumlahnya cocok, pakai itu. Kalau tidak, distribute uniform.
  const installmentAmounts =
    customAmounts && customAmounts.length === installmentCount
      ? customAmounts.map((value) => roundMoney(Math.max(0, value)))
      : buildInstallmentAmounts(totalLoan, installmentCount);

  await executor.query<ResultSetHeader>(
    "DELETE FROM pinjaman_cicilan WHERE pinjaman_id = ?",
    [loanId],
  );

  for (const [index, period] of periods.entries()) {
    await executor.query<ResultSetHeader>(
      `
        INSERT INTO pinjaman_cicilan (
          pinjaman_id,
          urutan_cicilan,
          bulan,
          tahun,
          nominal_potongan,
          nominal_terpotong,
          payroll_id
        ) VALUES (?, ?, ?, ?, ?, NULL, NULL)
      `,
      [loanId, period.sequence, period.month, period.year, installmentAmounts[index] ?? 0],
    );
  }
}

async function bootstrapExistingLoanSchedules(connection?: QueryExecutor) {
  const executor = connection ?? pool;
  const [rows] = await executor.query<ExistingScheduleRow[]>(
    `
      SELECT
        p.id,
        p.jumlah_pinjaman,
        p.jumlah_angsuran,
        p.angsuran_per_bulan,
        DATE_FORMAT(p.tanggal_approval, '%Y-%m-%d') AS tanggal_approval,
        DATE_FORMAT(p.tanggal_pengajuan, '%Y-%m-%d') AS tanggal_pengajuan,
        p.status_pinjaman
      FROM pinjaman p
      LEFT JOIN pinjaman_cicilan pc ON pc.pinjaman_id = p.id
      WHERE p.status_pinjaman IN ('approved', 'berjalan', 'lunas')
      GROUP BY p.id, p.jumlah_pinjaman, p.jumlah_angsuran, p.angsuran_per_bulan, p.tanggal_approval, p.tanggal_pengajuan, p.status_pinjaman
      HAVING COUNT(pc.id) = 0
    `,
  );

  for (const row of rows) {
    const approvalDate = row.tanggal_approval ?? row.tanggal_pengajuan;

    if (!approvalDate) {
      continue;
    }

    await executor.query<ResultSetHeader>(
      `
        UPDATE pinjaman
        SET tanggal_approval = COALESCE(tanggal_approval, ?)
        WHERE id = ?
      `,
      [approvalDate, row.id],
    );

    await rebuildLoanInstallments(
      row.id,
      toNumber(row.jumlah_pinjaman),
      Math.max(row.jumlah_angsuran, 1),
      approvalDate,
      executor,
    );

    await syncLoanSummary(row.id, executor);
  }
}

type MisalignedLoanRow = RowDataPacket & {
  id: number;
  tanggal_approval: string;
  first_period: number | string;
};

type InstallmentPeriodRow = RowDataPacket & {
  id: number;
  bulan: number;
  tahun: number;
};

// Migration sekali-efek: pinjaman lama dibuat dengan aturan "cicilan mulai bulan setelah approval".
// Aturan baru: approval tgl 1-25 → cicilan mulai periode bulan approval itu sendiri.
// Geser jadwal mundur 1 bulan untuk pinjaman approved/berjalan yang BELUM ada cicilan terbayar.
// Nominal per bulan dipertahankan (digeser, bukan rebuild) supaya cicilan custom admin tidak hilang.
// Idempotent: setelah digeser, first period = bulan approval sehingga tidak match kriteria lagi.
async function realignLoanSchedulesToApprovalPeriod(connection?: QueryExecutor) {
  const executor = connection ?? pool;

  const [rows] = await executor.query<MisalignedLoanRow[]>(
    `
      SELECT
        p.id,
        DATE_FORMAT(p.tanggal_approval, '%Y-%m-%d') AS tanggal_approval,
        MIN(pc.tahun * 100 + pc.bulan) AS first_period
      FROM pinjaman p
      INNER JOIN pinjaman_cicilan pc ON pc.pinjaman_id = p.id
      WHERE p.status_pinjaman IN ('approved', 'berjalan')
        AND p.tanggal_approval IS NOT NULL
        AND DAY(p.tanggal_approval) <= 25
      GROUP BY p.id, p.tanggal_approval
      HAVING SUM(CASE WHEN pc.nominal_terpotong IS NOT NULL OR pc.payroll_id IS NOT NULL THEN 1 ELSE 0 END) = 0
    `,
  );

  for (const row of rows) {
    const approvalYear = Number(row.tanggal_approval.slice(0, 4));
    const approvalMonth = Number(row.tanggal_approval.slice(5, 7));

    // Period pertama menurut aturan lama (= bulan setelah approval)
    const oldRuleMonth = approvalMonth === 12 ? 1 : approvalMonth + 1;
    const oldRuleYear = approvalMonth === 12 ? approvalYear + 1 : approvalYear;
    const oldRulePeriod = oldRuleYear * 100 + oldRuleMonth;

    if (toNumber(row.first_period) !== oldRulePeriod) {
      continue; // sudah sesuai aturan baru atau punya jadwal custom lain — jangan disentuh
    }

    const [installments] = await executor.query<InstallmentPeriodRow[]>(
      `SELECT id, bulan, tahun FROM pinjaman_cicilan
       WHERE pinjaman_id = ?
       ORDER BY tahun ASC, bulan ASC`,
      [row.id],
    );

    // Geser ascending agar tidak bentrok unique key (pinjaman_id, bulan, tahun)
    for (const inst of installments) {
      const newMonth = inst.bulan === 1 ? 12 : inst.bulan - 1;
      const newYear = inst.bulan === 1 ? inst.tahun - 1 : inst.tahun;
      await executor.query<ResultSetHeader>(
        `UPDATE pinjaman_cicilan SET bulan = ?, tahun = ? WHERE id = ?`,
        [newMonth, newYear, inst.id],
      );
    }
  }
}

export async function ensureLoanSupportTables(connection?: QueryExecutor) {
  const executor = connection ?? pool;

  try {
    await executor.query(`
      ALTER TABLE pinjaman
      ADD COLUMN jumlah_angsuran INT UNSIGNED NOT NULL DEFAULT 1 AFTER jumlah_pinjaman
    `);
  } catch (error) {
    if (!isMysqlErrorWithCode(error, "ER_DUP_FIELDNAME")) {
      throw error;
    }
  }

  try {
    await executor.query(`
      ALTER TABLE pinjaman
      ADD COLUMN tanggal_approval DATE NULL AFTER tanggal_pengajuan
    `);
  } catch (error) {
    if (!isMysqlErrorWithCode(error, "ER_DUP_FIELDNAME")) {
      throw error;
    }
  }

  try {
    await executor.query(`
      ALTER TABLE pinjaman
      ADD COLUMN approved_by BIGINT UNSIGNED NULL AFTER tanggal_approval
    `);
  } catch (error) {
    if (!isMysqlErrorWithCode(error, "ER_DUP_FIELDNAME")) {
      throw error;
    }
  }

  await executor.query(`
    CREATE TABLE IF NOT EXISTS pinjaman_cicilan (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      pinjaman_id BIGINT UNSIGNED NOT NULL,
      urutan_cicilan INT UNSIGNED NOT NULL,
      bulan TINYINT UNSIGNED NOT NULL,
      tahun SMALLINT UNSIGNED NOT NULL,
      nominal_potongan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      nominal_terpotong DECIMAL(14,2) NULL DEFAULT NULL,
      payroll_id BIGINT UNSIGNED NULL DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_pinjaman_cicilan_periode (pinjaman_id, bulan, tahun),
      UNIQUE KEY uq_pinjaman_cicilan_urutan (pinjaman_id, urutan_cicilan),
      KEY idx_pinjaman_cicilan_periode (tahun, bulan),
      KEY idx_pinjaman_cicilan_payroll (payroll_id),
      CONSTRAINT fk_pinjaman_cicilan_pinjaman
        FOREIGN KEY (pinjaman_id) REFERENCES pinjaman (id)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await executor.query(`
    UPDATE pinjaman
    SET jumlah_angsuran = CASE
      WHEN angsuran_per_bulan > 0 AND ROUND(jumlah_pinjaman / angsuran_per_bulan) > 1
        THEN ROUND(jumlah_pinjaman / angsuran_per_bulan)
      ELSE GREATEST(jumlah_angsuran, 1)
    END
    WHERE jumlah_angsuran = 1
       OR jumlah_angsuran IS NULL
       OR jumlah_angsuran <= 0
  `);

  await executor.query(`
    UPDATE pinjaman
    SET tanggal_approval = tanggal_pengajuan
    WHERE tanggal_approval IS NULL
      AND status_pinjaman IN ('approved', 'berjalan', 'lunas')
  `);

  await bootstrapExistingLoanSchedules(executor);
  await realignLoanSchedulesToApprovalPeriod(executor);
}

export async function createEmployeeLoanRequest(payload: CreateLoanRequestPayload) {
  if (!Number.isInteger(payload.employeeId) || payload.employeeId <= 0) {
    throw new Error("Karyawan tidak valid.");
  }

  if (!Number.isFinite(payload.totalLoan) || payload.totalLoan <= 0) {
    throw new Error("Jumlah pinjaman harus lebih besar dari 0.");
  }

  if (!Number.isInteger(payload.installmentCount) || payload.installmentCount <= 0) {
    throw new Error("Jumlah angsuran harus minimal 1 kali.");
  }

  if (!isValidSqlDate(payload.requestDate)) {
    throw new Error("Tanggal pengajuan tidak valid.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureLoanSupportTables(connection);

    const [employeeRows] = await connection.query<LoanIdRow[]>(
      "SELECT id FROM karyawan WHERE id = ? LIMIT 1",
      [payload.employeeId],
    );

    if (!employeeRows[0]) {
      throw new Error("Data karyawan tidak ditemukan.");
    }

    const monthlyDeduction = roundMoney(payload.totalLoan / payload.installmentCount);

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO pinjaman (
          karyawan_id,
          jumlah_pinjaman,
          jumlah_angsuran,
          angsuran_per_bulan,
          total_sudah_bayar,
          sisa_pinjaman,
          tanggal_pengajuan,
          tanggal_approval,
          approved_by,
          status_pinjaman
        ) VALUES (?, ?, ?, ?, 0, ?, ?, NULL, NULL, 'pending')
      `,
      [
        payload.employeeId,
        roundMoney(payload.totalLoan),
        payload.installmentCount,
        monthlyDeduction,
        roundMoney(payload.totalLoan),
        payload.requestDate,
      ],
    );

    await connection.commit();

    return getLoanById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLoanRequest(
  loanId: number,
  payload: {
    employeeId: number;
    totalLoan: number;
    installmentCount: number;
    requestDate: string;
    customInstallments?: number[];
  },
) {
  if (!Number.isInteger(loanId) || loanId <= 0) {
    throw new Error("ID pinjaman tidak valid.");
  }
  if (!Number.isInteger(payload.employeeId) || payload.employeeId <= 0) {
    throw new Error("Karyawan tidak valid.");
  }
  if (!Number.isFinite(payload.totalLoan) || payload.totalLoan <= 0) {
    throw new Error("Jumlah pinjaman harus lebih besar dari 0.");
  }
  if (!Number.isInteger(payload.installmentCount) || payload.installmentCount <= 0) {
    throw new Error("Jumlah angsuran harus minimal 1 kali.");
  }
  if (!isValidSqlDate(payload.requestDate)) {
    throw new Error("Tanggal pengajuan tidak valid.");
  }

  // Kalau ada custom installments, validasi total harus = jumlah pinjaman
  if (payload.customInstallments) {
    if (payload.customInstallments.length !== payload.installmentCount) {
      throw new Error("Jumlah cicilan custom harus sama dengan jumlah angsuran.");
    }
    const sumCustom = payload.customInstallments.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
    const totalRounded = roundMoney(payload.totalLoan);
    if (Math.abs(sumCustom - totalRounded) > 1) {
      throw new Error(
        `Total cicilan custom (Rp ${sumCustom.toLocaleString("id-ID")}) tidak sama dengan jumlah pinjaman (Rp ${totalRounded.toLocaleString("id-ID")}).`,
      );
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureLoanSupportTables(connection);

    const [rows] = await connection.query<LoanIdentityRow[]>(
      `SELECT id, status_pinjaman, tanggal_approval FROM pinjaman WHERE id = ? LIMIT 1`,
      [loanId],
    );
    const loan = rows[0];
    if (!loan) {
      throw new Error("Pengajuan pinjaman tidak ditemukan.");
    }

    const monthlyDeduction = roundMoney(payload.totalLoan / payload.installmentCount);

    await connection.query<ResultSetHeader>(
      `
        UPDATE pinjaman
        SET karyawan_id = ?,
            jumlah_pinjaman = ?,
            jumlah_angsuran = ?,
            angsuran_per_bulan = ?,
            tanggal_pengajuan = ?
        WHERE id = ?
      `,
      [
        payload.employeeId,
        roundMoney(payload.totalLoan),
        payload.installmentCount,
        monthlyDeduction,
        payload.requestDate,
        loanId,
      ],
    );

    if (
      ["approved", "berjalan", "lunas"].includes(loan.status_pinjaman) &&
      loan.tanggal_approval
    ) {
      await rebuildLoanInstallments(
        loanId,
        roundMoney(payload.totalLoan),
        payload.installmentCount,
        loan.tanggal_approval,
        connection,
        payload.customInstallments,
      );
    }

    await syncLoanSummary(loanId, connection);
    await connection.commit();

    return getLoanById(loanId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteLoanRequest(loanId: number) {
  if (!Number.isInteger(loanId) || loanId <= 0) {
    throw new Error("ID pinjaman tidak valid.");
  }
  await ensureLoanSupportTables();
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM pinjaman WHERE id = ?`,
    [loanId],
  );
  if (result.affectedRows === 0) {
    throw new Error("Pengajuan pinjaman tidak ditemukan.");
  }
  return { id: loanId };
}

export async function approveLoanRequest(loanId: number, adminId?: number | null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureLoanSupportTables(connection);

    const [rows] = await connection.query<LoanIdentityRow[]>(
      `
        SELECT id, karyawan_id, jumlah_pinjaman, jumlah_angsuran, status_pinjaman
        FROM pinjaman
        WHERE id = ?
        LIMIT 1
      `,
      [loanId],
    );

    const loan = rows[0];

    if (!loan) {
      throw new Error("Pengajuan pinjaman tidak ditemukan.");
    }

    if (loan.status_pinjaman !== "pending") {
      throw new Error("Pengajuan pinjaman ini sudah diproses sebelumnya.");
    }

    const approvalDate = getJakartaTodaySqlDate();

    await connection.query<ResultSetHeader>(
      `
        UPDATE pinjaman
        SET status_pinjaman = 'approved', tanggal_approval = ?, approved_by = ?
        WHERE id = ?
      `,
      [approvalDate, adminId ?? null, loanId],
    );

    await rebuildLoanInstallments(
      loanId,
      toNumber(loan.jumlah_pinjaman),
      Math.max(loan.jumlah_angsuran, 1),
      approvalDate,
      connection,
    );

    await syncLoanSummary(loanId, connection);
    await connection.commit();

    return getLoanById(loanId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function payoffLoanEarly(loanId: number, payoffMonth: number, payoffYear: number) {
  if (!Number.isInteger(payoffMonth) || payoffMonth < 1 || payoffMonth > 12) {
    throw new Error("Bulan pelunasan tidak valid.");
  }
  if (!Number.isInteger(payoffYear) || payoffYear < 1970 || payoffYear > 9999) {
    throw new Error("Tahun pelunasan tidak valid.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureLoanSupportTables(connection);

    const [loanRows] = await connection.query<LoanIdentityRow[]>(
      `
        SELECT id, karyawan_id, jumlah_pinjaman, jumlah_angsuran, status_pinjaman
        FROM pinjaman
        WHERE id = ?
        LIMIT 1
      `,
      [loanId],
    );
    const loan = loanRows[0];
    if (!loan) {
      throw new Error("Pengajuan pinjaman tidak ditemukan.");
    }
    if (!["approved", "berjalan"].includes(loan.status_pinjaman)) {
      throw new Error("Pinjaman tidak bisa dilunasi karena status saat ini bukan approved/berjalan.");
    }

    const [installments] = await connection.query<LoanInstallmentRow[]>(
      `
        SELECT id, pinjaman_id, urutan_cicilan, bulan, tahun, nominal_potongan, nominal_terpotong, payroll_id
        FROM pinjaman_cicilan
        WHERE pinjaman_id = ?
        ORDER BY urutan_cicilan ASC
      `,
      [loanId],
    );

    const totalPaid = installments.reduce((sum, installment) => sum + toNumber(installment.nominal_terpotong), 0);
    const remaining = roundMoney(toNumber(loan.jumlah_pinjaman) - totalPaid);
    if (remaining <= 0) {
      throw new Error("Pinjaman sudah lunas.");
    }

    const unpaid = installments.filter((installment) => {
      const planned = toNumber(installment.nominal_potongan);
      const paid = toNumber(installment.nominal_terpotong);
      return !(installment.payroll_id && paid >= planned && planned > 0);
    });
    if (unpaid.length === 0) {
      throw new Error("Tidak ada cicilan tersisa untuk dilunasi.");
    }

    const target = unpaid.find((installment) => installment.bulan === payoffMonth && installment.tahun === payoffYear);
    if (!target) {
      throw new Error("Bulan pelunasan tidak ditemukan di jadwal cicilan yang belum terbayar.");
    }

    await connection.query<ResultSetHeader>(
      `UPDATE pinjaman_cicilan SET nominal_potongan = ? WHERE id = ?`,
      [remaining, target.id],
    );

    const otherUnpaidIds = unpaid.filter((installment) => installment.id !== target.id).map((installment) => installment.id);
    if (otherUnpaidIds.length > 0) {
      await connection.query<ResultSetHeader>(
        `UPDATE pinjaman_cicilan SET nominal_potongan = 0 WHERE id IN (?)`,
        [otherUnpaidIds],
      );
    }

    // Bersihkan override pinjaman stale agar payroll periode terkait baca cicilan terbaru.
    const [loanOwner] = await connection.query<(RowDataPacket & { karyawan_id: number })[]>(
      `SELECT karyawan_id FROM pinjaman WHERE id = ? LIMIT 1`,
      [loanId],
    );
    if (loanOwner[0]) {
      await connection.query<ResultSetHeader>(
        `
          UPDATE payroll_employee_input pei
          INNER JOIN payroll p ON p.id = pei.payroll_id
          SET pei.override_pinjaman = NULL
          WHERE p.karyawan_id = ?
        `,
        [loanOwner[0].karyawan_id],
      );
    }

    await syncLoanSummary(loanId, connection);
    await connection.commit();

    return getLoanById(loanId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function rejectLoanRequest(loanId: number) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureLoanSupportTables(connection);

    const [rows] = await connection.query<LoanIdentityRow[]>(
      `
        SELECT id, status_pinjaman
        FROM pinjaman
        WHERE id = ?
        LIMIT 1
      `,
      [loanId],
    );

    const loan = rows[0];

    if (!loan) {
      throw new Error("Pengajuan pinjaman tidak ditemukan.");
    }

    if (loan.status_pinjaman !== "pending") {
      throw new Error("Pengajuan pinjaman ini sudah diproses sebelumnya.");
    }

    await connection.query<ResultSetHeader>(
      `
        UPDATE pinjaman
        SET status_pinjaman = 'rejected',
            total_sudah_bayar = 0,
            sisa_pinjaman = jumlah_pinjaman,
            tanggal_approval = NULL,
            approved_by = NULL
        WHERE id = ?
      `,
      [loanId],
    );

    await connection.query<ResultSetHeader>(
      "DELETE FROM pinjaman_cicilan WHERE pinjaman_id = ?",
      [loanId],
    );

    await connection.commit();

    return getLoanById(loanId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getLoansBase(whereSql = "", params: Array<number | string> = []) {
  await ensureLoanSupportTables();

  const [loanRows, installmentRows] = await Promise.all([
    pool.query<LoanRow[]>(
      `
        SELECT
          p.id,
          k.id AS employee_id,
          k.nama AS employee_name,
          k.no_karyawan AS nip,
          k.jabatan AS role,
          k.departemen AS department,
          p.jumlah_pinjaman,
          p.jumlah_angsuran,
          p.angsuran_per_bulan,
          p.total_sudah_bayar,
          p.sisa_pinjaman,
          DATE_FORMAT(p.tanggal_pengajuan, '%Y-%m-%d') AS tanggal_pengajuan,
          DATE_FORMAT(p.tanggal_approval, '%Y-%m-%d') AS tanggal_approval,
          p.status_pinjaman
        FROM pinjaman p
        INNER JOIN karyawan k ON k.id = p.karyawan_id
        ${whereSql}
        ORDER BY p.created_at DESC, p.id DESC
      `,
      params,
    ),
    pool.query<LoanInstallmentRow[]>(
      `
        SELECT
          pc.id,
          pc.pinjaman_id,
          pc.urutan_cicilan,
          pc.bulan,
          pc.tahun,
          pc.nominal_potongan,
          pc.nominal_terpotong,
          pc.payroll_id
        FROM pinjaman_cicilan pc
        INNER JOIN pinjaman p ON p.id = pc.pinjaman_id
        ${whereSql}
        ORDER BY pc.tahun ASC, pc.bulan ASC, pc.urutan_cicilan ASC
      `,
      params,
    ),
  ]);

  if (!loanRows[0].length) {
    return [] as LoanListItem[];
  }

  return loanRows[0].map((row) => buildLoanItem(row, installmentRows[0]));
}

// Periode payroll aktif: tgl 26 (M-1) s/d 25 M; setelah tgl 25 pindah ke bulan berikutnya.
// Duplikat kecil dari getActivePayrollPeriod (payroll-admin.ts) untuk hindari circular import.
function getActiveLoanPayrollPeriod() {
  const today = getJakartaTodayIsoDate();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));
  if (day > 25) {
    return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
  }
  return { month, year };
}

type AutoAttachAffectedRow = RowDataPacket & { pinjaman_id: number };

// Auto-attach: selama karyawan ada di payroll suatu periode, cicilan periode itu
// otomatis tercatat terpotong tanpa perlu admin klik Simpan Payroll per karyawan.
// Mencakup SEMUA periode cicilan s/d (month, year) — backlog bulan lampau ikut tercatat.
// - Hanya mengisi cicilan yang BELUM ter-attach (hasil Simpan manual tidak disentuh)
// - Menghormati override_pinjaman eksplisit dari admin (skip kalau ada override)
// - Idempotent: cicilan yang sudah terisi tidak match kriteria lagi
export async function autoAttachLoanInstallmentsForPeriod(
  month: number,
  year: number,
  connection?: QueryExecutor,
) {
  const executor = connection ?? pool;
  await ensureLoanSupportTables(connection);

  const periodKey = year * 100 + month;
  // Hanya auto-catat cicilan untuk periode yang SUDAH TUTUP (< periode aktif berjalan).
  // Periode aktif yang masih berjalan tidak boleh ditandai lunas otomatis hanya karena
  // ada baris payroll (mis. hasil clone periode) — itu bikin pinjaman "tiba-tiba lunas"
  // dan menimpa hasil edit cicilan. Periode berjalan dicatat lewat Simpan Payroll manual.
  // Freelance tidak kena potongan pinjaman → tidak di-attach otomatis.
  const matchCriteria = `
      (pc.tahun * 100 + pc.bulan) < ?
      AND pc.payroll_id IS NULL
      AND pc.nominal_terpotong IS NULL
      AND pc.nominal_potongan > 0
      AND p.status_pinjaman IN ('approved', 'berjalan')
      AND pei.override_pinjaman IS NULL
      AND LOWER(COALESCE(k.status_kepegawaian, '')) <> 'freelance'
  `;

  const [affectedRows] = await executor.query<AutoAttachAffectedRow[]>(
    `
      SELECT DISTINCT pc.pinjaman_id
      FROM pinjaman_cicilan pc
      INNER JOIN pinjaman p ON p.id = pc.pinjaman_id
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      INNER JOIN payroll pay ON pay.karyawan_id = p.karyawan_id
        AND pay.periode_bulan = pc.bulan AND pay.periode_tahun = pc.tahun
      LEFT JOIN payroll_employee_input pei ON pei.payroll_id = pay.id
      WHERE ${matchCriteria}
    `,
    [periodKey],
  );

  if (!affectedRows.length) {
    return;
  }

  await executor.query<ResultSetHeader>(
    `
      UPDATE pinjaman_cicilan pc
      INNER JOIN pinjaman p ON p.id = pc.pinjaman_id
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      INNER JOIN payroll pay ON pay.karyawan_id = p.karyawan_id
        AND pay.periode_bulan = pc.bulan AND pay.periode_tahun = pc.tahun
      LEFT JOIN payroll_employee_input pei ON pei.payroll_id = pay.id
      SET pc.payroll_id = pay.id, pc.nominal_terpotong = pc.nominal_potongan
      WHERE ${matchCriteria}
    `,
    [periodKey],
  );

  await syncLoanSummariesByIds(affectedRows.map((row) => row.pinjaman_id), executor);
}

async function syncDueLoanStatusesForPeriod(month: number, year: number) {
  await ensureLoanSupportTables();

  const periodKey = year * 100 + month;
  const [rows] = await pool.query<AutoAttachAffectedRow[]>(
    `
      SELECT DISTINCT p.id AS pinjaman_id
      FROM pinjaman p
      INNER JOIN pinjaman_cicilan pc ON pc.pinjaman_id = p.id
      WHERE p.status_pinjaman = 'approved'
        AND pc.nominal_potongan > 0
        AND (pc.tahun * 100 + pc.bulan) <= ?
    `,
    [periodKey],
  );

  await syncLoanSummariesByIds(rows.map((row) => row.pinjaman_id));
}

export async function listAdminLoans() {
  // Periode berjalan mengubah status ke "berjalan" tanpa menandai cicilan sebagai terpotong.
  const active = getActiveLoanPayrollPeriod();
  await autoAttachLoanInstallmentsForPeriod(active.month, active.year);
  await syncDueLoanStatusesForPeriod(active.month, active.year);
  return getLoansBase("WHERE p.status_pinjaman <> 'rejected'");
}

export async function listEmployeeLoans(employeeId: number) {
  const active = getActiveLoanPayrollPeriod();
  await autoAttachLoanInstallmentsForPeriod(active.month, active.year);
  await syncDueLoanStatusesForPeriod(active.month, active.year);
  return getLoansBase("WHERE p.karyawan_id = ?", [employeeId]);
}

export async function getLoanById(loanId: number) {
  const rows = await getLoansBase("WHERE p.id = ?", [loanId]);
  return rows[0] ?? null;
}

export async function getLoanDeductionRowsForPeriod(
  employeeIds: number[],
  month: number,
  year: number,
) {
  await ensureLoanSupportTables();

  if (!employeeIds.length) {
    return [] as Array<{ employeeId: number; totalDeduction: string }>;
  }

  const placeholders = employeeIds.map(() => "?").join(", ");
  const [rows] = await pool.query<LoanDeductionPeriodRow[]>(
    `
      SELECT
        p.karyawan_id AS employee_id,
        COALESCE(SUM(pc.nominal_potongan), 0) AS total_deduction
      FROM pinjaman_cicilan pc
      INNER JOIN pinjaman p ON p.id = pc.pinjaman_id
      WHERE p.karyawan_id IN (${placeholders})
        AND pc.bulan = ?
        AND pc.tahun = ?
        AND p.status_pinjaman IN ('approved', 'berjalan', 'lunas')
      GROUP BY p.karyawan_id
    `,
    [...employeeIds, month, year],
  );

  return rows.map((row) => ({
    employeeId: row.employee_id,
    totalDeduction: row.total_deduction ?? "0",
  }));
}

export async function getLoanDeductionForPeriod(
  employeeId: number,
  month: number,
  year: number,
  connection?: QueryExecutor,
) {
  const executor = connection ?? pool;
  await ensureLoanSupportTables(connection);

  const [rows] = await executor.query<LoanDeductionPeriodRow[]>(
    `
      SELECT
        p.karyawan_id AS employee_id,
        COALESCE(SUM(pc.nominal_potongan), 0) AS total_deduction
      FROM pinjaman_cicilan pc
      INNER JOIN pinjaman p ON p.id = pc.pinjaman_id
      WHERE p.karyawan_id = ?
        AND pc.bulan = ?
        AND pc.tahun = ?
        AND p.status_pinjaman IN ('approved', 'berjalan', 'lunas')
      GROUP BY p.karyawan_id
    `,
    [employeeId, month, year],
  );

  return toNumber(rows[0]?.total_deduction);
}

export async function attachLoanInstallmentsToPayroll(
  employeeId: number,
  payrollId: number,
  month: number,
  year: number,
  actualDeduction: number,
  connection?: QueryExecutor,
) {
  const executor = connection ?? pool;
  await ensureLoanSupportTables(connection);

  const [previousRows] = await executor.query<(RowDataPacket & { pinjaman_id: number })[]>(
    `
      SELECT DISTINCT pinjaman_id
      FROM pinjaman_cicilan
      WHERE payroll_id = ?
    `,
    [payrollId],
  );

  await executor.query<ResultSetHeader>(
    `
      UPDATE pinjaman_cicilan
      SET payroll_id = NULL, nominal_terpotong = NULL
      WHERE payroll_id = ?
    `,
    [payrollId],
  );

  const [dueRows] = await executor.query<LoanInstallmentRow[]>(
    `
      SELECT
        pc.id,
        pc.pinjaman_id,
        pc.urutan_cicilan,
        pc.bulan,
        pc.tahun,
        pc.nominal_potongan,
        pc.nominal_terpotong,
        pc.payroll_id
      FROM pinjaman_cicilan pc
      INNER JOIN pinjaman p ON p.id = pc.pinjaman_id
      WHERE p.karyawan_id = ?
        AND pc.bulan = ?
        AND pc.tahun = ?
        AND p.status_pinjaman IN ('approved', 'berjalan', 'lunas')
      ORDER BY COALESCE(p.tanggal_approval, p.tanggal_pengajuan) ASC, p.id ASC, pc.urutan_cicilan ASC
    `,
    [employeeId, month, year],
  );

  let remainingDeduction = Math.max(roundMoney(actualDeduction), 0);
  const touchedLoanIds = [
    ...previousRows.map((row) => row.pinjaman_id),
    ...dueRows.map((row) => row.pinjaman_id),
  ];

  for (const row of dueRows) {
    const planned = toNumber(row.nominal_potongan);
    const paid = remainingDeduction > 0 ? roundMoney(Math.min(remainingDeduction, planned)) : 0;

    await executor.query<ResultSetHeader>(
      `
        UPDATE pinjaman_cicilan
        SET payroll_id = ?, nominal_terpotong = ?
        WHERE id = ?
      `,
      [paid > 0 ? payrollId : null, paid > 0 ? paid : null, row.id],
    );

    remainingDeduction = roundMoney(Math.max(remainingDeduction - paid, 0));
  }

  await syncLoanSummariesByIds(touchedLoanIds, executor);
}

export async function detachLoanInstallmentsFromPayroll(
  payrollId: number,
  connection?: QueryExecutor,
) {
  const executor = connection ?? pool;
  await ensureLoanSupportTables(connection);

  const [rows] = await executor.query<(RowDataPacket & { pinjaman_id: number })[]>(
    `
      SELECT DISTINCT pinjaman_id
      FROM pinjaman_cicilan
      WHERE payroll_id = ?
    `,
    [payrollId],
  );

  await executor.query<ResultSetHeader>(
    `
      UPDATE pinjaman_cicilan
      SET payroll_id = NULL, nominal_terpotong = NULL
      WHERE payroll_id = ?
    `,
    [payrollId],
  );

  await syncLoanSummariesByIds(rows.map((row) => row.pinjaman_id), executor);
}

export async function getEmployeeRemainingLoanTotal(employeeId: number) {
  await ensureLoanSupportTables();

  const [rows] = await pool.query<LoanRemainingAggregateRow[]>(
    `
      SELECT COALESCE(SUM(sisa_pinjaman), 0) AS remaining_total
      FROM pinjaman
      WHERE karyawan_id = ?
        AND status_pinjaman IN ('approved', 'berjalan')
    `,
    [employeeId],
  );

  return rows[0]?.remaining_total ?? "0";
}
