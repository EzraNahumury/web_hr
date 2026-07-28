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
  extraPlacements: string[];
  recapGroup: string | null;
  costAllocation: string | null;
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
  employmentStatus: "training" | "tetap" | "kontrak" | "freelance" | "partime";
  workStatus: "training" | "tetap" | "kontrak" | "freelance" | "partime";
  dataStatus: "aktif" | "nonaktif";
  firstJoinDate: string | null;
  contractDate: string | null;
  contractEndDate: string | null;
  annualRaise: string;
  userActive: boolean;
  penjahitPayrollType: "mingguan" | "bulanan" | null;
  freelanceTipePayroll: "jam" | "pengerjaan" | "custom_pengerjaan" | "harian" | null;
  isShift: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LookupOption = {
  label: string;
  value: string;
};

export const EMPLOYEE_UNITS = ["AVA Sportivo", "Ayres Apparel", "Ayres Solo", "JNE"] as const;
export const EMPLOYEE_ROLES = [
  "CEO",
  "Secretary",
  "Manager",
  "Supervisor",
  "Staff",
  "Staff Senior",
  "Freelance",
  "Sales Area",
  "Sales Nasional",
  "Organizational Development Officer",
] as const;
export const EMPLOYEE_DEPARTMENTS = [
  "Secretary",
  "HRD",
  "Finance",
  "Operasional",
  "Marketing",
  "Ekspedisi",
  "Business Relation",
  "AI",
  "OD",
] as const;

export const DEPARTMENT_CODES: Record<string, string> = {
  Secretary: "SC",
  HRD: "HRD",
  Finance: "FC",
  Operasional: "OP",
  Marketing: "MR",
  Ekspedisi: "EKS",
  "Business Relation": "BR",
  AI: "AI",
  OD: "OD",
};

export const DIVISION_CODES: Record<string, string> = {
  Produksi: "PRO",
  RnD: "RND",
  Logistik: "LOG",
  "Sales & Retail": "SR",
  "Marketing & Media": "MM",
  Finance: "FC",
  HRD: "HRD",
  Ekspedisi: "EKS",
  AI: "AI",
  OD: "OD",
  "Business Relation": "BR",
};
export const EMPLOYEE_DIVISIONS = [
  "Produksi",
  "RnD",
  "Logistik",
  "Sales & Retail",
  "Marketing & Media",
  "Finance",
  "HRD",
  "Ekspedisi",
  "AI",
  "OD",
  "Business Relation",
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
  "Hostlive",
  "Penjahit",
] as const;
export const EMPLOYEE_PLACEMENTS = [
  "Office",
  "Ayres",
  "Toko",
  "Toko Solo",
  "Gudang",
  "WFA",
  "JNE",
  "Bank BCA KC Adisucipto",
] as const;
export const EMPLOYEE_WORK_STATUSES = [
  "training",
  "kontrak",
  "tetap",
  "freelance",
  "partime",
] as const;
export const EMPLOYEE_RELIGIONS = [
  "Islam",
  "Kristen",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
] as const;
export const EMPLOYEE_COST_ALLOCATIONS = [
  "produksi ava",
  "penjualan ava",
  "umum ava",
  "produksi ayres",
  "penjualan ayres",
  "umum ayres",
  "tidak keduanya",
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
  extraPlacements?: string[];
  recapGroup: string | null;
  costAllocation: string | null;
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
  employmentStatus: "training" | "tetap" | "kontrak" | "freelance" | "partime";
  workStatus: "training" | "tetap" | "kontrak" | "freelance" | "partime";
  dataStatus: "aktif" | "nonaktif";
  firstJoinDate: string | null;
  contractDate: string | null;
  contractEndDate: string | null;
  annualRaise: number;
  userActive: boolean;
  penjahitPayrollType: "mingguan" | "bulanan" | null;
  freelanceTipePayroll: "jam" | "pengerjaan" | "custom_pengerjaan" | "harian" | null;
  isShift: boolean;
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
  pembebanan: string | null;
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
  tipe_payroll_penjahit: "mingguan" | "bulanan" | null;
  tipe_freelance: "jam" | "pengerjaan" | "custom_pengerjaan" | "harian" | null;
  penempatan_extra: string | null;
  is_shift: number;
  status_aktif: number;
  created_at: string;
  updated_at: string;
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
    extraPlacements: row.penempatan_extra
      ? row.penempatan_extra.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    recapGroup: row.pembagian_rekapan,
    costAllocation: row.pembebanan,
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
    penjahitPayrollType: row.tipe_payroll_penjahit ?? null,
    freelanceTipePayroll: row.tipe_freelance ?? null,
    isShift: row.is_shift === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    k.penempatan_extra,
    k.is_shift,
    k.pembagian_rekapan,
    k.pembebanan,
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
    k.tipe_payroll_penjahit,
    k.tipe_freelance,
    u.status_aktif,
    DATE_FORMAT(k.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
    DATE_FORMAT(k.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
  FROM karyawan k
  INNER JOIN users u ON u.id = k.user_id
`;

let employeeSchemaReady: Promise<void> | null = null;

export async function ensureEmployeeSchemaSupport() {
  if (!employeeSchemaReady) {
    employeeSchemaReady = (async () => {
      const safeMigrate = async (sql: string) => {
        try {
          await pool.query(sql);
        } catch (error: unknown) {
          if (!(typeof error === "object" && error !== null && "code" in error) || (error.code !== "ER_DUP_FIELDNAME" && error.code !== "ER_BAD_FIELD_ERROR")) {
            throw error;
          }
        }
      };

      await safeMigrate(
        `ALTER TABLE karyawan ADD COLUMN pembebanan VARCHAR(100) NULL AFTER pembagian_rekapan`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan MODIFY COLUMN jabatan VARCHAR(100) NULL`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan MODIFY COLUMN departemen VARCHAR(100) NULL`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan MODIFY COLUMN divisi VARCHAR(100) NULL`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan MODIFY COLUMN no_karyawan VARCHAR(50) NULL`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan MODIFY COLUMN status_kepegawaian ENUM('training','kontrak','tetap','freelance','partime','magang','resign') NOT NULL DEFAULT 'kontrak'`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan MODIFY COLUMN status_kerja ENUM('training','kontrak','tetap','freelance','partime','magang','resign') NOT NULL DEFAULT 'kontrak'`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan ADD COLUMN tipe_payroll_penjahit ENUM('mingguan','bulanan') NULL AFTER jabatan`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan ADD COLUMN tipe_freelance ENUM('jam','pengerjaan','custom_pengerjaan','harian') NULL AFTER tipe_payroll_penjahit`,
      );
      await safeMigrate(
        `ALTER TABLE karyawan ADD COLUMN penempatan_extra VARCHAR(500) NULL AFTER penempatan`,
      );
      // Flag "Shift": karyawan yang ikut Set Jadwal (Bagan + Master). Backfill HANYA saat kolom
      // baru dibuat (deploy pertama) supaya uncheck manual admin tidak tertimpa di restart berikut.
      {
        let isShiftJustAdded = false;
        try {
          await pool.query(
            `ALTER TABLE karyawan ADD COLUMN is_shift TINYINT(1) NOT NULL DEFAULT 0 AFTER penempatan_extra`,
          );
          isShiftJustAdded = true;
        } catch (error: unknown) {
          const code = typeof error === "object" && error !== null && "code" in error ? (error as { code: string }).code : "";
          if (code !== "ER_DUP_FIELDNAME") throw error;
        }
        if (isShiftJustAdded) {
          await pool.query(
            `UPDATE karyawan SET is_shift = 1
              WHERE penempatan IN ('Toko','Gudang','JNE')
                 OR LOWER(COALESCE(sub_divisi,'')) IN ('media','hostlive','advertiser')`,
          );
        }
      }
      // Flag "Editor Jadwal": karyawan yang diberi izin akses Set Jadwal (Perizinan Akses).
      await safeMigrate(
        `ALTER TABLE karyawan ADD COLUMN jadwal_editor TINYINT(1) NOT NULL DEFAULT 0 AFTER is_shift`,
      );
      // Tanggal karyawan di-nonaktifkan (resign). Dipakai filter Summary Payroll:
      // karyawan nonaktif tetap muncul di periode SEBELUM resign, hilang dari periode resign & seterusnya.
      await safeMigrate(
        `ALTER TABLE karyawan ADD COLUMN tanggal_nonaktif DATE NULL DEFAULT NULL AFTER status_data`,
      );
      // Backfill perkiraan tanggal resign utk yang SUDAH nonaktif (pakai tanggal edit terakhir).
      await safeMigrate(
        `UPDATE karyawan SET tanggal_nonaktif = DATE(updated_at) WHERE status_data = 'nonaktif' AND tanggal_nonaktif IS NULL`,
      );

      // One-time data migration: pindahin karyawan jabatan="Penjahit" ke sub_divisi="Penjahit".
      // Jabatan diisi "Staff" default (admin bisa override manual via form).
      try {
        await pool.query(
          `
            UPDATE karyawan
            SET sub_divisi = 'Penjahit',
                jabatan = 'Staff'
            WHERE LOWER(jabatan) = 'penjahit'
          `,
        );
      } catch (error) {
        console.error("Migration warning karyawan penjahit jabatan -> sub_divisi:", error);
      }

      // One-time data migration: regenerate semua NIP karyawan ke format
      // {DEPT_CODE}.{DIV_CODE}.{TAHUN_MASUK}.{0001}.
      try {
        await pool.query(
          `
            CREATE TABLE IF NOT EXISTS hris_migration_log (
              migration_key VARCHAR(150) PRIMARY KEY,
              applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `,
        );

        const [logRows] = await pool.query<(RowDataPacket & { migration_key: string })[]>(
          `SELECT migration_key FROM hris_migration_log WHERE migration_key = ? LIMIT 1`,
          ["nip_auto_format_v1"],
        );

        if (logRows.length === 0) {
          const [karyawanRows] = await pool.query<
            (RowDataPacket & {
              id: number;
              departemen: string | null;
              divisi: string | null;
              tanggal_masuk_pertama: string | null;
            })[]
          >(
            `
              SELECT id, departemen, divisi,
                     DATE_FORMAT(tanggal_masuk_pertama, '%Y-%m-%d') AS tanggal_masuk_pertama
              FROM karyawan
              ORDER BY departemen ASC, divisi ASC, tanggal_masuk_pertama ASC, id ASC
            `,
          );

          const groupCounter = new Map<string, number>();
          const currentYear = String(new Date().getFullYear());

          for (const row of karyawanRows) {
            const deptCode = DEPARTMENT_CODES[row.departemen ?? ""] ?? "XX";
            const divCode = DIVISION_CODES[row.divisi ?? ""] ?? "XX";
            const year =
              row.tanggal_masuk_pertama && /^\d{4}/.test(row.tanggal_masuk_pertama)
                ? row.tanggal_masuk_pertama.slice(0, 4)
                : currentYear;
            const prefix = `${deptCode}.${divCode}.${year}`;
            const nextSeq = (groupCounter.get(prefix) ?? 0) + 1;
            groupCounter.set(prefix, nextSeq);
            const newNip = `${prefix}.${String(nextSeq).padStart(4, "0")}`;

            await pool.query(`UPDATE karyawan SET no_karyawan = ? WHERE id = ?`, [
              newNip,
              row.id,
            ]);
          }

          await pool.query(
            `INSERT INTO hris_migration_log (migration_key) VALUES (?)`,
            ["nip_auto_format_v1"],
          );
        }
      } catch (error) {
        console.error("Migration warning karyawan NIP regenerate:", error);
      }
    })();
  }

  await employeeSchemaReady;
}


// Cek apakah karyawan berada di departemen HRD (untuk aturan read-only data HRD).
export async function isEmployeeInHrd(employeeId: number): Promise<boolean> {
  if (!Number.isInteger(employeeId) || employeeId <= 0) return false;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM karyawan WHERE id = ? AND LOWER(TRIM(COALESCE(departemen, ''))) = 'hrd' LIMIT 1`,
    [employeeId],
  );
  return rows.length > 0;
}

// Cek apakah pemilik record absensi (by id) berada di departemen HRD.
export async function isAttendanceOwnerHrd(absensiId: number): Promise<boolean> {
  if (!Number.isInteger(absensiId) || absensiId <= 0) return false;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM absensi a
       INNER JOIN karyawan k ON k.id = a.karyawan_id
     WHERE a.id = ? AND LOWER(TRIM(COALESCE(k.departemen, ''))) = 'hrd' LIMIT 1`,
    [absensiId],
  );
  return rows.length > 0;
}

export async function listEmployees() {
  await ensureEmployeeSchemaSupport();
  const [rows] = await pool.query<EmployeeRow[]>(
    `
      ${employeeSelectQuery}
      ORDER BY k.nama ASC, k.id ASC
    `,
  );

  return rows.map(mapEmployee);
}

export async function getEmployeeById(id: number) {
  await ensureEmployeeSchemaSupport();
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
  await ensureEmployeeSchemaSupport();

  return {
    units: EMPLOYEE_UNITS.map((value) => ({ label: value, value })),
    roles: EMPLOYEE_ROLES.map((value) => ({ label: value, value })),
    departments: EMPLOYEE_DEPARTMENTS.map((value) => ({ label: value, value })),
    divisions: EMPLOYEE_DIVISIONS.map((value) => ({ label: value, value })),
    subDivisions: EMPLOYEE_SUB_DIVISIONS.map((value) => ({ label: value, value })),
    placements: EMPLOYEE_PLACEMENTS.map((value) => ({ label: value, value })),
    costAllocations: EMPLOYEE_COST_ALLOCATIONS.map((value) => ({
      label: value.replace(/\b\w/g, (char) => char.toUpperCase()),
      value,
    })),
    banks: [{ label: "BCA", value: "BCA" }],
    workStatuses: EMPLOYEE_WORK_STATUSES.map((value) => ({
      label:
        value === "training"
          ? "Training"
          : value === "kontrak"
            ? "Kontrak"
            : value === "tetap"
              ? "Tetap"
              : value === "freelance"
                ? "Freelance"
                : "Partime",
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
    religions: EMPLOYEE_RELIGIONS.map((value) => ({ label: value, value })),
  };
}

export async function getEmployeeStats() {
  await ensureEmployeeSchemaSupport();
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

type NipExecutor = {
  query: <T extends RowDataPacket[]>(sql: string, values?: unknown[]) => Promise<[T, unknown]>;
};

async function generateNextNip(
  department: string | null,
  division: string | null,
  firstJoinDate: string | null,
  executor: NipExecutor,
): Promise<string> {
  const deptCode = DEPARTMENT_CODES[department ?? ""] ?? "XX";
  const divCode = DIVISION_CODES[division ?? ""] ?? "XX";
  const year = (() => {
    if (firstJoinDate && /^\d{4}-\d{2}-\d{2}$/.test(firstJoinDate)) {
      return firstJoinDate.slice(0, 4);
    }
    return String(new Date().getFullYear());
  })();
  const prefix = `${deptCode}.${divCode}.${year}.`;

  const [rows] = await executor.query<(RowDataPacket & { max_seq: number | null })[]>(
    `
      SELECT MAX(CAST(SUBSTRING_INDEX(no_karyawan, '.', -1) AS UNSIGNED)) AS max_seq
      FROM karyawan
      WHERE no_karyawan LIKE ?
    `,
    [`${prefix}%`],
  );

  const lastSeq = rows[0]?.max_seq ?? 0;
  const nextSeq = Number(lastSeq) + 1;
  const seqPadded = String(nextSeq).padStart(4, "0");

  return `${prefix}${seqPadded}`;
}

export async function insertEmployee(payload: EmployeePayload) {
  await ensureEmployeeSchemaSupport();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const resolvedTimeline = resolveEmployeeTimeline(payload, { allowManualContractDates: false });

    const generatedNip = await generateNextNip(
      payload.department,
      payload.division,
      resolvedTimeline.firstJoinDate,
      connection as unknown as NipExecutor,
    );

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
          penempatan_extra,
          pembagian_rekapan,
          pembebanan,
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
          tanggal_nonaktif,
          tanggal_masuk_pertama,
          tanggal_kontrak,
          tanggal_selesai_kontrak,
          kenaikan_tiap_tahun,
          tipe_payroll_penjahit,
          tipe_freelance,
          is_shift
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'nonaktif' THEN CURDATE() ELSE NULL END, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        generatedNip,
        payload.name,
        payload.unit,
        payload.role,
        payload.department,
        payload.division,
        payload.subDivision,
        payload.placement,
        payload.extraPlacements?.filter(Boolean).join(",") || null,
        payload.recapGroup,
        payload.costAllocation,
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
        payload.dataStatus,
        resolvedTimeline.firstJoinDate,
        resolvedTimeline.contractDate,
        resolvedTimeline.contractEndDate,
        payload.annualRaise,
        payload.penjahitPayrollType ?? null,
        payload.freelanceTipePayroll ?? null,
        payload.isShift ? 1 : 0,
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
  await ensureEmployeeSchemaSupport();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const resolvedTimeline = resolveEmployeeTimeline(payload, { allowManualContractDates: true });

    const [existingRows] = await connection.query<
      (RowDataPacket & { user_id: number; no_karyawan: string | null })[]
    >(
      "SELECT user_id, no_karyawan FROM karyawan WHERE id = ? LIMIT 1",
      [id],
    );

    const existing = existingRows[0];

    if (!existing) {
      await connection.rollback();
      return null;
    }

    // Pastikan NIP terisi. Jika payload kosong, pakai NIP lama; kalau lama juga kosong,
    // auto-generate (cegah unique conflict pada empty string no_karyawan).
    let finalNip = (payload.nip ?? "").trim();
    if (!finalNip) {
      const existingNip = (existing.no_karyawan ?? "").trim();
      if (existingNip) {
        finalNip = existingNip;
      } else {
        finalNip = await generateNextNip(
          payload.department,
          payload.division,
          resolvedTimeline.firstJoinDate,
          connection as unknown as NipExecutor,
        );
      }
    }

    // Jika NIP mengandung segmen "XX" dan prefix baru berbeda (dept/divisi sudah terisi),
    // regenerate agar NIP mencerminkan data terkini.
    if (finalNip.split(".").includes("XX")) {
      const newDeptCode = DEPARTMENT_CODES[payload.department ?? ""] ?? "XX";
      const newDivCode = DIVISION_CODES[payload.division ?? ""] ?? "XX";
      const firstJoinYear =
        resolvedTimeline.firstJoinDate?.slice(0, 4) ?? String(new Date().getFullYear());
      const newPrefix = `${newDeptCode}.${newDivCode}.${firstJoinYear}`;
      const currentPrefix = finalNip.split(".").slice(0, 3).join(".");
      if (newPrefix !== currentPrefix) {
        finalNip = await generateNextNip(
          payload.department,
          payload.division,
          resolvedTimeline.firstJoinDate,
          connection as unknown as NipExecutor,
        );
      }
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
          penempatan_extra = ?,
          pembagian_rekapan = ?,
          pembebanan = ?,
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
          tanggal_nonaktif = CASE WHEN ? = 'nonaktif' THEN COALESCE(tanggal_nonaktif, CURDATE()) ELSE NULL END,
          tanggal_masuk_pertama = ?,
          tanggal_kontrak = ?,
          tanggal_selesai_kontrak = ?,
          kenaikan_tiap_tahun = ?,
          tipe_payroll_penjahit = ?,
          tipe_freelance = ?,
          is_shift = ?
        WHERE id = ?
      `,
      [
        finalNip,
        payload.name,
        payload.unit,
        payload.role,
        payload.department,
        payload.division,
        payload.subDivision,
        payload.placement,
        payload.extraPlacements?.filter(Boolean).join(",") || null,
        payload.recapGroup,
        payload.costAllocation,
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
        payload.dataStatus,
        resolvedTimeline.firstJoinDate,
        resolvedTimeline.contractDate,
        resolvedTimeline.contractEndDate,
        payload.annualRaise,
        payload.penjahitPayrollType ?? null,
        payload.freelanceTipePayroll ?? null,
        payload.isShift ? 1 : 0,
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

export async function signupEmployee(email: string, password: string) {
  await ensureEmployeeSchemaSupport();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [userResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO users (nama, email, password, role, status_aktif)
        VALUES (?, ?, SHA2(?, 256), 'karyawan', 1)
      `,
      [email.split("@")[0], email, password],
    );

    const userId = userResult.insertId;

    await connection.query<ResultSetHeader>(
      `
        INSERT INTO karyawan (
          user_id, nama,
          status_kepegawaian, status_kerja, status_data,
          kenaikan_tiap_tahun
        ) VALUES (?, ?, 'training', 'training', 'aktif', 0)
      `,
      [userId, email.split("@")[0]],
    );

    await connection.commit();
    return { userId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployeeProfile(
  userId: number,
  data: {
    name: string;
    gender: "laki-laki" | "perempuan" | null;
    birthPlace: string | null;
    birthDate: string | null;
    nik: string | null;
    religion: string | null;
    phoneNumber: string | null;
    addressKtp: string | null;
    addressCurrent: string | null;
    ktpPhotoLink: string | null;
    bank: string | null;
    accountNumber: string | null;
  },
) {
  await ensureEmployeeSchemaSupport();

  await pool.query(
    `UPDATE users SET nama = ? WHERE id = ?`,
    [data.name, userId],
  );

  await pool.query(
    `
      UPDATE karyawan SET
        nama = ?,
        jenis_kelamin = ?,
        tempat_lahir = ?,
        tanggal_lahir = ?,
        nik = ?,
        agama = ?,
        nomor_telepon = ?,
        alamat_ktp = ?,
        alamat_rumah_kost = ?,
        foto_ktp = ?,
        bank = ?,
        no_rekening = ?
      WHERE user_id = ?
    `,
    [
      data.name,
      data.gender,
      data.birthPlace,
      data.birthDate,
      data.nik,
      data.religion,
      data.phoneNumber,
      data.addressKtp,
      data.addressCurrent,
      data.ktpPhotoLink,
      data.bank,
      data.accountNumber,
      userId,
    ],
  );
}

export async function getEmployeeProfileByUserId(userId: number) {
  await ensureEmployeeSchemaSupport();
  const [rows] = await pool.query<EmployeeRow[]>(
    `${employeeSelectQuery} WHERE k.user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapEmployee(rows[0]) : null;
}

// Reset password login Web HR karyawan (bukan password Gmail). Hash SHA2-256 sama seperti
// alur signup/login. Mengembalikan false bila karyawan tidak ada / belum punya akun users.
// Cek keberadaan akun dulu supaya set password yang sama (affectedRows=0) tidak salah dianggap gagal.
export async function updateEmployeePassword(employeeId: number, password: string) {
  const [rows] = await pool.query<(RowDataPacket & { user_id: number | null })[]>(
    "SELECT user_id FROM karyawan WHERE id = ? LIMIT 1",
    [employeeId],
  );
  const userId = rows[0]?.user_id;
  if (!userId) return false;

  await pool.query("UPDATE users SET password = SHA2(?, 256) WHERE id = ?", [password, userId]);
  return true;
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
