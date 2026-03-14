import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getEmployeeRemainingLoanTotal } from "@/lib/loans";
import { getAdminPayrollSummarySheet } from "@/lib/payroll-summary";

type CountRow = RowDataPacket & { total: number };

export async function getAdminDashboardStats() {
  const [employeeRows, attendanceRows, payrollRows, slipRows] =
    await Promise.all([
      pool.query<CountRow[]>("SELECT COUNT(*) AS total FROM karyawan"),
      pool.query<CountRow[]>(
        "SELECT COUNT(*) AS total FROM absensi WHERE tanggal = CURDATE()",
      ),
      pool.query<CountRow[]>(
        "SELECT COUNT(*) AS total FROM payroll WHERE status_payroll IN ('draft', 'processed')",
      ),
      pool.query<CountRow[]>(
        "SELECT COUNT(*) AS total FROM slip_gaji WHERE status_distribusi IN ('draft', 'didistribusikan')",
      ),
    ]);

  return {
    totalEmployees: employeeRows[0][0]?.total ?? 0,
    attendanceToday: attendanceRows[0][0]?.total ?? 0,
    payrollPending: payrollRows[0][0]?.total ?? 0,
    payslipsPending: slipRows[0][0]?.total ?? 0,
  };
}

type AttendanceRow = RowDataPacket & {
  employee_id: number;
  nama: string;
  no_karyawan: string;
  jabatan: string;
  divisi: string;
  departemen: string;
  email: string;
  attendance_date: string | null;
  status_absensi: string | null;
  kode_absensi: string | null;
  jam_masuk: string | null;
  jam_pulang: string | null;
  foto_masuk: string | null;
  foto_pulang: string | null;
  latitude_masuk: number | null;
  longitude_masuk: number | null;
  latitude_pulang: number | null;
  longitude_pulang: number | null;
  terlambat_menit: number;
  setengah_hari: number;
  keterangan: string | null;
};

export type AttendanceDayDetail = {
  code: string;
  date: string;
  status: string | null;
  timeIn: string | null;
  timeOut: string | null;
  photoIn: string | null;
  photoOut: string | null;
  latitudeIn: number | null;
  longitudeIn: number | null;
  latitudeOut: number | null;
  longitudeOut: number | null;
  lateMinutes: number;
  note: string | null;
};

type AttendanceSheetRow = {
  employeeId: number;
  name: string;
  nip: string;
  role: string;
  division: string;
  department: string;
  email: string;
  passwordLabel: string;
  daily: Record<number, AttendanceDayDetail>;
};

type AttendanceSheetOptions = {
  month?: number;
  year?: number;
  view?: "month" | "week";
  week?: number;
};

function isTimeWithinRange(time: string, start: string, end: string) {
  return time >= start && time <= end;
}

function isHalfDayAttendance(
  timeIn: string | null,
  timeOut: string | null,
  halfDayFlag: number,
) {
  if (halfDayFlag === 1) {
    return true;
  }

  if (!timeIn || !timeOut) {
    return false;
  }

  const isMorningHalfDay =
    isTimeWithinRange(timeIn, "08:30", "12:00") &&
    isTimeWithinRange(timeOut, "08:30", "12:00");
  const isAfternoonHalfDay =
    isTimeWithinRange(timeIn, "13:00", "16:30") &&
    isTimeWithinRange(timeOut, "13:00", "16:30");

  return isMorningHalfDay || isAfternoonHalfDay;
}

function mapAttendanceCode(
  row: Pick<
    AttendanceRow,
    | "status_absensi"
    | "kode_absensi"
    | "jam_masuk"
    | "jam_pulang"
    | "foto_masuk"
    | "setengah_hari"
  >,
) {
  const {
    status_absensi: status,
    kode_absensi: code,
    jam_masuk: timeIn,
    jam_pulang: timeOut,
    foto_masuk: photoIn,
    setengah_hari: halfDayFlag,
  } = row;
  const isHalfDay =
    status === "setengah_hari" ||
    isHalfDayAttendance(timeIn, timeOut, halfDayFlag);
  const isSickWithoutProof = status === "sakit" && !photoIn;

  if (code) {
    switch (code) {
      case "O":
      case "S":
      case "X":
      case "SX":
        return code === "SX" && isHalfDay ? "H" : code;
      case "H":
        return isHalfDay ? "H" : "O";
      case "M":
        return "O";
      case "SH":
        return "H";
      case "A":
      case "I":
      case "L":
        return "X";
      default:
        if (isSickWithoutProof) {
          return "SX";
        }

        if (isHalfDay) {
          return "H";
        }

        return code;
    }
  }

  switch (status) {
    case "hadir":
      return isHalfDay ? "H" : "O";
    case "sakit":
      return isSickWithoutProof ? "SX" : "S";
    case "izin":
    case "alfa":
    case "libur":
      return "X";
    case "setengah_hari":
      return "H";
    default:
      return "";
  }
}

export async function getAttendanceSheet(options: AttendanceSheetOptions = {}) {
  const month = options.month ?? 3;
  const year = options.year ?? 2026;
  const view = options.view === "week" ? "week" : "month";
  const [rows] = await pool.query<AttendanceRow[]>(
    `
      SELECT
        k.id AS employee_id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen,
        u.email,
        DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS attendance_date,
        a.status_absensi,
        a.kode_absensi,
        DATE_FORMAT(a.jam_masuk, '%H:%i') AS jam_masuk,
        DATE_FORMAT(a.jam_pulang, '%H:%i') AS jam_pulang,
        a.foto_masuk,
        a.foto_pulang,
        a.latitude_masuk,
        a.longitude_masuk,
        a.latitude_pulang,
        a.longitude_pulang,
        a.terlambat_menit,
        a.setengah_hari,
        a.keterangan
      FROM karyawan k
      INNER JOIN users u ON u.id = k.user_id
      LEFT JOIN absensi a
        ON a.karyawan_id = k.id
        AND MONTH(a.tanggal) = ?
        AND YEAR(a.tanggal) = ?
      ORDER BY k.nama ASC, a.tanggal ASC
    `,
    [month, year],
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const totalWeeks = Math.ceil(daysInMonth / 7);
  const selectedWeek = Math.min(Math.max(options.week ?? 1, 1), totalWeeks);
  const weekStartDay = (selectedWeek - 1) * 7 + 1;
  const weekEndDay = Math.min(weekStartDay + 6, daysInMonth);
  const activeDays =
    view === "week"
      ? Array.from(
          { length: weekEndDay - weekStartDay + 1 },
          (_, index) => weekStartDay + index,
        )
      : Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const byEmployee = new Map<number, AttendanceSheetRow>();

  for (const row of rows) {
    if (!byEmployee.has(row.employee_id)) {
      byEmployee.set(row.employee_id, {
        employeeId: row.employee_id,
        name: row.nama,
        nip: row.no_karyawan,
        role: row.jabatan,
        division: row.divisi,
        department: row.departemen,
        email: row.email,
        passwordLabel: "Tersimpan",
        daily: {},
      });
    }

    if (row.attendance_date) {
      const day = Number(row.attendance_date.split("-")[2]);
      byEmployee.get(row.employee_id)!.daily[day] = {
        code: mapAttendanceCode(row),
        date: row.attendance_date,
        status: row.status_absensi,
        timeIn: row.jam_masuk,
        timeOut: row.jam_pulang,
        photoIn: row.foto_masuk,
        photoOut: row.foto_pulang,
        latitudeIn: row.latitude_masuk,
        longitudeIn: row.longitude_masuk,
        latitudeOut: row.latitude_pulang,
        longitudeOut: row.longitude_pulang,
        lateMinutes: row.terlambat_menit,
        note: row.keterangan,
      };
    }
  }

  return {
    month,
    year,
    view,
    week: selectedWeek,
    totalWeeks,
    days: activeDays,
    rows: Array.from(byEmployee.values()),
  };
}

type OvertimeRow = RowDataPacket & {
  id: number;
  nama: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  total_jam: string;
  bukti_lembur: string | null;
  status_approval: "pending" | "approved" | "rejected";
  approver_name: string | null;
  catatan_atasan: string | null;
};

export async function listOvertimeRecords() {
  const [rows] = await pool.query<OvertimeRow[]>(
    `
      SELECT
        l.id,
        k.nama,
        DATE_FORMAT(l.tanggal, '%d %b %Y') AS tanggal,
        DATE_FORMAT(l.jam_mulai, '%H:%i') AS jam_mulai,
        DATE_FORMAT(l.jam_selesai, '%H:%i') AS jam_selesai,
        l.total_jam,
        l.bukti_lembur,
        l.status_approval,
        u.nama AS approver_name,
        l.catatan_atasan
      FROM lembur l
      INNER JOIN karyawan k ON k.id = l.karyawan_id
      LEFT JOIN users u ON u.id = l.approved_by
      ORDER BY l.tanggal DESC, l.id DESC
    `,
  );

  return rows;
}

type LoanRow = RowDataPacket & {
  id: number;
  nama: string;
  jabatan: string;
  departemen: string;
  jumlah_pinjaman: string;
  angsuran_per_bulan: string;
  total_sudah_bayar: string;
  sisa_pinjaman: string;
  status_pinjaman: string;
};

export async function listLoanRecords() {
  const [rows] = await pool.query<LoanRow[]>(
    `
      SELECT
        p.id,
        k.nama,
        k.jabatan,
        k.departemen,
        p.jumlah_pinjaman,
        p.angsuran_per_bulan,
        p.total_sudah_bayar,
        p.sisa_pinjaman,
        p.status_pinjaman
      FROM pinjaman p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      ORDER BY p.created_at DESC, p.id DESC
    `,
  );

  return rows;
}

type ContractRow = RowDataPacket & {
  id: number;
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
};

export async function listContractDeductionRecords() {
  const [rows] = await pool.query<ContractRow[]>(
    `
      SELECT
        pk.id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        k.kenaikan_tiap_tahun,
        pk.nominal_potongan,
        pk.bulan,
        pk.tahun
      FROM potongan_kontrak pk
      INNER JOIN karyawan k ON k.id = pk.karyawan_id
      ORDER BY pk.tahun DESC, pk.bulan DESC, k.nama ASC
    `,
  );

  return rows;
}

type PayrollSummaryRow = RowDataPacket & {
  id: number;
  nama: string;
  periode_bulan: number;
  periode_tahun: number;
  gaji_pokok: string;
  total_gaji_pokok: string;
  tunjangan_jabatan: string;
  tunjangan_lain: string;
  transport: string;
  bpjs: string;
  bonus_performa: string;
  hari_kerja: number;
  total_masuk: number;
  uang_makan: string;
  total_lembur_jam: string;
  total_setengah_hari: number;
  total_potongan: string;
  potongan_kontrak: string;
  potongan_pinjaman: string;
  potongan_keterlambatan: string;
  potongan_kerajinan: string;
  gaji_bersih: string;
};

export async function listPayrollSummary() {
  const [rows] = await pool.query<PayrollSummaryRow[]>(
    `
      SELECT
        p.id,
        k.nama,
        p.periode_bulan,
        p.periode_tahun,
        p.gaji_pokok,
        (p.gaji_pokok / NULLIF(p.hari_kerja, 0)) AS total_gaji_pokok,
        p.tunjangan_jabatan,
        p.tunjangan_lain,
        p.transport,
        p.bpjs,
        p.bonus_performa,
        p.hari_kerja,
        p.total_masuk,
        p.uang_makan,
        p.total_lembur_jam,
        p.total_setengah_hari,
        p.total_potongan,
        p.potongan_kontrak,
        p.potongan_pinjaman,
        p.potongan_keterlambatan,
        p.potongan_kerajinan,
        p.gaji_bersih
      FROM payroll p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      ORDER BY p.periode_tahun DESC, p.periode_bulan DESC, k.nama ASC
    `,
  );

  return rows;
}

type FinanceRow = RowDataPacket & {
  departemen: string;
  pembagian_rekapan: string | null;
  pembebanan: string | null;
  total_pencairan: string;
  total_potongan_kontrak: string;
  total_potongan_pinjaman: string;
  jumlah_karyawan: number;
};

async function ensureHrisSchemaSupport() {
  try {
    await pool.query(`
      ALTER TABLE karyawan
      ADD COLUMN pembebanan VARCHAR(100) NULL AFTER pembagian_rekapan
    `);
  } catch (error: unknown) {
    if (
      !(typeof error === "object" && error !== null && "code" in error) ||
      error.code !== "ER_DUP_FIELDNAME"
    ) {
      throw error;
    }
  }
}

export async function listFinanceSummary() {
  await ensureHrisSchemaSupport();
  const [rows] = await pool.query<FinanceRow[]>(
    `
      SELECT
        k.departemen,
        k.pembagian_rekapan,
        k.pembebanan,
        SUM(p.gaji_bersih) AS total_pencairan,
        SUM(p.potongan_kontrak) AS total_potongan_kontrak,
        SUM(p.potongan_pinjaman) AS total_potongan_pinjaman,
        COUNT(*) AS jumlah_karyawan
      FROM payroll p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      GROUP BY k.departemen, k.pembagian_rekapan, k.pembebanan
      ORDER BY k.departemen ASC, k.pembagian_rekapan ASC, k.pembebanan ASC
    `,
  );

  return rows;
}

export type FinanceUnitDeptData = {
  departemen: string;
  totalGaji: number;
  totalPotonganDenda: number;
  totalPotonganKontrak: number;
  totalPotonganPinjaman: number;
  total: number;
};

export type FinanceUnitGroup = {
  unit: string;
  departments: FinanceUnitDeptData[];
  totals: FinanceUnitDeptData;
};

export type FinanceByUnitResult = {
  unitGroups: FinanceUnitGroup[];
  period: { month: number; year: number } | null;
};

export async function listFinanceByUnit(period?: {
  month?: number;
  year?: number;
}): Promise<FinanceByUnitResult> {
  // Use the live-computed payroll summary sheet so that netIncome (Penerimaan
  // Bersih) matches exactly what is shown in the AdminPayrollSummaryManager,
  // including any override values stored in payroll_employee_input.
  const sheet = await getAdminPayrollSummarySheet(period);

  if (!sheet || !sheet.rows.length) {
    return { unitGroups: [], period: null };
  }

  // Accumulate per unit → department
  const unitMap = new Map<string, Map<string, FinanceUnitDeptData>>();

  for (const row of sheet.rows) {
    const unit = row.unit ?? "-";
    const dept = row.department;

    if (!unitMap.has(unit)) unitMap.set(unit, new Map());
    const deptMap = unitMap.get(unit)!;

    const existing = deptMap.get(dept) ?? {
      departemen: dept,
      totalGaji: 0,
      totalPotonganDenda: 0,
      totalPotonganKontrak: 0,
      totalPotonganPinjaman: 0,
      total: 0,
    };

    existing.totalGaji += row.netIncome;
    existing.totalPotonganDenda += row.fineDeduction;
    existing.totalPotonganKontrak += row.contractCut;
    existing.totalPotonganPinjaman += row.loanCut;
    existing.total =
      existing.totalGaji +
      existing.totalPotonganDenda +
      existing.totalPotonganKontrak +
      existing.totalPotonganPinjaman;

    deptMap.set(dept, existing);
  }

  // Build sorted unit groups with per-unit totals
  const unitGroups: FinanceUnitGroup[] = [];
  for (const [unit, deptMap] of Array.from(unitMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const departments = Array.from(deptMap.values()).sort((a, b) =>
      a.departemen.localeCompare(b.departemen),
    );

    const totals: FinanceUnitDeptData = {
      departemen: "Total",
      totalGaji: departments.reduce((s, d) => s + d.totalGaji, 0),
      totalPotonganDenda: departments.reduce(
        (s, d) => s + d.totalPotonganDenda,
        0,
      ),
      totalPotonganKontrak: departments.reduce(
        (s, d) => s + d.totalPotonganKontrak,
        0,
      ),
      totalPotonganPinjaman: departments.reduce(
        (s, d) => s + d.totalPotonganPinjaman,
        0,
      ),
      total: departments.reduce((s, d) => s + d.total, 0),
    };

    unitGroups.push({ unit, departments, totals });
  }

  return {
    unitGroups,
    period: { month: sheet.periodMonth, year: sheet.periodYear },
  };
}

// ─── PEMBEBANAN ──────────────────────────────────────────────────────────────

const PEMBEBANAN_CONFIG = [
  { key: "produksi", label: "Produksi (25%)", factor: 0.25 },
  { key: "penjualan", label: "Penjualan (50%)", factor: 0.5 },
  { key: "umum", label: "Umum (50%)", factor: 0.5 },
] as const;

const UNIT_KEYWORDS: Record<string, string> = {
  ava: "ava",
  ayres: "ayres",
};

export type PembebananCell = {
  totalGaji: number;
  amount: number;
} | null;

export type PembebananRow = {
  label: string;
  typeKey: string;
  factor: number;
  byUnit: Record<string, PembebananCell>;
};

export type PembebananResult = {
  rows: PembebananRow[];
  units: string[];
  period: { month: number; year: number } | null;
};

export async function listFinancePembebanan(period?: {
  month?: number;
  year?: number;
}): Promise<PembebananResult> {
  const sheet = await getAdminPayrollSummarySheet(period);
  if (!sheet || !sheet.rows.length)
    return { rows: [], units: [], period: null };

  // Accumulate totalSalary: typeKey -> unitKeyword -> total
  const acc = new Map<string, Map<string, number>>();

  for (const row of sheet.rows) {
    const pb = (row.pembebanan ?? "").toLowerCase().trim();
    if (!pb || pb === "tidak keduanya") continue;

    let matchedType: string | null = null;
    let matchedUnit: string | null = null;

    for (const cfg of PEMBEBANAN_CONFIG) {
      if (pb.includes(cfg.key)) {
        matchedType = cfg.key;
        break;
      }
    }
    for (const kw of Object.keys(UNIT_KEYWORDS)) {
      if (pb.includes(kw)) {
        matchedUnit = kw;
        break;
      }
    }
    if (!matchedType || !matchedUnit) continue;

    if (!acc.has(matchedType)) acc.set(matchedType, new Map());
    const unitMap = acc.get(matchedType)!;
    unitMap.set(matchedUnit, (unitMap.get(matchedUnit) ?? 0) + row.totalSalary);
  }

  // Collect ordered unit names from payroll rows (same order as finance table)
  const unitSet = new Set<string>();
  for (const row of sheet.rows) {
    if (row.unit) unitSet.add(row.unit);
  }
  const units = Array.from(unitSet).sort();

  // Build result
  const rows: PembebananRow[] = PEMBEBANAN_CONFIG.map((cfg) => {
    const unitMap = acc.get(cfg.key);
    const byUnit: Record<string, PembebananCell> = {};

    for (const unitName of units) {
      const kw = Object.keys(UNIT_KEYWORDS).find((k) =>
        unitName.toLowerCase().includes(k),
      );
      const totalGaji = kw ? (unitMap?.get(kw) ?? 0) : 0;
      byUnit[unitName] =
        totalGaji > 0 ? { totalGaji, amount: totalGaji * cfg.factor } : null;
    }

    return { label: cfg.label, typeKey: cfg.key, factor: cfg.factor, byUnit };
  });

  return {
    rows,
    units,
    period: { month: sheet.periodMonth, year: sheet.periodYear },
  };
}

// ─── PENCAIRAN GAJI ──────────────────────────────────────────────────────────

/** Unit yang selalu ditampilkan di tabel pencairan gaji, meskipun tidak ada data payroll */
const PENCAIRAN_UNIT_ORDER = ["AVA Sportivo", "Ayres Apparel", "JNE"];

export type PencairanGajiByUnit = {
  totalBersih: number;
  uangKontrak: number;
  pengembalianKontrak: number;
  potonganTerlambat: number;
  potonganSetengahHari: number;
  potonganKerajinan: number;
  hutangPerusahaan: number;
};

export type PencairanGajiResult = {
  units: string[];
  byUnit: Record<string, PencairanGajiByUnit>;
  period: { month: number; year: number } | null;
};

export async function listFinancePencairanGaji(period?: {
  month?: number;
  year?: number;
}): Promise<PencairanGajiResult> {
  const sheet = await getAdminPayrollSummarySheet(period);
  if (!sheet || !sheet.rows.length)
    return { units: [], byUnit: {}, period: null };

  // Collect unit names from payroll data, then merge with fixed order
  const unitSet = new Set<string>(PENCAIRAN_UNIT_ORDER);
  for (const row of sheet.rows) {
    if (row.unit) unitSet.add(row.unit);
  }
  // Keep fixed order first, then any extra units from payroll sorted after
  const extraUnits = Array.from(unitSet)
    .filter((u) => !PENCAIRAN_UNIT_ORDER.includes(u))
    .sort();
  const units = [...PENCAIRAN_UNIT_ORDER, ...extraUnits];

  // Init accumulator
  const acc: Record<string, PencairanGajiByUnit> = {};
  for (const unit of units) {
    acc[unit] = {
      totalBersih: 0,
      uangKontrak: 0,
      pengembalianKontrak: 0,
      potonganTerlambat: 0,
      potonganSetengahHari: 0,
      potonganKerajinan: 0,
      hutangPerusahaan: 0,
    };
  }

  // Sum up per unit
  for (const row of sheet.rows) {
    if (!row.unit) continue;
    const u = acc[row.unit];
    if (!u) continue;
    u.totalBersih += row.netIncome;
    u.uangKontrak += row.contractDeduction;
    // pengembalianKontrak stays 0
    u.potonganTerlambat += row.lateDeduction;
    u.potonganSetengahHari += row.halfDayDeduction;
    u.potonganKerajinan += row.diligenceCut;
    u.hutangPerusahaan += row.companyLoan;
  }

  return {
    units,
    byUnit: acc,
    period: { month: sheet.periodMonth, year: sheet.periodYear },
  };
}

type PayslipRow = RowDataPacket & {
  id: number;
  nomor_slip: string;
  status_distribusi: string;
  tanggal_distribusi: string | null;
  file_slip: string | null;
  payroll_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  bank: string | null;
  no_rekening: string | null;
  periode_bulan: number;
  periode_tahun: number;
  hari_kerja: number;
  total_lembur_jam: string;
  total_terlambat: number;
  total_setengah_hari: number;
  gaji_bersih: string;
};

export async function listPayslips() {
  const [rows] = await pool.query<PayslipRow[]>(
    `
      SELECT
        sg.id,
        sg.nomor_slip,
        sg.status_distribusi,
        DATE_FORMAT(sg.tanggal_distribusi, '%d %b %Y %H:%i') AS tanggal_distribusi,
        sg.file_slip,
        sg.payroll_id,
        k.nama,
        k.jabatan,
        k.divisi,
        k.bank,
        k.no_rekening,
        p.periode_bulan,
        p.periode_tahun,
        p.hari_kerja,
        p.total_lembur_jam,
        p.total_terlambat,
        p.total_setengah_hari,
        p.gaji_bersih
      FROM slip_gaji sg
      INNER JOIN payroll p ON p.id = sg.payroll_id
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      ORDER BY p.periode_tahun DESC, p.periode_bulan DESC, k.nama ASC
    `,
  );

  return rows;
}

type DistributionRow = RowDataPacket & {
  id: number;
  nomor_slip: string;
  nama: string;
  tanggal_distribusi: string;
  didistribusikan_oleh_nama: string;
  status_baca: number;
  status_distribusi: string;
};

export async function listPayslipDistribution() {
  const [rows] = await pool.query<DistributionRow[]>(
    `
      SELECT
        lds.id,
        sg.nomor_slip,
        k.nama,
        DATE_FORMAT(lds.tanggal_distribusi, '%d %b %Y %H:%i') AS tanggal_distribusi,
        u.nama AS didistribusikan_oleh_nama,
        lds.status_baca,
        sg.status_distribusi
      FROM log_distribusi_slip lds
      INNER JOIN slip_gaji sg ON sg.id = lds.slip_gaji_id
      INNER JOIN karyawan k ON k.id = lds.karyawan_id
      INNER JOIN users u ON u.id = lds.didistribusikan_oleh
      ORDER BY lds.tanggal_distribusi DESC
    `,
  );

  return rows;
}

type EmployeeCardRow = RowDataPacket & {
  id: number;
  user_id?: number;
  nama: string;
  no_karyawan: string;
  jabatan: string;
  divisi: string;
  departemen: string;
};

export async function getEmployeeByEmail(email: string) {
  const [rows] = await pool.query<EmployeeCardRow[]>(
    `
      SELECT
        k.id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen
      FROM karyawan k
      INNER JOIN users u ON u.id = k.user_id
      WHERE u.email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
}

export async function getEmployeeByUserId(userId: number) {
  const [rows] = await pool.query<EmployeeCardRow[]>(
    `
      SELECT
        k.id,
        k.user_id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen
      FROM karyawan k
      WHERE k.user_id = ?
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] ?? null;
}

export async function getFirstEmployee() {
  const [rows] = await pool.query<EmployeeCardRow[]>(
    `
      SELECT
        k.id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen
      FROM karyawan k
      ORDER BY k.id ASC
      LIMIT 1
    `,
  );

  return rows[0] ?? null;
}

type EmployeeAttendanceHistoryRow = RowDataPacket & {
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status_absensi: string;
  terlambat_menit: number;
};

type EmployeeTodayAttendanceRow = RowDataPacket & {
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status_absensi: string | null;
};

export async function getEmployeeOverview(employeeId: number) {
  const [attendanceRows, overtimeRows, loanRows, payslipRows] =
    await Promise.all([
      pool.query<CountRow[]>(
        "SELECT COUNT(*) AS total FROM absensi WHERE karyawan_id = ? AND MONTH(tanggal) = MONTH(CURDATE()) AND YEAR(tanggal) = YEAR(CURDATE()) AND status_absensi = 'hadir'",
        [employeeId],
      ),
      pool.query<(CountRow & { total_jam?: string })[]>(
        "SELECT COUNT(*) AS total, COALESCE(SUM(total_jam), 0) AS total_jam FROM lembur WHERE karyawan_id = ?",
        [employeeId],
      ),
      getEmployeeRemainingLoanTotal(employeeId),
      pool.query<CountRow[]>(
        "SELECT COUNT(*) AS total FROM slip_gaji sg INNER JOIN payroll p ON p.id = sg.payroll_id WHERE p.karyawan_id = ?",
        [employeeId],
      ),
    ]);

  return {
    attendanceThisMonth: attendanceRows[0][0]?.total ?? 0,
    overtimeCount: overtimeRows[0][0]?.total ?? 0,
    overtimeHours:
      (overtimeRows[0][0] as RowDataPacket & { total_jam?: string })
        ?.total_jam ?? "0",
    remainingLoan: loanRows ?? "0",
    payslipCount: payslipRows[0][0]?.total ?? 0,
  };
}

export async function getEmployeeAttendanceHistory(employeeId: number) {
  const [rows] = await pool.query<EmployeeAttendanceHistoryRow[]>(
    `
      SELECT
        DATE_FORMAT(tanggal, '%d %b %Y') AS tanggal,
        DATE_FORMAT(jam_masuk, '%H:%i') AS jam_masuk,
        DATE_FORMAT(jam_pulang, '%H:%i') AS jam_pulang,
        status_absensi,
        terlambat_menit
      FROM absensi
      WHERE karyawan_id = ?
      ORDER BY tanggal DESC
    `,
    [employeeId],
  );

  return rows;
}

export async function getEmployeeTodayAttendance(employeeId: number) {
  const [rows] = await pool.query<EmployeeTodayAttendanceRow[]>(
    `
      SELECT
        DATE_FORMAT(tanggal, '%d %b %Y') AS tanggal,
        DATE_FORMAT(jam_masuk, '%H:%i') AS jam_masuk,
        DATE_FORMAT(jam_pulang, '%H:%i') AS jam_pulang,
        status_absensi
      FROM absensi
      WHERE karyawan_id = ? AND tanggal = CURDATE()
      LIMIT 1
    `,
    [employeeId],
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    tanggal: row.tanggal,
    jamMasuk: row.jam_masuk,
    jamPulang: row.jam_pulang,
    statusAbsensi: row.status_absensi,
  };
}

export async function getEmployeeOvertime(employeeId: number) {
  const [rows] = await pool.query<OvertimeRow[]>(
    `
      SELECT
        l.id,
        k.nama,
        DATE_FORMAT(l.tanggal, '%d %b %Y') AS tanggal,
        DATE_FORMAT(l.jam_mulai, '%H:%i') AS jam_mulai,
        DATE_FORMAT(l.jam_selesai, '%H:%i') AS jam_selesai,
        l.total_jam,
        l.bukti_lembur,
        l.status_approval,
        u.nama AS approver_name,
        l.catatan_atasan
      FROM lembur l
      INNER JOIN karyawan k ON k.id = l.karyawan_id
      LEFT JOIN users u ON u.id = l.approved_by
      WHERE l.karyawan_id = ?
      ORDER BY l.tanggal DESC
    `,
    [employeeId],
  );

  return rows;
}

export async function getEmployeeLoans(employeeId: number) {
  const [rows] = await pool.query<LoanRow[]>(
    `
      SELECT
        p.id,
        k.nama,
        k.jabatan,
        k.departemen,
        p.jumlah_pinjaman,
        p.angsuran_per_bulan,
        p.total_sudah_bayar,
        p.sisa_pinjaman,
        p.status_pinjaman
      FROM pinjaman p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      WHERE p.karyawan_id = ?
      ORDER BY p.id DESC
    `,
    [employeeId],
  );

  return rows;
}

export async function getEmployeeContract(employeeId: number) {
  const [rows] = await pool.query<ContractRow[]>(
    `
      SELECT
        pk.id,
        k.nama,
        k.no_karyawan,
        k.jabatan,
        k.divisi,
        k.departemen,
        DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak,
        k.kenaikan_tiap_tahun,
        pk.nominal_potongan,
        pk.bulan,
        pk.tahun
      FROM potongan_kontrak pk
      INNER JOIN karyawan k ON k.id = pk.karyawan_id
      WHERE pk.karyawan_id = ?
      ORDER BY pk.tahun DESC, pk.bulan DESC
    `,
    [employeeId],
  );

  return rows;
}

export async function getEmployeePayslips(employeeId: number) {
  const [rows] = await pool.query<PayslipRow[]>(
    `
      SELECT
        sg.id,
        sg.nomor_slip,
        sg.status_distribusi,
        DATE_FORMAT(sg.tanggal_distribusi, '%d %b %Y %H:%i') AS tanggal_distribusi,
        sg.file_slip,
        sg.payroll_id,
        k.nama,
        k.jabatan,
        k.divisi,
        k.bank,
        k.no_rekening,
        p.periode_bulan,
        p.periode_tahun,
        p.hari_kerja,
        p.total_lembur_jam,
        p.total_terlambat,
        p.total_setengah_hari,
        p.gaji_bersih
      FROM slip_gaji sg
      INNER JOIN payroll p ON p.id = sg.payroll_id
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      WHERE p.karyawan_id = ?
      ORDER BY p.periode_tahun DESC, p.periode_bulan DESC
    `,
    [employeeId],
  );

  return rows;
}
