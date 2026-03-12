import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import {
  addMonthsToIsoDate,
  buildContractDeductionDescription,
  getContractDeductionNominalByRole,
  getFirstFiveContractPeriods,
  isContractDeductionActive,
} from "@/lib/contract-timeline";
import { pool } from "@/lib/db";

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
  annualRaise: string;
  description: string | null;
  isActive: boolean;
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
};

type ContractDeductionEmployeeIdentityRow = RowDataPacket & {
  employee_id: number;
  jabatan: string;
  tanggal_kontrak: string | null;
};

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
): ContractDeductionPlanItem | null {
  if (!employee.contractDate) {
    return null;
  }

  const periods = getFirstFiveContractPeriods(employee.contractDate);
  const employeeRows = rows.filter((row) => row.employeeId === employee.employeeId);
  const deductionEndDate = addMonthsToIsoDate(employee.contractDate, 5);

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
      employeeRows[0]?.nominalDeduction ?? String(getContractDeductionNominalByRole(employee.role)),
    annualRaise: employee.annualRaise,
    description: employeeRows[0]?.description ?? null,
    isActive: isContractDeductionActive(employee.contractDate),
    installments: periods.map((period) => {
      const matched = employeeRows.find(
        (row) => row.month === period.month && row.year === period.year,
      );

      return {
        id: matched?.id ?? null,
        sequence: period.sequence,
        month: period.month,
        year: period.year,
        monthLabel: period.monthLabel,
        nominalDeduction: matched?.nominalDeduction ?? null,
      };
    }),
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

export async function listContractDeductionEmployees() {
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
        k.status_kerja
      FROM karyawan k
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
  }));
}

export async function listContractDeductionPlans(options?: { activeOnly?: boolean }) {
  const [employees, rows] = await Promise.all([
    listContractDeductionEmployees(),
    listContractDeductions(),
  ]);

  const plans = employees.flatMap((employee) => {
    const plan = buildPlan(employee, rows);
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

  if (!payload.contractDate) {
    return null;
  }

  const periods = getFirstFiveContractPeriods(payload.contractDate);
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
    nominalDeduction: payload.nominalDeduction,
    description: payload.description,
  });

  return getContractDeductionPlanByEmployeeId(payload.employeeId);
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


