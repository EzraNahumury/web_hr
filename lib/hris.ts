import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

type CountRow = RowDataPacket & { total: number };

export async function getAdminDashboardStats() {
  const [employeeRows, attendanceRows, payrollRows, slipRows] = await Promise.all([
    pool.query<CountRow[]>("SELECT COUNT(*) AS total FROM karyawan"),
    pool.query<CountRow[]>("SELECT COUNT(*) AS total FROM absensi WHERE tanggal = CURDATE()"),
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
  daily: Record<number, string>;
};

type AttendanceSheetOptions = {
  month?: number;
  year?: number;
  view?: "month" | "week";
  week?: number;
};

function mapAttendanceCode(status: string | null, code: string | null) {
  if (code) return code;
  switch (status) {
    case "hadir":
      return "M";
    case "sakit":
      return "S";
    case "izin":
      return "I";
    case "libur":
      return "L";
    case "setengah_hari":
      return "SH";
    case "alfa":
      return "A";
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
        a.kode_absensi
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
      ? Array.from({ length: weekEndDay - weekStartDay + 1 }, (_, index) => weekStartDay + index)
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
      byEmployee.get(row.employee_id)!.daily[day] = mapAttendanceCode(
        row.status_absensi,
        row.kode_absensi,
      );
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
  total_pencairan: string;
  total_potongan_kontrak: string;
  total_potongan_pinjaman: string;
  jumlah_karyawan: number;
};

export async function listFinanceSummary() {
  const [rows] = await pool.query<FinanceRow[]>(
    `
      SELECT
        k.departemen,
        k.pembagian_rekapan,
        SUM(p.gaji_bersih) AS total_pencairan,
        SUM(p.potongan_kontrak) AS total_potongan_kontrak,
        SUM(p.potongan_pinjaman) AS total_potongan_pinjaman,
        COUNT(*) AS jumlah_karyawan
      FROM payroll p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      GROUP BY k.departemen, k.pembagian_rekapan
      ORDER BY k.departemen ASC, k.pembagian_rekapan ASC
    `,
  );

  return rows;
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

export async function getEmployeeOverview(employeeId: number) {
  const [attendanceRows, overtimeRows, loanRows, payslipRows] = await Promise.all([
    pool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM absensi WHERE karyawan_id = ? AND MONTH(tanggal) = MONTH(CURDATE()) AND YEAR(tanggal) = YEAR(CURDATE()) AND status_absensi = 'hadir'",
      [employeeId],
    ),
    pool.query<(CountRow & { total_jam?: string })[]>(
      "SELECT COUNT(*) AS total, COALESCE(SUM(total_jam), 0) AS total_jam FROM lembur WHERE karyawan_id = ?",
      [employeeId],
    ),
    pool.query<(RowDataPacket & { sisa_pinjaman: string | null })[]>(
      "SELECT sisa_pinjaman FROM pinjaman WHERE karyawan_id = ? ORDER BY id DESC LIMIT 1",
      [employeeId],
    ),
    pool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM slip_gaji sg INNER JOIN payroll p ON p.id = sg.payroll_id WHERE p.karyawan_id = ?",
      [employeeId],
    ),
  ]);

  return {
    attendanceThisMonth: attendanceRows[0][0]?.total ?? 0,
    overtimeCount: overtimeRows[0][0]?.total ?? 0,
    overtimeHours: (overtimeRows[0][0] as RowDataPacket & { total_jam?: string })?.total_jam ?? "0",
    remainingLoan: loanRows[0][0]?.sisa_pinjaman ?? "0",
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
