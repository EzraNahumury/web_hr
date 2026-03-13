import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { syncContractDeductionSchedule } from "@/lib/contract-deductions";
import { calculateContractEndDate, calculateEmploymentTimeline } from "@/lib/contract-timeline";
import { pool } from "@/lib/db";

export type EmployeeListItem = {
  id: number;
  userId: number;
  name: string;
  nip: string;
  email: string;
  passwordLabel: string;
  unit: string | null;
  role: string;
  department: string;
  division: string;
  subDivision: string | null;
  placement: string | null;
  recapGroup: string | null;
  bank: string | null;
  accountNumber: string | null;
  gender: "laki-laki" | "perempuan" | null;
  birthPlace: string | null;
  birthDate: string | null;
  nik: string | null;
  religion: string | null;
  addressKtp: string | null;
  addressCurrent: string | null;
  phoneNumber: string | null;
  ktpPhoto: string | null;
  employmentStatus: "training" | "tetap" | "kontrak" | "freelance";
  workStatus: "training" | "tetap" | "kontrak" | "freelance";
  dataStatus: "aktif" | "nonaktif";
  firstJoinDate: string | null;
  contractDate: string | null;
  contractEndDate: string | null;
  annualRaise: string;
  userActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LookupOption = {
  label: string;
  value: string;
};

export const EMPLOYEE_UNITS = ["AVA Sportivo", "Ayres Apparel", "JNE"] as const;
export const EMPLOYEE_ROLES = [
  "CEO",
  "Secretary",
  "Manager",
  "Supervisor",
  "Staff",
] as const;
export const EMPLOYEE_DEPARTMENTS = [
  "Produksi",
  "Penjualan",
  "Umum",
  "Logistik",
] as const;
export const EMPLOYEE_DIVISIONS = [
  "Produksi",
  "RnD",
  "Logistik",
  "Sales & Retail",
  "Marketing & Media",
  "Finance",
  "HRD",
  "Ekspedisi",
] as const;
export const EMPLOYEE_SUB_DIVISIONS = [
  "Admin Produksi",
  "Print",
  "Press",
  "Finishing",
  "Desain",
  "Quality Control",
  "Gudang Ayres",
  "RnD",
  "Bagian Umum",
  "Procesing",
  "Stok",
  "Sales",
  "Purchase",
  "Marketplace",
  "Customer Service",
  "Markom",
  "Media",
  "Advertiser",
  "Finance",
  "Pajak",
  "HRD",
  "Ekspedisi",
] as const;
export const EMPLOYEE_PLACEMENTS = [
  "Office",
  "Ayres",
  "Toko",
  "Gudang",
  "WFA",
  "JNE",
] as const;
export const EMPLOYEE_WORK_STATUSES = [
  "training",
  "kontrak",
  "tetap",
  "freelance",
] as const;

export type EmployeePayload = {
  name: string;
  nip: string;
  email: string;
  password: string | null;
  unit: string | null;
  role: string;
  department: string;
  division: string;
  subDivision: string | null;
  placement: string | null;
  recapGroup: string | null;
  bank: string | null;
  accountNumber: string | null;
  gender: "laki-laki" | "perempuan" | null;
  birthPlace: string | null;
  birthDate: string | null;
  nik: string | null;
  religion: string | null;
  addressKtp: string | null;
  addressCurrent: string | null;
  phoneNumber: string | null;
  ktpPhoto: string | null;
  employmentStatus: "training" | "tetap" | "kontrak" | "freelance";
  workStatus: "training" | "tetap" | "kontrak" | "freelance";
  dataStatus: "aktif" | "nonaktif";
  firstJoinDate: string | null;
  contractDate: string | null;
  contractEndDate: string | null;
  annualRaise: number;
  userActive: boolean;
};

type EmployeeRow = RowDataPacket & {
  id: number;
  user_id: number;
  nama: string;
  no_karyawan: string;
  email: string;
  unit: string | null;
  jabatan: string;
  departemen: string;
  divisi: string;
  sub_divisi: string | null;
  penempatan: string | null;
  pembagian_rekapan: string | null;
  bank: string | null;
  no_rekening: string | null;
  jenis_kelamin: EmployeeListItem["gender"];
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  nik: string | null;
  agama: string | null;
  alamat_ktp: string | null;
  alamat_rumah_kost: string | null;
  nomor_telepon: string | null;
  foto_ktp: string | null;
  status_kepegawaian: EmployeeListItem["employmentStatus"];
  status_kerja: EmployeeListItem["workStatus"];
  status_data: EmployeeListItem["dataStatus"];
  tanggal_masuk_pertama: string | null;
  tanggal_kontrak: string | null;
  tanggal_selesai_kontrak: string | null;
  kenaikan_tiap_tahun: string;
  status_aktif: number;
  created_at: string;
  updated_at: string;
};

type ValueRow = RowDataPacket & {
  value: string;
};

type CountRow = RowDataPacket & {
  total: number;
};

function mapEmployee(row: EmployeeRow): EmployeeListItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.nama,
    nip: row.no_karyawan,
    email: row.email,
    passwordLabel: "Tersimpan",
    unit: row.unit,
    role: row.jabatan,
    department: row.departemen,
    division: row.divisi,
    subDivision: row.sub_divisi,
    placement: row.penempatan,
    recapGroup: row.pembagian_rekapan,
    bank: row.bank,
    accountNumber: row.no_rekening,
    gender: row.jenis_kelamin,
    birthPlace: row.tempat_lahir,
    birthDate: row.tanggal_lahir,
    nik: row.nik,
    religion: row.agama,
    addressKtp: row.alamat_ktp,
    addressCurrent: row.alamat_rumah_kost,
    phoneNumber: row.nomor_telepon,
    ktpPhoto: row.foto_ktp,
    employmentStatus: row.status_kepegawaian,
    workStatus: row.status_kerja,
    dataStatus: row.status_data,
    firstJoinDate: row.tanggal_masuk_pertama,
    contractDate: row.tanggal_kontrak,
    contractEndDate: row.tanggal_selesai_kontrak,
    annualRaise: row.kenaikan_tiap_tahun,
    userActive: row.status_aktif === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchDistinctOptions(
  column:
    | "pembagian_rekapan"
    | "agama",
) {
  const [rows] = await pool.query<ValueRow[]>(
    `
      SELECT DISTINCT ${column} AS value
      FROM karyawan
      WHERE ${column} IS NOT NULL AND ${column} <> ''
      ORDER BY ${column} ASC
    `,
  );

  return rows.map((row) => ({
    label: row.value,
    value: row.value,
  }));
}

const employeeSelectQuery = `
  SELECT
    k.id,
    k.user_id,
    k.nama,
    k.no_karyawan,
    u.email,
    k.unit,
    k.jabatan,
    k.departemen,
    k.divisi,
    k.sub_divisi,
    k.penempatan,
    k.pembagian_rekapan,
    k.bank,
    k.no_rekening,
    k.jenis_kelamin,
    k.tempat_lahir,
    DATE_FORMAT(k.tanggal_lahir, '%Y-%m-%d') AS tanggal_lahir,
    k.nik,
    k.agama,
    k.alamat_ktp,
    k.alamat_rumah_kost,
    k.nomor_telepon,
    k.foto_ktp,
    k.status_kepegawaian,
    k.status_kerja,
    k.status_data,
    DATE_FORMAT(k.tanggal_masuk_pertama, '%Y-%m-%d') AS tanggal_masuk_pertama,
    DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
    DATE_FORMAT(k.tanggal_selesai_kontrak, '%Y-%m-%d') AS tanggal_selesai_kontrak,
    k.kenaikan_tiap_tahun,
    u.status_aktif,
    DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
    DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
  FROM karyawan k
  INNER JOIN users u ON u.id = k.user_id
`;

export async function listEmployees() {
  const [rows] = await pool.query<EmployeeRow[]>(
    `
      ${employeeSelectQuery}
      ORDER BY k.created_at DESC, k.id DESC
    `,
  );

  return rows.map(mapEmployee);
}

export async function getEmployeeById(id: number) {
  const [rows] = await pool.query<EmployeeRow[]>(
    `
      ${employeeSelectQuery}
      WHERE k.id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapEmployee(rows[0]) : null;
}

export async function getEmployeeLookups() {
  const [religions] = await Promise.all([fetchDistinctOptions("agama")]);

  return {
    units: EMPLOYEE_UNITS.map((value) => ({ label: value, value })),
    roles: EMPLOYEE_ROLES.map((value) => ({ label: value, value })),
    departments: EMPLOYEE_DEPARTMENTS.map((value) => ({ label: value, value })),
    divisions: EMPLOYEE_DIVISIONS.map((value) => ({ label: value, value })),
    subDivisions: EMPLOYEE_SUB_DIVISIONS.map((value) => ({ label: value, value })),
    placements: EMPLOYEE_PLACEMENTS.map((value) => ({ label: value, value })),
    recapGroups: [
      { label: "Logistik AVA", value: "Logistik AVA" },
      { label: "Penjualan AVA", value: "Penjualan AVA" },
      { label: "Umum AVA", value: "Umum AVA" },
      { label: "Produksi Ayres", value: "Produksi Ayres" },
      { label: "Penjualan Ayres", value: "Penjualan Ayres" },
      { label: "Umum Ayres", value: "Umum Ayres" },
    ],
    banks: [{ label: "BCA", value: "BCA" }],
    workStatuses: EMPLOYEE_WORK_STATUSES.map((value) => ({
      label:
        value === "training"
          ? "Training"
          : value === "kontrak"
            ? "Kontrak"
            : value === "tetap"
              ? "Tetap"
              : "Freelance",
      value,
    })),
    dataStatuses: [
      { label: "Aktif", value: "aktif" },
      { label: "Nonaktif", value: "nonaktif" },
    ],
    genders: [
      { label: "Laki-laki", value: "laki-laki" },
      { label: "Perempuan", value: "perempuan" },
    ],
    religions,
  };
}

export async function getEmployeeStats() {
  const [employeeRows, contractRows, activeLoanRows] = await Promise.all([
    pool.query<CountRow[]>("SELECT COUNT(*) AS total FROM karyawan"),
    pool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM karyawan WHERE status_kepegawaian = 'kontrak'",
    ),
    pool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM pinjaman WHERE status_pinjaman IN ('approved', 'berjalan')",
    ),
  ]);

  return {
    totalEmployees: employeeRows[0][0]?.total ?? 0,
    totalContract: contractRows[0][0]?.total ?? 0,
    activeLoans: activeLoanRows[0][0]?.total ?? 0,
  };
}

function resolveEmployeeTimeline(
  payload: EmployeePayload,
  options: { allowManualContractDates: boolean },
) {
  if (!payload.firstJoinDate) {
    throw new Error("Tanggal pertama masuk wajib diisi.");
  }

  const timeline = calculateEmploymentTimeline(payload.firstJoinDate);

  if (!timeline) {
    throw new Error("Tanggal pertama masuk tidak valid.");
  }

  if (!options.allowManualContractDates) {
    return {
      firstJoinDate: payload.firstJoinDate,
      contractDate: timeline.contractDate,
      contractEndDate: timeline.contractEndDate,
    };
  }

  const contractDate = payload.contractDate ?? timeline.contractDate;
  const contractEndDate =
    payload.contractEndDate ??
    (contractDate ? calculateContractEndDate(contractDate) : null) ??
    timeline.contractEndDate;

  return {
    firstJoinDate: payload.firstJoinDate,
    contractDate,
    contractEndDate,
  };
}

export async function insertEmployee(payload: EmployeePayload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const resolvedTimeline = resolveEmployeeTimeline(payload, { allowManualContractDates: false });

    const [userResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO users (nama, email, password, role, status_aktif)
        VALUES (?, ?, SHA2(?, 256), 'karyawan', ?)
      `,
      [payload.name, payload.email, payload.password, payload.userActive ? 1 : 0],
    );

    const userId = userResult.insertId;

    const [employeeResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO karyawan (
          user_id,
          no_karyawan,
          nama,
          unit,
          jabatan,
          departemen,
          divisi,
          sub_divisi,
          penempatan,
          pembagian_rekapan,
          bank,
          no_rekening,
          jenis_kelamin,
          tempat_lahir,
          tanggal_lahir,
          nik,
          agama,
          alamat_ktp,
          alamat_rumah_kost,
          nomor_telepon,
          foto_ktp,
          status_kepegawaian,
          status_kerja,
          status_data,
          tanggal_masuk_pertama,
          tanggal_kontrak,
          tanggal_selesai_kontrak,
          kenaikan_tiap_tahun
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        payload.nip,
        payload.name,
        payload.unit,
        payload.role,
        payload.department,
        payload.division,
        payload.subDivision,
        payload.placement,
        payload.recapGroup,
        payload.bank,
        payload.accountNumber,
        payload.gender,
        payload.birthPlace,
        payload.birthDate,
        payload.nik,
        payload.religion,
        payload.addressKtp,
        payload.addressCurrent,
        payload.phoneNumber,
        payload.ktpPhoto,
        payload.employmentStatus,
        payload.workStatus,
        payload.dataStatus,
        resolvedTimeline.firstJoinDate,
        resolvedTimeline.contractDate,
        resolvedTimeline.contractEndDate,
        payload.annualRaise,
      ],
    );

    await syncContractDeductionSchedule(
      {
        employeeId: employeeResult.insertId,
        role: payload.role,
        contractDate: resolvedTimeline.contractDate,
      },
      connection,
    );

    await connection.commit();

    return getEmployeeById(employeeResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployee(id: number, payload: EmployeePayload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const resolvedTimeline = resolveEmployeeTimeline(payload, { allowManualContractDates: true });

    const [existingRows] = await connection.query<(RowDataPacket & { user_id: number })[]>(
      "SELECT user_id FROM karyawan WHERE id = ? LIMIT 1",
      [id],
    );

    const existing = existingRows[0];

    if (!existing) {
      await connection.rollback();
      return null;
    }

    if (payload.password) {
      await connection.query(
        `
          UPDATE users
          SET nama = ?, email = ?, password = SHA2(?, 256), status_aktif = ?
          WHERE id = ?
        `,
        [
          payload.name,
          payload.email,
          payload.password,
          payload.userActive ? 1 : 0,
          existing.user_id,
        ],
      );
    } else {
      await connection.query(
        `
          UPDATE users
          SET nama = ?, email = ?, status_aktif = ?
          WHERE id = ?
        `,
        [payload.name, payload.email, payload.userActive ? 1 : 0, existing.user_id],
      );
    }

    await connection.query(
      `
        UPDATE karyawan
        SET
          no_karyawan = ?,
          nama = ?,
          unit = ?,
          jabatan = ?,
          departemen = ?,
          divisi = ?,
          sub_divisi = ?,
          penempatan = ?,
          pembagian_rekapan = ?,
          bank = ?,
          no_rekening = ?,
          jenis_kelamin = ?,
          tempat_lahir = ?,
          tanggal_lahir = ?,
          nik = ?,
          agama = ?,
          alamat_ktp = ?,
          alamat_rumah_kost = ?,
          nomor_telepon = ?,
          foto_ktp = ?,
          status_kepegawaian = ?,
          status_kerja = ?,
          status_data = ?,
          tanggal_masuk_pertama = ?,
          tanggal_kontrak = ?,
          tanggal_selesai_kontrak = ?,
          kenaikan_tiap_tahun = ?
        WHERE id = ?
      `,
      [
        payload.nip,
        payload.name,
        payload.unit,
        payload.role,
        payload.department,
        payload.division,
        payload.subDivision,
        payload.placement,
        payload.recapGroup,
        payload.bank,
        payload.accountNumber,
        payload.gender,
        payload.birthPlace,
        payload.birthDate,
        payload.nik,
        payload.religion,
        payload.addressKtp,
        payload.addressCurrent,
        payload.phoneNumber,
        payload.ktpPhoto,
        payload.employmentStatus,
        payload.workStatus,
        payload.dataStatus,
        resolvedTimeline.firstJoinDate,
        resolvedTimeline.contractDate,
        resolvedTimeline.contractEndDate,
        payload.annualRaise,
        id,
      ],
    );

    await syncContractDeductionSchedule(
      {
        employeeId: id,
        role: payload.role,
        contractDate: resolvedTimeline.contractDate,
      },
      connection,
    );

    await connection.commit();

    return getEmployeeById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEmployee(id: number) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query<(RowDataPacket & { user_id: number })[]>(
      "SELECT user_id FROM karyawan WHERE id = ? LIMIT 1",
      [id],
    );

    const existing = existingRows[0];

    if (!existing) {
      await connection.rollback();
      return false;
    }

    await connection.query("DELETE FROM karyawan WHERE id = ?", [id]);
    await connection.query("DELETE FROM users WHERE id = ?", [existing.user_id]);

    await connection.commit();

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
