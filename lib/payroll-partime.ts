import { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import {
  isAttendanceApprovalRuleActive,
  isHalfDayByTime,
  isHalfDayRuleActive,
} from "@/lib/attendance";
import {
  ensurePayrollPeriodCloned,
  ensurePayrollSupportTables,
  getActivePayrollPeriod,
  getPayrollDateRange,
} from "@/lib/payroll-admin";

// ── Aturan gaji PARTIME (status_kepegawaian = 'partime') ────────────────────────
// Rumus (dikonfirmasi user 2026-07-28):
//   1. Insentif kehadiran/hari × JUMLAH HARI MASUK (hadir aktual, bukan flat 25)
//   2. Tunjangan jabatan (custom)
//   3. Uang makan/hari × JUMLAH HARI MASUK (hadir aktual)
//   4. Subsidi (custom)
//   5. BPJS (custom)
//   6. Lembur (jam × Rp20.000) — sama seperti Summary Payroll utama; menambah gaji.
//   - TIDAK ada uang kerajinan / transport.
//   - Potongan HANYA telat: Rp5.000 per telat (bukan 20.000 seperti payroll biasa).
//   - Absen/izin/sakit/alfa OTOMATIS mengurangi gaji karena hari masuk berkurang.
// Catatan: PARTIME_FIXED_DAYS (25) TIDAK lagi jadi pengali gaji — hanya dipakai untuk
// menurunkan rate/hari dari gaji_pokok bulanan lama (gaji_pokok / 25) bila rate/hari kosong.
export const PARTIME_FIXED_DAYS = 25;
export const PARTIME_LATE_DEDUCTION = 5000;

type PartimePayrollRow = RowDataPacket & {
  payroll_id: number;
  employee_id: number;
  nama: string;
  jabatan: string | null;
  divisi: string | null;
  departemen: string | null;
  bank: string | null;
  no_rekening: string | null;
  status_kepegawaian: string | null;
  gaji_pokok: string;
  tunjangan_jabatan: string;
  tunjangan_lain: string;
  bpjs: string;
  raw_gaji_per_hari: string | null;
  raw_uang_makan_per_hari: string | null;
  raw_subsidi: string | null;
  raw_bpjs: string | null;
};

type AttendanceRawRow = RowDataPacket & {
  employee_id: number;
  tanggal_iso: string;
  status_absensi: string;
  kode_absensi: string | null;
  setengah_hari: number;
  jam_masuk_str: string | null;
  jam_pulang_str: string | null;
  shift: string | null;
  scheduled_shift: string | null;
  butuh_approval: number | null;
  approval_status: string | null;
};

type AttendanceCounts = {
  present: number;
  late: number;
};

function toNum(v: string | number | null | undefined) {
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type PartimeComputedRow = {
  payrollId: number;
  employeeId: number;
  nama: string;
  jabatan: string;
  divisi: string;
  departemen: string;
  bank: string;
  noRekening: string;
  // Nominal per komponen
  insentifPerHari: number;
  uangMakanPerHari: number;
  tunjanganJabatan: number;
  subsidi: number;
  bpjs: number;
  // Absensi
  hariTetap: number; // selalu 25
  masuk: number;
  telat: number;
  // Perhitungan
  insentifTotal: number; // insentifPerHari × 25
  uangMakanTotal: number; // uangMakanPerHari × 25
  overtimeHours: number; // total jam lembur (lembur approved + jadwal lembur)
  overtimeBonus: number; // overtimeHours × 20.000
  potonganTelat: number; // telat × 5.000
  totalGajiSebelumPotongan: number;
  totalGaji: number;
  // Prefill form edit
  inputInsentifPerHari: number;
  inputUangMakanPerHari: number;
  inputTunjanganJabatan: number;
  inputSubsidi: number;
  inputBpjs: number;
};

export type PartimePayrollSummarySheet = {
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  rangeLabel: string;
  rows: PartimeComputedRow[];
};

export async function getPartimeSheet(period?: {
  month?: number;
  year?: number;
}): Promise<PartimePayrollSummarySheet | null> {
  await ensurePayrollSupportTables();

  const activePeriod = {
    month: period?.month ?? getActivePayrollPeriod().month,
    year: period?.year ?? getActivePayrollPeriod().year,
  };
  await ensurePayrollPeriodCloned(activePeriod.month, activePeriod.year);

  const [latestRows] = await pool.query<RowDataPacket[]>(
    `SELECT periode_bulan, periode_tahun FROM payroll WHERE periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [activePeriod.month, activePeriod.year],
  );
  if (!latestRows[0]) return null;

  const periodMonth = (latestRows[0] as { periode_bulan: number }).periode_bulan;
  const periodYear = (latestRows[0] as { periode_tahun: number }).periode_tahun;
  const range = getPayrollDateRange(periodMonth, periodYear);

  const [rows] = await pool.query<PartimePayrollRow[]>(
    `
      SELECT
        p.id AS payroll_id,
        k.id AS employee_id,
        k.nama, k.jabatan, k.divisi, k.departemen,
        k.bank, k.no_rekening, k.status_kepegawaian,
        p.gaji_pokok, p.tunjangan_jabatan, p.tunjangan_lain, p.bpjs,
        pei.gaji_pokok_per_hari AS raw_gaji_per_hari,
        pei.uang_makan_per_hari AS raw_uang_makan_per_hari,
        pei.subsidi AS raw_subsidi,
        pei.bpjs AS raw_bpjs
      FROM payroll p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      LEFT JOIN payroll_employee_input pei ON pei.payroll_id = p.id
      WHERE p.periode_bulan = ? AND p.periode_tahun = ?
        AND LOWER(COALESCE(k.status_kepegawaian, '')) = 'partime'
        AND (
          k.status_data = 'aktif'
          OR k.tanggal_nonaktif IS NULL
          OR k.tanggal_nonaktif > CONCAT(?, '-', LPAD(?, 2, '0'), '-25')
        )
      ORDER BY k.nama ASC
    `,
    [periodMonth, periodYear, periodYear, periodMonth],
  );

  const periodLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(periodYear, periodMonth - 1, 1));
  const rangeLabel = `${range.startSql} - ${range.endSql}`;

  if (!rows.length) {
    return { periodMonth, periodYear, periodLabel, rangeLabel, rows: [] };
  }

  const employeeIds = rows.map((r) => r.employee_id);
  const placeholders = employeeIds.map(() => "?").join(",");

  const [attendanceRows] = await pool.query<AttendanceRawRow[]>(
    `SELECT a.karyawan_id AS employee_id,
        DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS tanggal_iso,
        a.status_absensi,
        a.kode_absensi,
        a.setengah_hari,
        DATE_FORMAT(a.jam_masuk, '%H:%i') AS jam_masuk_str,
        DATE_FORMAT(a.jam_pulang, '%H:%i') AS jam_pulang_str,
        a.shift,
        j.shift AS scheduled_shift,
        a.butuh_approval,
        a.approval_status
       FROM absensi a
       LEFT JOIN jadwal_karyawan j
         ON j.karyawan_id = a.karyawan_id
         AND j.tanggal = a.tanggal
       WHERE a.karyawan_id IN (${placeholders}) AND a.tanggal BETWEEN ? AND ?`,
    [...employeeIds, range.startSql, range.endSql],
  );

  // Lembur: SAMA PERSIS payroll utama = lembur (approved) + jadwal shift='lembur' (jam kerja > 8j).
  const [[lemburApprovedRows], [jadwalLemburRows]] = await Promise.all([
    pool.query<(RowDataPacket & { employee_id: number; total_jam: string | number })[]>(
      `SELECT karyawan_id AS employee_id, total_jam FROM lembur
       WHERE karyawan_id IN (${placeholders}) AND tanggal BETWEEN ? AND ? AND status_approval = 'approved'`,
      [...employeeIds, range.startSql, range.endSql],
    ),
    pool.query<(RowDataPacket & { employee_id: number; total_jam: string | number })[]>(
      `SELECT a.karyawan_id AS employee_id,
          SUM(FLOOR(GREATEST(TIMESTAMPDIFF(MINUTE, a.jam_masuk, a.jam_pulang) - 480, 0) / 30) * 30) / 60 AS total_jam
       FROM absensi a
       INNER JOIN jadwal_karyawan j ON j.karyawan_id = a.karyawan_id AND j.tanggal = a.tanggal
       WHERE a.karyawan_id IN (${placeholders}) AND a.tanggal BETWEEN ? AND ?
         AND a.status_absensi = 'hadir' AND j.shift = 'lembur'
         AND a.jam_masuk IS NOT NULL AND a.jam_pulang IS NOT NULL
       GROUP BY a.karyawan_id`,
      [...employeeIds, range.startSql, range.endSql],
    ),
  ]);
  const overtimeMap = new Map<number, number>();
  for (const r of lemburApprovedRows)
    overtimeMap.set(r.employee_id, (overtimeMap.get(r.employee_id) ?? 0) + toNum(r.total_jam));
  for (const r of jadwalLemburRows)
    overtimeMap.set(r.employee_id, (overtimeMap.get(r.employee_id) ?? 0) + toNum(r.total_jam));

  // Hitung MASUK & TELAT dengan logika SAMA PERSIS payroll utama (lib/payroll-summary.ts):
  // telat = hari HADIR yang kode_absensi-nya 'T' (bukan recompute dari jam), sudah di-approve,
  // dan bukan hari setengah-hari. Telat/pulang-awal belum di-approve dianggap alfa (tidak dihitung).
  const attendanceMap = new Map<number, AttendanceCounts>();
  for (const r of attendanceRows) {
    const cur = attendanceMap.get(r.employee_id) ?? { present: 0, late: 0 };

    const hasShift =
      !!(r.scheduled_shift && r.scheduled_shift !== "libur") || !!r.shift;
    const codeUpper = (r.kode_absensi ?? "").trim().toUpperCase();
    const unapproved =
      isAttendanceApprovalRuleActive(r.tanggal_iso) &&
      r.butuh_approval === 1 &&
      r.approval_status !== "approved";
    const halfDayAllowed = isHalfDayRuleActive(r.tanggal_iso);
    const timeHalf = isHalfDayByTime(
      r.jam_masuk_str,
      r.jam_pulang_str,
      r.setengah_hari,
      hasShift,
    );
    const isHalf =
      halfDayAllowed &&
      (codeUpper === "H" ||
        codeUpper === "SH" ||
        ((codeUpper === "T" || codeUpper === "SX") && timeHalf) ||
        (codeUpper === "" &&
          (r.status_absensi === "setengah_hari" ||
            (r.status_absensi === "hadir" && timeHalf))));

    if (unapproved) {
      // dianggap alfa — partime tidak ada potongan alfa, tidak dihitung telat.
    } else if (isHalf) {
      // setengah hari — partime tidak ada potongan setengah hari, tidak dihitung telat penuh.
    } else if (r.status_absensi === "hadir") {
      cur.present += 1;
      if (r.kode_absensi === "T") {
        cur.late += 1;
      }
    }

    attendanceMap.set(r.employee_id, cur);
  }

  const computedRows: PartimeComputedRow[] = rows.map((row) => {
    const att = attendanceMap.get(row.employee_id);

    const insentifPerHari =
      toNum(row.raw_gaji_per_hari) ||
      (toNum(row.gaji_pokok) > 0 ? toNum(row.gaji_pokok) / PARTIME_FIXED_DAYS : 0);
    const uangMakanPerHari = toNum(row.raw_uang_makan_per_hari);
    const tunjanganJabatan = toNum(row.tunjangan_jabatan);
    const subsidi = toNum(row.raw_subsidi) || toNum(row.tunjangan_lain);
    const bpjs = toNum(row.raw_bpjs) || toNum(row.bpjs);

    const masuk = att?.present ?? 0;
    const telat = att?.late ?? 0;

    // Insentif & uang makan dibayar per HARI MASUK aktual (bukan flat 25 hari).
    const insentifTotal = insentifPerHari * masuk;
    const uangMakanTotal = uangMakanPerHari * masuk;
    const potonganTelat = telat * PARTIME_LATE_DEDUCTION;
    // Lembur: jam × Rp20.000, sama seperti Summary Payroll utama. Menambah gaji.
    const overtimeHours = overtimeMap.get(row.employee_id) ?? 0;
    const overtimeBonus = overtimeHours * 20000;

    const totalGajiSebelumPotongan =
      insentifTotal + tunjanganJabatan + uangMakanTotal + subsidi + bpjs + overtimeBonus;
    const totalGaji = totalGajiSebelumPotongan - potonganTelat;

    return {
      payrollId: row.payroll_id,
      employeeId: row.employee_id,
      nama: row.nama,
      jabatan: row.jabatan ?? "-",
      divisi: row.divisi ?? "-",
      departemen: row.departemen ?? "-",
      bank: row.bank || "-",
      noRekening: row.no_rekening || "-",
      insentifPerHari,
      uangMakanPerHari,
      tunjanganJabatan,
      subsidi,
      bpjs,
      hariTetap: PARTIME_FIXED_DAYS,
      masuk,
      telat,
      insentifTotal,
      uangMakanTotal,
      overtimeHours,
      overtimeBonus,
      potonganTelat,
      totalGajiSebelumPotongan,
      totalGaji,
      inputInsentifPerHari: toNum(row.raw_gaji_per_hari),
      inputUangMakanPerHari: toNum(row.raw_uang_makan_per_hari),
      inputTunjanganJabatan: tunjanganJabatan,
      inputSubsidi: toNum(row.raw_subsidi),
      inputBpjs: toNum(row.raw_bpjs),
    };
  });

  return { periodMonth, periodYear, periodLabel, rangeLabel, rows: computedRows };
}
