import { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { isAttendanceApprovalRuleActive, isHalfDayByTime, isHalfDayRuleActive } from "@/lib/attendance";

function countPeriodWorkDays(start: Date, end: Date) {
  const cursor = new Date(start);
  let total = 0;
  while (cursor <= end) {
    if (cursor.getDay() !== 0) total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}
import {
  autoAttachLoanInstallmentsForPeriod,
  ensureLoanSupportTables,
  getLoanDeductionRowsForPeriod,
  getWeeklyLoanDeductionMap,
} from "@/lib/loans";
import {
  ensurePayrollPeriodCloned,
  ensurePayrollSupportTables,
  getActivePayrollPeriod,
  getPayrollDateRange,
} from "@/lib/payroll-admin";
import { ensureContractReturnTable } from "@/lib/contract-returns";

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
  status_kepegawaian: string | null;
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
  raw_override_denda: string | null;
  raw_override_kerajinan: string | null;
  potongan_kontrak: string;
  potongan_pinjaman: string;
};

type AttendanceRawRow = RowDataPacket & {
  employee_id: number;
  tanggal_iso: string;
  status_absensi: string;
  kode_absensi: string | null;
  setengah_hari: number;
  terlambat_menit: number;
  jam_masuk_str: string | null;
  jam_pulang_str: string | null;
  shift: string | null;
  scheduled_shift: string | null;
  butuh_approval: number | null;
  approval_status: string | null;
};

type AttendanceCounts = {
  present_count: number;
  leave_count: number;
  sick_count: number;
  sick_without_note_count: number;
  half_day_count: number;
  late_count: number;
  holiday_count: number;
  alfa_count: number;
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
  gajiPokokMonthly: number;
  gajiPokokPerHari: number;
  tunjanganJabatan: number;
  uangAbsensiPerHari: number;
  uangKerajinanNominal: number;
  bpjs: number;
  bonusPerforma: number;
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
  totalGajiPokok: number;
  uangAbsensiTotal: number;
  kerajinanEarned: number;
  totalGajiSebelumPotongan: number;
  totalGaji: number;
  potonganDenda: number;
  potonganKontrak: number;
  potonganPinjaman: number;
  potonganLainLain: number;
  remainingLoanBalance: number;
  cicilanPerMinggu: number;
  contractReturn: number;
  penerimaanBersih: number;
  pencairan: {
    minggu1: number;
    minggu2: number;
    minggu3: number;
    minggu4: number;
  } | null;
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
  inputOverrideDenda: number | null;
  inputOverrideKerajinan: number | null;
};

export type PenjahitPayrollSummarySheet = {
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  rangeLabel: string;
  rows: PenjahitComputedRow[];
};

export async function getPenjahitSheet(period?: {
  month?: number;
  year?: number;
}): Promise<PenjahitPayrollSummarySheet | null> {
  await Promise.all([ensurePayrollSupportTables(), ensureLoanSupportTables(), ensureContractReturnTable()]);

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
  const periodWorkDays = countPeriodWorkDays(range.start, range.end);

  // Auto-catat cicilan pinjaman periode ini (hanya periode berjalan/lampau)
  const activeForLoan = getActivePayrollPeriod();
  if (periodYear * 100 + periodMonth <= activeForLoan.year * 100 + activeForLoan.month) {
    await autoAttachLoanInstallmentsForPeriod(periodMonth, periodYear);
  }

  const [rows] = await pool.query<PenjahitPayrollRow[]>(
    `
      SELECT
        p.id AS payroll_id,
        k.id AS employee_id,
        k.nama, k.jabatan, k.divisi, k.sub_divisi, k.pembagian_rekapan, k.departemen,
        k.bank, k.no_rekening, k.status_kepegawaian, k.tipe_payroll_penjahit,
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
        pei.override_gaji_pokok AS raw_override_gaji_pokok,
        pei.override_denda AS raw_override_denda,
        pei.override_kerajinan AS raw_override_kerajinan
      FROM payroll p
      INNER JOIN karyawan k ON k.id = p.karyawan_id
      LEFT JOIN payroll_employee_input pei ON pei.payroll_id = p.id
      WHERE p.periode_bulan = ? AND p.periode_tahun = ?
        AND LOWER(COALESCE(k.sub_divisi, '')) = 'penjahit'
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

  const [[attendanceRows], [overtimeRows], [jadwalLemburRows], loanRows, [remainingLoanRows], [contractReturnRows], [contractDeductionRows]] = await Promise.all([
    pool.query<AttendanceRawRow[]>(
      `SELECT a.karyawan_id AS employee_id,
        DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS tanggal_iso,
        a.status_absensi,
        a.kode_absensi,
        a.setengah_hari,
        a.terlambat_menit,
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
    ),
    pool.query<OvertimeRow[]>(
      `SELECT karyawan_id AS employee_id, COALESCE(SUM(total_jam),0) AS total_jam
       FROM lembur
       WHERE karyawan_id IN (${placeholders}) AND tanggal BETWEEN ? AND ? AND status_approval = 'approved'
       GROUP BY karyawan_id`,
      [...employeeIds, range.startSql, range.endSql],
    ),
    pool.query<OvertimeRow[]>(
      `SELECT a.karyawan_id AS employee_id,
              SUM(FLOOR(GREATEST(TIMESTAMPDIFF(MINUTE, a.jam_masuk, a.jam_pulang) - 480, 0) / 30) * 30) / 60 AS total_jam
       FROM absensi a
       INNER JOIN jadwal_karyawan j ON j.karyawan_id = a.karyawan_id AND j.tanggal = a.tanggal
       WHERE a.karyawan_id IN (${placeholders})
         AND a.tanggal BETWEEN ? AND ?
         AND a.status_absensi = 'hadir'
         AND j.shift = 'lembur'
         AND a.jam_masuk IS NOT NULL AND a.jam_pulang IS NOT NULL
       GROUP BY a.karyawan_id`,
      [...employeeIds, range.startSql, range.endSql],
    ),
    getLoanDeductionRowsForPeriod(employeeIds, periodMonth, periodYear),
    pool.query<RowDataPacket[]>(
      `SELECT p.karyawan_id AS employee_id,
              COALESCE(SUM(pc.nominal_potongan), 0) AS remaining_total
       FROM pinjaman_cicilan pc
       INNER JOIN pinjaman p ON p.id = pc.pinjaman_id
       WHERE p.karyawan_id IN (${placeholders})
         AND p.status_pinjaman IN ('approved', 'berjalan', 'lunas')
         AND (pc.tahun * 100 + pc.bulan) > (? * 100 + ?)
       GROUP BY p.karyawan_id`,
      [...employeeIds, periodYear, periodMonth],
    ),
    // Pengembalian kontrak yang tanggalnya jatuh di periode ini -> menambah penerimaan bersih.
    pool.query<RowDataPacket[]>(
      `SELECT karyawan_id AS employee_id, nominal
       FROM pengembalian_kontrak
       WHERE karyawan_id IN (${placeholders})
         AND tanggal_pengembalian IS NOT NULL
         AND tanggal_pengembalian BETWEEN ? AND ?`,
      [...employeeIds, range.startSql, range.endSql],
    ),
    // Potongan kontrak periode ini dari tabel potongan_kontrak (sumber kebenaran modul
    // Potongan Kontrak). Penjahit sebelumnya baca p.potongan_kontrak yang tak terisi.
    pool.query<RowDataPacket[]>(
      `SELECT karyawan_id AS employee_id, COALESCE(SUM(nominal_potongan), 0) AS nominal
       FROM potongan_kontrak
       WHERE karyawan_id IN (${placeholders}) AND bulan = ? AND tahun = ?
       GROUP BY karyawan_id`,
      [...employeeIds, periodMonth, periodYear],
    ),
  ]);

  const contractReturnMap = new Map<number, number>();
  for (const r of contractReturnRows as Array<{ employee_id: number; nominal: number | string }>) {
    contractReturnMap.set(r.employee_id, toNum(r.nominal));
  }

  const contractDeductionMap = new Map<number, number>();
  for (const r of contractDeductionRows as Array<{ employee_id: number; nominal: number | string }>) {
    contractDeductionMap.set(r.employee_id, toNum(r.nominal));
  }

  // Cicilan pinjaman per minggu (custom) untuk pencairan mingguan penjahit.
  const weeklyLoanMap = await getWeeklyLoanDeductionMap(employeeIds, periodMonth, periodYear);

  // Hitung per-hari di JS pakai isHalfDayByTime supaya konsisten dengan rekap absensi & payroll lain.
  // Record setengah hari TIDAK dihitung sebagai hadir penuh & TIDAK dihitung telat.
  const attendanceMap = new Map<number, AttendanceCounts>();
  for (const r of attendanceRows) {
    const cur =
      attendanceMap.get(r.employee_id) ?? {
        present_count: 0,
        leave_count: 0,
        sick_count: 0,
        sick_without_note_count: 0,
        half_day_count: 0,
        late_count: 0,
        holiday_count: 0,
        alfa_count: 0,
      };

    // hasShift dihitung SAMA PERSIS dengan rekap absensi (lib/hris.ts) supaya klasifikasi
    // shift vs non-shift konsisten antara rekap & payroll.
    const hasShift =
      !!(r.scheduled_shift && r.scheduled_shift !== "libur") || !!r.shift;
    // Telat/pulang-awal belum di-approve (per 5 Juli 2026) -> dianggap tidak bekerja (alfa).
    const unapproved =
      isAttendanceApprovalRuleActive(r.tanggal_iso) &&
      r.butuh_approval === 1 &&
      r.approval_status !== "approved";
    // Setengah hari hanya berlaku untuk tanggal sebelum aturan baru (5 Juli 2026).
    const isHalf =
      isHalfDayRuleActive(r.tanggal_iso) &&
      (r.status_absensi === "setengah_hari" ||
        isHalfDayByTime(r.jam_masuk_str, r.jam_pulang_str, r.setengah_hari, hasShift));

    if (unapproved) {
      cur.alfa_count += 1;
    } else if (isHalf) {
      cur.half_day_count += 1;
    } else if (r.status_absensi === "hadir") {
      cur.present_count += 1;
      if (r.terlambat_menit > 0) {
        cur.late_count += 1;
      }
    }

    if (r.status_absensi === "izin") {
      cur.leave_count += 1;
    }

    if (r.status_absensi === "sakit" && r.kode_absensi === "SX") {
      cur.sick_without_note_count += 1;
    } else if (r.status_absensi === "sakit") {
      cur.sick_count += 1;
    }

    if (
      r.status_absensi === "libur" ||
      r.kode_absensi === "L" ||
      r.kode_absensi === "C"
    ) {
      cur.holiday_count += 1;
    }

    if (r.status_absensi === "alfa") {
      cur.alfa_count += 1;
    }

    attendanceMap.set(r.employee_id, cur);
  }
  const overtimeMap = new Map(overtimeRows.map((r) => [r.employee_id, toNum(r.total_jam)]));
  for (const r of jadwalLemburRows) {
    overtimeMap.set(r.employee_id, (overtimeMap.get(r.employee_id) ?? 0) + toNum(r.total_jam));
  }
  const loanMap = new Map(loanRows.map((r) => [r.employeeId, toNum(r.totalDeduction)]));
  const remainingLoanMap = new Map(remainingLoanRows.map((r) => [r.employee_id as number, toNum(r.remaining_total)]));

  const computedRows: PenjahitComputedRow[] = rows.map((row) => {
    const att = attendanceMap.get(row.employee_id);
    const hariKerja = periodWorkDays;
    const tipePayroll: "mingguan" | "bulanan" = row.tipe_payroll_penjahit === "bulanan" ? "bulanan" : "mingguan";

    const gajiPokokPerHari = toNum(row.raw_gaji_per_hari) || (hariKerja > 0 ? toNum(row.gaji_pokok) / hariKerja : 0);
    const gajiPokokMonthly = toNum(row.raw_override_gaji_pokok) || toNum(row.gaji_pokok) || gajiPokokPerHari * hariKerja;
    const tunjanganJabatan = toNum(row.tunjangan_jabatan);
    const uangAbsensiPerHari = toNum(row.raw_uang_makan_per_hari);
    const uangKerajinanNominal = toNum(row.raw_uang_kerajinan) || Math.round(gajiPokokMonthly * 0.1);
    const bpjs = toNum(row.raw_bpjs);
    const bonusPerforma = toNum(row.raw_bonus_performa);

    const masuk = row.raw_override_masuk ?? att?.present_count ?? 0;
    const izin = row.raw_override_izin ?? att?.leave_count ?? 0;
    const sakit = row.raw_override_sakit ?? att?.sick_count ?? 0;
    const sakitTanpaSurat = row.raw_override_sakit_tanpa_surat ?? att?.sick_without_note_count ?? 0;
    const setengahHari = row.raw_override_setengah_hari ?? att?.half_day_count ?? 0;
    const telat = att?.late_count ?? 0;
    const lemburJam = row.raw_override_lembur !== null ? toNum(row.raw_override_lembur) : (overtimeMap.get(row.employee_id) ?? 0);

    const liburNasional = att?.holiday_count ?? 0;
    const alfa = att?.alfa_count ?? 0;
    // Setengah hari: gaji pokok dihitung 1 hari penuh, lalu dipotong 1/2 hari
    // via potonganSetengahHari → bersih = 1/2 hari (bukan dobel potong).
    const totalGajiPokok = gajiPokokPerHari * (masuk + setengahHari);
    const uangAbsensiTotal = uangAbsensiPerHari * masuk;
    const kerajinanNoIssue = sakit <= 2 && sakitTanpaSurat === 0 && alfa === 0;
    const kerajinanReachesHariKerja = (masuk + sakit + setengahHari + liburNasional) >= hariKerja;
    // Kerajinan bisa di-OVERRIDE manual per periode (klik kolom Kerajinan). null = otomatis.
    const inputOverrideKerajinan =
      row.raw_override_kerajinan !== null ? toNum(row.raw_override_kerajinan) : null;
    const kerajinanEarnedAuto =
      hariKerja > 0 && kerajinanNoIssue && kerajinanReachesHariKerja
        ? uangKerajinanNominal
        : 0;
    const kerajinanEarned = inputOverrideKerajinan ?? kerajinanEarnedAuto;
    const bonusLembur = lemburJam * 20000;
    const potonganSetengahHari = (gajiPokokPerHari / 2) * setengahHari;
    const potonganTelat = telat * 20000;

    const totalGajiSebelumPotongan = totalGajiPokok + tunjanganJabatan + uangAbsensiTotal + bonusPerforma + uangKerajinanNominal + bpjs + bonusLembur;
    // Denda = potongan 1/2 hari + telat + kerajinan hangus. Bisa di-override manual per-periode.
    const autoDenda = potonganSetengahHari + potonganTelat + (uangKerajinanNominal - kerajinanEarned);
    const inputOverrideDenda = row.raw_override_denda !== null ? toNum(row.raw_override_denda) : null;
    const potonganDenda = inputOverrideDenda ?? autoDenda;
    const totalGaji = totalGajiSebelumPotongan - potonganDenda;

    const statusKepegawaianNorm = (row.status_kepegawaian ?? "").trim().toLowerCase();
    const isContractWaived =
      statusKepegawaianNorm === "tetap" || statusKepegawaianNorm === "freelance";
    // Sumber potongan kontrak = tabel potongan_kontrak (modul Potongan Kontrak) untuk periode
    // ini; fallback ke kolom payroll lama bila belum ada. Override manual tetap menang.
    const rawPotonganKontrak =
      row.raw_override_kontrak !== null
        ? toNum(row.raw_override_kontrak)
        : (contractDeductionMap.get(row.employee_id) ?? toNum(row.potongan_kontrak));
    const potonganKontrak = isContractWaived ? 0 : rawPotonganKontrak;
    const potonganPinjaman = row.raw_override_pinjaman !== null
      ? toNum(row.raw_override_pinjaman)
      : (loanMap.get(row.employee_id) ?? 0);
    const potonganLainLain = row.raw_override_pinjaman_pribadi !== null ? toNum(row.raw_override_pinjaman_pribadi) : 0;
    const cicilanPerMinggu = Math.round(potonganPinjaman / 4);
    const contractReturn = contractReturnMap.get(row.employee_id) ?? 0;
    const penerimaanBersih =
      totalGaji - potonganKontrak - potonganPinjaman - potonganLainLain + contractReturn;

    let pencairan: PenjahitComputedRow["pencairan"] = null;
    if (tipePayroll === "mingguan") {
      const weeklyBase = 800_000;
      // Cicilan per minggu: kalau pinjaman punya jadwal MINGGUAN, pakai nominal tiap minggu
      // (minggu tanpa cicilan = 0). Kalau tidak ada jadwal mingguan (pinjaman lama bulanan),
      // bagi rata potongan bulan /4 seperti perilaku lama.
      const wk = weeklyLoanMap.get(row.employee_id);
      const w = (n: number) => (wk ? (wk[n] ?? 0) : cicilanPerMinggu);
      const minggu1 = weeklyBase - w(1);
      const minggu2 = weeklyBase - w(2);
      const minggu3 = weeklyBase - w(3) - potonganKontrak;
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
      remainingLoanBalance: remainingLoanMap.get(row.employee_id) ?? 0,
      cicilanPerMinggu,
      contractReturn,
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
      inputOverrideDenda,
      inputOverrideKerajinan,
    };
  });

  return { periodMonth, periodYear, periodLabel, rangeLabel, rows: computedRows };
}
