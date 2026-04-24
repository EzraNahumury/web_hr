import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import {
  ensurePayrollSupportTables,
  getActivePayrollPeriod,
  getPayrollDateRange,
  listPayrollEmployeeOptions,
  listPayrollPeriods,
} from "@/lib/payroll-admin";
import { ensureLoanSupportTables, getLoanDeductionRowsForPeriod } from "@/lib/loans";
import { RowDataPacket } from "mysql2";
import AdminPenjahitPayrollSummary from "@/components/AdminPenjahitPayrollSummary";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

type PenjahitPayrollRow = RowDataPacket & {
  payroll_id: number;
  employee_id: number;
  nama: string;
  jabatan: string;
  divisi: string;
  sub_divisi: string | null;
  pembagian_rekapan: string | null;
  departemen: string;
  bank: string | null;
  no_rekening: string | null;
  tipe_payroll_penjahit: "mingguan" | "bulanan" | null;
  gaji_pokok: string;
  hari_kerja: number;
  total_masuk: number;
  total_lembur_jam: string;
  total_terlambat: number;
  total_setengah_hari: number;
  tunjangan_jabatan: string;
  raw_gaji_per_hari: string | null;
  raw_uang_makan_per_hari: string | null;
  raw_uang_kerajinan: string | null;
  raw_bpjs: string | null;
  raw_bonus_performa: string | null;
  raw_override_masuk: number | null;
  raw_override_lembur: string | null;
  raw_override_izin: number | null;
  raw_override_sakit: number | null;
  raw_override_sakit_tanpa_surat: number | null;
  raw_override_setengah_hari: number | null;
  raw_override_kontrak: string | null;
  raw_override_pinjaman: string | null;
  raw_override_pinjaman_pribadi: string | null;
  raw_override_gaji_pokok: string | null;
  potongan_kontrak: string;
  potongan_pinjaman: string;
};

type AttendanceRow = RowDataPacket & {
  employee_id: number;
  present_count: number;
  leave_count: number;
  sick_count: number;
  sick_without_note_count: number;
  half_day_count: number;
  late_count: number;
};

type OvertimeRow = RowDataPacket & {
  employee_id: number;
  total_jam: string;
};

function toNum(v: string | number | null | undefined) {
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type PenjahitComputedRow = {
  payrollId: number;
  employeeId: number;
  nama: string;
  jabatan: string;
  divisi: string;
  subDivisi: string | null;
  pembagianRekapan: string | null;
  departemen: string;
  bank: string;
  noRekening: string;
  tipePayroll: "mingguan" | "bulanan";
  // Nominal Tetap
  gajiPokokMonthly: number;
  gajiPokokPerHari: number;
  tunjanganJabatan: number;
  uangAbsensiPerHari: number;
  uangKerajinanNominal: number;
  bpjs: number;
  bonusPerforma: number;
  // From system
  hariKerja: number;
  masuk: number;
  lemburJam: number;
  bonusLembur: number;
  izin: number;
  sakit: number;
  sakitTanpaSurat: number;
  setengahHari: number;
  potonganSetengahHari: number;
  telat: number;
  potonganTelat: number;
  // Computed
  totalGajiPokok: number;
  uangAbsensiTotal: number;
  kerajinanEarned: number;
  totalGajiSebelumPotongan: number;
  totalGaji: number;
  potonganDenda: number;
  potonganKontrak: number;
  potonganPinjaman: number;
  potonganLainLain: number;
  cicilanPerMinggu: number;
  penerimaanBersih: number;
  // Pencairan
  pencairan: {
    minggu1: number;
    minggu2: number;
    minggu3: number;
    minggu4: number;
  } | null;
  // Override flags for form pre-fill
  inputGajiPerDay: number;
  inputTunjanganJabatan: number;
  inputUangMakan: number;
  inputUangKerajinan: number;
  inputBpjs: number;
  inputBonusPerforma: number;
  inputOverrideMasuk: number | null;
  inputOverrideLembur: number | null;
  inputOverrideIzin: number | null;
  inputOverrideSakit: number | null;
  inputOverrideSakitTanpaSurat: number | null;
  inputOverrideSetengahHari: number | null;
  inputOverrideGajiPokok: number | null;
  inputOverrideKontrak: number | null;
  inputOverridePinjaman: number | null;
  inputPotonganLainLain: number | null;
};

export type PenjahitPayrollSummarySheet = {
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  rows: PenjahitComputedRow[];
};

async function getPenjahitSheet(period?: { month?: number; year?: number }): Promise<PenjahitPayrollSummarySheet | null> {
  await Promise.all([ensurePayrollSupportTables(), ensureLoanSupportTables()]);

  const activePeriod = {
    month: period?.month ?? getActivePayrollPeriod().month,
    year: period?.year ?? getActivePayrollPeriod().year,
  };

  const [latestRows] = await pool.query<RowDataPacket[]>(
    `SELECT periode_bulan, periode_tahun FROM payroll WHERE periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [activePeriod.month, activePeriod.year],
  );
  if (!latestRows[0]) return null;

  const periodMonth = (latestRows[0] as { periode_bulan: number }).periode_bulan;
  const periodYear = (latestRows[0] as { periode_tahun: number }).periode_tahun;
  const range = getPayrollDateRange(periodMonth, periodYear);

  const [rows] = await pool.query<PenjahitPayrollRow[]>(
    `
      SELECT
        p.id AS payroll_id,
        k.id AS employee_id,
        k.nama, k.jabatan, k.divisi, k.sub_divisi, k.pembagian_rekapan, k.departemen,
        k.bank, k.no_rekening, k.tipe_payroll_penjahit,
        p.gaji_pokok, p.hari_kerja, p.total_masuk, p.total_lembur_jam,
        p.total_terlambat, p.total_setengah_hari, p.tunjangan_jabatan,
        p.potongan_kontrak, p.potongan_pinjaman,
        pei.gaji_pokok_per_hari AS raw_gaji_per_hari,
        pei.uang_makan_per_hari AS raw_uang_makan_per_hari,
        pei.uang_kerajinan AS raw_uang_kerajinan,
        pei.bpjs AS raw_bpjs,
        pei.bonus_performa AS raw_bonus_performa,
        pei.override_masuk AS raw_override_masuk,
        pei.override_lembur AS raw_override_lembur,
        pei.override_izin AS raw_override_izin,
        pei.override_sakit AS raw_override_sakit,
        pei.override_sakit_tanpa_surat AS raw_override_sakit_tanpa_surat,
        pei.override_setengah_hari AS raw_override_setengah_hari,
        pei.override_kontrak AS raw_override_kontrak,
        pei.override_pinjaman AS raw_override_pinjaman,
        pei.override_pinjaman_pribadi AS raw_override_pinjaman_pribadi,
        pei.override_gaji_pokok AS raw_override_gaji_pokok
      FROM payroll p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      LEFT JOIN payroll_employee_input pei ON pei.payroll_id = p.id
      WHERE p.periode_bulan = ? AND p.periode_tahun = ?
        AND LOWER(COALESCE(k.jabatan, '')) = 'penjahit'
      ORDER BY k.nama ASC
    `,
    [periodMonth, periodYear],
  );

  const periodLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long", year: "numeric", timeZone: "Asia/Jakarta",
  }).format(new Date(periodYear, periodMonth - 1, 1));

  if (!rows.length) {
    return { periodMonth, periodYear, periodLabel, rows: [] };
  }

  const employeeIds = rows.map((r) => r.employee_id);
  const placeholders = employeeIds.map(() => "?").join(",");

  const [[attendanceRows], [overtimeRows], loanRows] = await Promise.all([
    pool.query<AttendanceRow[]>(
      `SELECT karyawan_id AS employee_id,
        SUM(CASE WHEN status_absensi = 'hadir' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN status_absensi = 'izin' THEN 1 ELSE 0 END) AS leave_count,
        SUM(CASE WHEN status_absensi = 'sakit' AND COALESCE(kode_absensi,'') <> 'SX' THEN 1 ELSE 0 END) AS sick_count,
        SUM(CASE WHEN status_absensi = 'sakit' AND kode_absensi = 'SX' THEN 1 ELSE 0 END) AS sick_without_note_count,
        SUM(CASE WHEN status_absensi = 'setengah_hari' OR setengah_hari = 1 THEN 1 ELSE 0 END) AS half_day_count,
        SUM(CASE WHEN terlambat_menit > 0 THEN 1 ELSE 0 END) AS late_count
       FROM absensi
       WHERE karyawan_id IN (${placeholders}) AND tanggal BETWEEN ? AND ?
       GROUP BY karyawan_id`,
      [...employeeIds, range.startSql, range.endSql],
    ),
    pool.query<OvertimeRow[]>(
      `SELECT karyawan_id AS employee_id, COALESCE(SUM(total_jam),0) AS total_jam
       FROM lembur
       WHERE karyawan_id IN (${placeholders}) AND tanggal BETWEEN ? AND ? AND status_approval = 'approved'
       GROUP BY karyawan_id`,
      [...employeeIds, range.startSql, range.endSql],
    ),
    getLoanDeductionRowsForPeriod(employeeIds, periodMonth, periodYear),
  ]);

  const attendanceMap = new Map(attendanceRows.map((r) => [r.employee_id, r]));
  const overtimeMap = new Map(overtimeRows.map((r) => [r.employee_id, toNum(r.total_jam)]));
  const loanMap = new Map(loanRows.map((r) => [r.employeeId, toNum(r.totalDeduction)]));

  const computedRows: PenjahitComputedRow[] = rows.map((row) => {
    const att = attendanceMap.get(row.employee_id);
    const hariKerja = row.hari_kerja ?? 0;
    const tipePayroll: "mingguan" | "bulanan" = row.tipe_payroll_penjahit === "bulanan" ? "bulanan" : "mingguan";

    const gajiPokokPerHari = toNum(row.raw_gaji_per_hari) || (hariKerja > 0 ? toNum(row.gaji_pokok) / hariKerja : 0);
    const gajiPokokMonthly = toNum(row.raw_override_gaji_pokok) || toNum(row.gaji_pokok) || gajiPokokPerHari * hariKerja;
    const tunjanganJabatan = toNum(row.tunjangan_jabatan);
    const uangAbsensiPerHari = toNum(row.raw_uang_makan_per_hari);
    const uangKerajinanNominal = toNum(row.raw_uang_kerajinan) || Math.round(gajiPokokMonthly * 0.1);
    const bpjs = toNum(row.raw_bpjs);
    const bonusPerforma = toNum(row.raw_bonus_performa);

    const masuk = row.raw_override_masuk ?? att?.present_count ?? row.total_masuk ?? 0;
    const izin = row.raw_override_izin ?? att?.leave_count ?? 0;
    const sakit = row.raw_override_sakit ?? att?.sick_count ?? 0;
    const sakitTanpaSurat = row.raw_override_sakit_tanpa_surat ?? att?.sick_without_note_count ?? 0;
    const setengahHari = row.raw_override_setengah_hari ?? att?.half_day_count ?? row.total_setengah_hari ?? 0;
    const telat = att?.late_count ?? row.total_terlambat ?? 0;
    const lemburJam = row.raw_override_lembur !== null ? toNum(row.raw_override_lembur) : overtimeMap.get(row.employee_id) ?? toNum(row.total_lembur_jam);

    const totalGajiPokok = gajiPokokPerHari * masuk;
    const uangAbsensiTotal = uangAbsensiPerHari * masuk;
    const kerajinanEarned = (masuk + sakit) >= hariKerja && hariKerja > 0 ? uangKerajinanNominal : 0;
    const bonusLembur = lemburJam * 20000;
    const potonganSetengahHari = (gajiPokokPerHari / 2) * setengahHari;
    const potonganTelat = telat * 20000;

    const totalGajiSebelumPotongan = totalGajiPokok + tunjanganJabatan + uangAbsensiTotal + bonusPerforma + uangKerajinanNominal + bpjs + bonusLembur;
    const totalGaji = totalGajiSebelumPotongan - potonganSetengahHari - potonganTelat - (uangKerajinanNominal - kerajinanEarned);
    const potonganDenda = potonganSetengahHari + potonganTelat + (uangKerajinanNominal - kerajinanEarned);

    const potonganKontrak = row.raw_override_kontrak !== null ? toNum(row.raw_override_kontrak) : toNum(row.potongan_kontrak);
    const potonganPinjaman = row.raw_override_pinjaman !== null ? toNum(row.raw_override_pinjaman) : (loanMap.get(row.employee_id) ?? toNum(row.potongan_pinjaman));
    const potonganLainLain = row.raw_override_pinjaman_pribadi !== null ? toNum(row.raw_override_pinjaman_pribadi) : 0;
    const cicilanPerMinggu = Math.round(potonganPinjaman / 4);
    const penerimaanBersih = totalGaji - potonganKontrak - potonganPinjaman - potonganLainLain;

    let pencairan: PenjahitComputedRow["pencairan"] = null;
    if (tipePayroll === "mingguan") {
      const weeklyBase = Math.round(gajiPokokMonthly / 4);
      const minggu1 = weeklyBase - cicilanPerMinggu;
      const minggu2 = weeklyBase - cicilanPerMinggu;
      const minggu3 = weeklyBase - cicilanPerMinggu - potonganKontrak;
      const minggu4 = penerimaanBersih - minggu1 - minggu2 - minggu3;
      pencairan = { minggu1, minggu2, minggu3, minggu4 };
    }

    return {
      payrollId: row.payroll_id,
      employeeId: row.employee_id,
      nama: row.nama,
      jabatan: row.jabatan ?? "-",
      divisi: row.divisi ?? "-",
      subDivisi: row.sub_divisi,
      pembagianRekapan: row.pembagian_rekapan,
      departemen: row.departemen ?? "-",
      bank: row.bank || "-",
      noRekening: row.no_rekening || "-",
      tipePayroll,
      gajiPokokMonthly,
      gajiPokokPerHari,
      tunjanganJabatan,
      uangAbsensiPerHari,
      uangKerajinanNominal,
      bpjs,
      bonusPerforma,
      hariKerja,
      masuk,
      lemburJam,
      bonusLembur,
      izin,
      sakit,
      sakitTanpaSurat,
      setengahHari,
      potonganSetengahHari,
      telat,
      potonganTelat,
      totalGajiPokok,
      uangAbsensiTotal,
      kerajinanEarned,
      totalGajiSebelumPotongan,
      totalGaji,
      potonganDenda,
      potonganKontrak,
      potonganPinjaman,
      potonganLainLain,
      cicilanPerMinggu,
      penerimaanBersih,
      pencairan,
      inputGajiPerDay: toNum(row.raw_gaji_per_hari),
      inputTunjanganJabatan: tunjanganJabatan,
      inputUangMakan: uangAbsensiPerHari,
      inputUangKerajinan: uangKerajinanNominal,
      inputBpjs: bpjs,
      inputBonusPerforma: bonusPerforma,
      inputOverrideMasuk: row.raw_override_masuk ?? null,
      inputOverrideLembur: row.raw_override_lembur !== null ? toNum(row.raw_override_lembur) : null,
      inputOverrideIzin: row.raw_override_izin ?? null,
      inputOverrideSakit: row.raw_override_sakit ?? null,
      inputOverrideSakitTanpaSurat: row.raw_override_sakit_tanpa_surat ?? null,
      inputOverrideSetengahHari: row.raw_override_setengah_hari ?? null,
      inputOverrideGajiPokok: row.raw_override_gaji_pokok !== null ? toNum(row.raw_override_gaji_pokok) : null,
      inputOverrideKontrak: row.raw_override_kontrak !== null ? toNum(row.raw_override_kontrak) : null,
      inputOverridePinjaman: row.raw_override_pinjaman !== null ? toNum(row.raw_override_pinjaman) : null,
      inputPotonganLainLain: row.raw_override_pinjaman_pribadi !== null ? toNum(row.raw_override_pinjaman_pribadi) : null,
    };
  });

  return { periodMonth, periodYear, periodLabel, rows: computedRows };
}

export default async function AdminPenjahitPayrollSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const month = parsePositiveInt(resolvedSearchParams.month);
  const year = parsePositiveInt(resolvedSearchParams.year);

  const [sheet, periodOptions, employeeOptions] = await Promise.all([
    getPenjahitSheet({ month: month ?? undefined, year: year ?? undefined }),
    listPayrollPeriods(),
    listPayrollEmployeeOptions(),
  ]);

  const penjahitEmployeeOptions = employeeOptions.filter(
    (e) => e.role?.toLowerCase() === "penjahit",
  );

  return (
    <AdminShell
      title="Summary Payroll Penjahit"
      description="Rekap payroll khusus penjahit: mingguan (Tgl 8, 16, 25, 1) dan bulanan (Tgl 25)."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-summary/penjahit"
    >
      <AdminPenjahitPayrollSummary
        sheet={sheet}
        periodOptions={periodOptions}
        employeeOptions={penjahitEmployeeOptions}
      />
    </AdminShell>
  );
}
