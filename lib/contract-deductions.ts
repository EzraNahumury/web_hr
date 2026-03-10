import { ResultSetHeader, RowDataPacket } from "mysql2";

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
  contractDate: string | null;
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
  contractDate: string | null;
  annualRaise: string;
  description: string | null;
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
  tanggal_kontrak: string | null;
  kenaikan_tiap_tahun: string;
  status_kerja: string;
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
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        k.kenaikan_tiap_tahun
        ,
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
      contractDate: row.tanggal_kontrak,
      annualRaise: row.kenaikan_tiap_tahun,
      workStatus: row.status_kerja,
    }));
}

function addMonths(date: Date, count: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
}

function getMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(year, month - 1, 1));
}

function getFirstFiveContractPeriods(contractDate: string) {
  const [yearRaw, monthRaw] = contractDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const start = new Date(year, month - 1, 1);

  return Array.from({ length: 5 }, (_, index) => {
    const period = addMonths(start, index);
    return {
      sequence: index + 1,
      month: period.getMonth() + 1,
      year: period.getFullYear(),
      monthLabel: getMonthLabel(period.getMonth() + 1, period.getFullYear()),
    };
  });
}

export async function listContractDeductionPlans() {
  const [employees, rows] = await Promise.all([
    listContractDeductionEmployees(),
    listContractDeductions(),
  ]);

  return employees
    .filter((employee) => employee.contractDate)
    .map<ContractDeductionPlanItem>((employee) => {
      const periods = getFirstFiveContractPeriods(employee.contractDate!);
      const employeeRows = rows.filter((row) => row.employeeId === employee.employeeId);

      return {
        employeeId: employee.employeeId,
        employeeName: employee.name,
        nip: employee.nip,
        role: employee.role,
        division: employee.division,
        department: employee.department,
        contractDate: employee.contractDate,
        annualRaise: employee.annualRaise,
        description: employeeRows[0]?.description ?? null,
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
      };
    });
}

export async function getContractDeductionPlanByEmployeeId(employeeId: number) {
  const plans = await listContractDeductionPlans();
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

export async function insertContractDeduction(payload: ContractDeductionPayload) {
  const [employees] = await pool.query<ContractDeductionEmployeeRow[]>(
    `
      SELECT
        k.id AS employee_id,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak
      FROM karyawan k
      WHERE k.id = ?
      LIMIT 1
    `,
    [payload.employeeId],
  );

  const employee = employees[0];

  if (!employee?.tanggal_kontrak) {
    throw new Error("Karyawan belum memiliki tanggal kontrak.");
  }

  const periods = getFirstFiveContractPeriods(employee.tanggal_kontrak);

  for (const period of periods) {
    await pool.query<ResultSetHeader>(
      `
        INSERT INTO potongan_kontrak (
          karyawan_id,
          bulan,
          tahun,
          nominal_potongan,
          keterangan
        )
        SELECT ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1
          FROM potongan_kontrak
          WHERE karyawan_id = ? AND bulan = ? AND tahun = ?
        )
      `,
      [
        payload.employeeId,
        period.month,
        period.year,
        payload.nominalDeduction,
        payload.description ?? `Potongan kontrak bulan ke-${period.sequence} dari 5`,
        payload.employeeId,
        period.month,
        period.year,
      ],
    );
  }

  return listContractDeductionPlans().then((plans) =>
    plans.find((plan) => plan.employeeId === payload.employeeId) ?? null,
  );
}

export async function updateContractDeduction(id: number, payload: ContractDeductionPayload) {
  const [employees] = await pool.query<ContractDeductionEmployeeRow[]>(
    `
      SELECT
        k.id AS employee_id,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak
      FROM karyawan k
      WHERE k.id = ?
      LIMIT 1
    `,
    [id],
  );

  const employee = employees[0];

  if (!employee?.tanggal_kontrak) {
    throw new Error("Karyawan belum memiliki tanggal kontrak.");
  }

  const periods = getFirstFiveContractPeriods(employee.tanggal_kontrak);

  for (const period of periods) {
    await pool.query<ResultSetHeader>(
      `
        UPDATE potongan_kontrak
        SET nominal_potongan = ?, keterangan = ?
        WHERE karyawan_id = ? AND bulan = ? AND tahun = ?
      `,
      [
        payload.nominalDeduction,
        payload.description ?? `Potongan kontrak bulan ke-${period.sequence} dari 5`,
        id,
        period.month,
        period.year,
      ],
    );
  }

  return listContractDeductionPlans().then((plans) =>
    plans.find((plan) => plan.employeeId === id) ?? null,
  );
}

export async function deleteContractDeduction(id: number) {
  const [employees] = await pool.query<ContractDeductionEmployeeRow[]>(
    `
      SELECT
        k.id AS employee_id,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak
      FROM karyawan k
      WHERE k.id = ?
      LIMIT 1
    `,
    [id],
  );

  const employee = employees[0];

  if (!employee?.tanggal_kontrak) {
    return false;
  }

  const periods = getFirstFiveContractPeriods(employee.tanggal_kontrak);
  let affectedRows = 0;

  for (const period of periods) {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM potongan_kontrak WHERE karyawan_id = ? AND bulan = ? AND tahun = ?",
      [id, period.month, period.year],
    );

    affectedRows += result.affectedRows;
  }

  return affectedRows > 0;
}
