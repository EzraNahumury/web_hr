import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { getActivePayrollPeriod } from "@/lib/payroll-admin";
import type { KpiGroup } from "@/lib/kpi-rnd";

// ─────────────────────────────────────────────────────────────────────────────
// Template KPI FINANCE (statis) — jabatan Staff, departemen Finance.
// Struktur SAMA untuk penempatan AYRES & Toko; yang beda hanya TARGET omzet.
// 11 kelompok tugas, total bobot 99% (sesuai sheet asli).
// Baris "Pencapaian omzet" (f5_5) khusus: Perhitungan = Realisasi ÷ Target × 100.
// ─────────────────────────────────────────────────────────────────────────────

export const FINANCE_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran",
    total: 5,
    items: [
      { key: "f1_1", kpi: "Kepatuhan absensi 100%", caraUkur: "(Hari hadir ÷ Hari kerja) × 100%", caraPerhitungan: "Jumlah hari dia hadir", bobot: 3 },
      { key: "f1_2", kpi: "Keterlambatan kerja ≤ 5x", caraUkur: "((5 - Jumlah keterlambatan) ÷ 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 2, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Kedisiplinan & Etika Kerja",
    total: 4,
    items: [
      { key: "f2_1", kpi: "Kepatuhan penggunaan seragam 100%", caraUkur: "(Hari patuh ÷ Hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh menggunakan seragam)", bobot: 1 },
      { key: "f2_2", kpi: "Kepatuhan penggunaan sepatu/flat shoes 100%", caraUkur: "(Hari sesuai aturan ÷ Hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh menggunakan sepatu sesuai ketentuan)", bobot: 1 },
      { key: "f2_3", kpi: "Pelanggaran etika kerja 0%", caraUkur: "Jumlah pelanggaran", caraPerhitungan: "0-∞ (Jumlah pelanggaran etika kerja)", bobot: 1, formula: { type: "zeroBest" } },
      { key: "f2_4", kpi: "Kepatuhan terhadap peraturan perusahaan 100%", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Penilaian atasan)", bobot: 1, formula: { type: "direct" } },
    ],
  },
  {
    no: 3,
    tugas: "Pengelolaan Transaksi Keuangan",
    total: 20,
    items: [
      { key: "f3_1", kpi: "Ketepatan pencatatan transaksi 100%", caraUkur: "(Transaksi tercatat benar ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "direct" } },
      { key: "f3_2", kpi: "Ketepatan pengecekan mutasi rekening 100%", caraUkur: "(Mutasi dicek ÷ Total mutasi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "direct" } },
      { key: "f3_3", kpi: "Ketepatan input transaksi 100%", caraUkur: "(Input benar ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "direct" } },
      { key: "f3_4", kpi: "Tidak ada transaksi belum tercatat", caraUkur: "(Transaksi tercatat ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "direct" } },
      { key: "f3_5", kpi: "Ketepatan laporan closing harian", caraUkur: "(Laporan tepat waktu ÷ Total laporan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
      { key: "f3_6", kpi: "Ketepatan input saldo bank 100%", caraUkur: "(Input sesuai ÷ Total rekening) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
    ],
  },
  {
    no: 4,
    tugas: "Accurate & Administrasi Persediaan",
    total: 10,
    items: [
      { key: "f4_1", kpi: "Ketepatan input transaksi Accurate 100%", caraUkur: "(Input benar ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "direct" } },
      { key: "f4_2", kpi: "Ketepatan input Work Order 100%", caraUkur: "(WO benar ÷ Total WO) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "direct" } },
      { key: "f4_3", kpi: "Kesalahan stok 0%", caraUkur: "Selisih stok", caraPerhitungan: "0-∞ (Jumlah selisih stok)", bobot: 2, formula: { type: "zeroBest" } },
      { key: "f4_4", kpi: "Data persediaan terupdate 100%", caraUkur: "(Data update ÷ Total data) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1, formula: { type: "direct" } },
    ],
  },
  {
    no: 5,
    tugas: "Cash Flow, Pembayaran & Budget Control",
    total: 15,
    items: [
      { key: "f5_1", kpi: "Kesesuaian cash flow perusahaan 100%", caraUkur: "Penilaian manajemen", caraPerhitungan: "0-100 (Penilaian manajemen)", bobot: 4, formula: { type: "direct" } },
      { key: "f5_2", kpi: "Ketepatan pembayaran vendor 100%", caraUkur: "(Pembayaran tepat waktu ÷ Total pembayaran) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "direct" } },
      { key: "f5_3", kpi: "Kesalahan transfer pembayaran 0%", caraUkur: "Jumlah kesalahan transfer", caraPerhitungan: "0-∞ (Jumlah kesalahan transfer)", bobot: 3, formula: { type: "zeroBest" } },
      { key: "f5_4", kpi: "Ketepatan kontrol budget perusahaan 100%", caraUkur: "(Realisasi sesuai budget ÷ Total budget) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
      { key: "f5_5", kpi: "Pencapaian omzet perusahaan sesuai target", caraUkur: "(Realisasi omzet ÷ Target omzet) × 100%", caraPerhitungan: "Jumlah realisasi omzet perusahaan", bobot: 2, formula: { type: "omzet" } },
    ],
  },
  {
    no: 6,
    tugas: "Laporan Keuangan",
    total: 15,
    items: [
      { key: "f6_1", kpi: "Ketepatan laporan keuangan bulanan 100%", caraUkur: "Checklist manajemen", caraPerhitungan: "0-100 (Checklist manajemen)", bobot: 4, formula: { type: "direct" } },
      { key: "f6_2", kpi: "Ketepatan laporan laba rugi 100%", caraUkur: "Verifikasi manajemen", caraPerhitungan: "0-100 (Hasil verifikasi manajemen)", bobot: 4, formula: { type: "direct" } },
      { key: "f6_3", kpi: "Ketepatan laporan alur keuangan 100%", caraUkur: "Verifikasi manajemen", caraPerhitungan: "0-100 (Hasil verifikasi manajemen)", bobot: 3, formula: { type: "direct" } },
      { key: "f6_4", kpi: "Laporan bulanan diselesaikan maksimal pukul 20.00 setiap akhir bulan", caraUkur: "Jumlah keterlambatan", caraPerhitungan: "Jumlah keterlambatan penyelesaian laporan", bobot: 2, formula: { type: "zeroBest" } },
      { key: "f6_5", kpi: "Laporan fix bulanan dilaporkan maksimal H+3 setelah laporan bank keluar", caraUkur: "(Laporan tepat waktu ÷ Total laporan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
    ],
  },
  {
    no: 7,
    tugas: "Administrasi Perpajakan",
    total: 10,
    items: [
      { key: "f7_1", kpi: "Ketepatan administrasi pajak 100%", caraUkur: "Checklist dokumen pajak", caraPerhitungan: "0-100 (Checklist dokumen pajak)", bobot: 3, formula: { type: "direct" } },
      { key: "f7_2", kpi: "Ketepatan pelaporan pajak 100%", caraUkur: "(Laporan tepat waktu ÷ Total laporan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "direct" } },
      { key: "f7_3", kpi: "Ketepatan rekonsiliasi pajak 100%", caraUkur: "(Data sesuai ÷ Total data) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
      { key: "f7_4", kpi: "Kepatuhan pajak perusahaan 100% (diselesaikan maksimal tgl 15)", caraUkur: "Tidak ada sanksi/keterlambatan", caraPerhitungan: "0-∞ (Jumlah keterlambatan atau sanksi pajak)", bobot: 2, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 8,
    tugas: "Koordinasi Internal & Eksternal",
    total: 5,
    items: [
      { key: "f8_1", kpi: "Koordinasi memo pembebanan berjalan 100%", caraUkur: "(Koordinasi selesai ÷ Total kebutuhan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
      { key: "f8_2", kpi: "Koordinasi eksternal berjalan 100%", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Penilaian atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "f8_3", kpi: "Ketepatan rekonsiliasi marketplace 100%", caraUkur: "(Data sesuai ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
    ],
  },
  {
    no: 9,
    tugas: "Pengadaan Operasional & Bahan Baku",
    total: 5,
    items: [
      { key: "f9_1", kpi: "Ketepatan pembelian kebutuhan operasional 100%", caraUkur: "(Pembelian sesuai kebutuhan ÷ Total kebutuhan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
      { key: "f9_2", kpi: "Ketersediaan bahan baku produksi 100%", caraUkur: "(Kebutuhan terpenuhi ÷ Total kebutuhan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
      { key: "f9_3", kpi: "Koordinasi supplier berjalan 100%", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Penilaian atasan)", bobot: 1, formula: { type: "direct" } },
    ],
  },
  {
    no: 10,
    tugas: "Administrasi & Pelayanan Operasional",
    total: 5,
    items: [
      { key: "f10_1", kpi: "Kelengkapan dokumen administrasi 100%", caraUkur: "(Dokumen lengkap ÷ Total dokumen) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "direct" } },
      { key: "f10_2", kpi: "Kepuasan pelayanan customer 100%", caraUkur: "Penilaian customer/atasan", caraPerhitungan: "0-100 (Penilaian customer/atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "f10_3", kpi: "Kehilangan dokumen keuangan 0%", caraUkur: "Jumlah dokumen yang tidak hilang", caraPerhitungan: "0-∞ (Jumlah dokumen yang hilang)", bobot: 2, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 11,
    tugas: "Kebersihan Area Kerja",
    total: 5,
    items: [
      { key: "f11_1", kpi: "Kehadiran piket kebersihan", caraUkur: "(Piket terlaksana ÷ Jadwal) × 100%", caraPerhitungan: "0-8 (Jumlah total berapa kali karyawan melakukan piket kebersihan)", bobot: 1, formula: { type: "fixed", divisor: 8 } },
      { key: "f11_2", kpi: "Kebersihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "f11_3", kpi: "Pembersihan area kerja sebelum pulang", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "f11_4", kpi: "Kerapian dokumen & area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "f11_5", kpi: "Keluhan kebersihan area kerja", caraUkur: "100% jika tidak ada keluhan", caraPerhitungan: "0-∞ (Jumlah keluhan kebersihan area kerja)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
];

// row_key baris omzet (butuh Target & Realisasi, disimpan per PENEMPATAN).
export const FINANCE_OMZET_ROW_KEY = "f5_5";

// Target omzet default per bulan (index 0=Jan .. 11=Des), dari sheet. BISA diedit admin.
const AYRES_OMZET_DEFAULT = [
  311708287, 581957768, 294709312, 271099733, 267181071, 708726908,
  481364111, 422718091, 725061107, 566472986, 684500313, 684500313,
];
const TOKO_OMZET_DEFAULT = [
  1238539598, 997719087, 1852859272, 2518897287, 1756943430, 2525896095,
  2214233628, 3565710803, 2768944974, 2762046252, 2699104787, 2699104787,
];

// Normalisasi penempatan -> kunci omzet. 'ayres'/'toko' punya target default; lainnya default 0.
export function resolveFinancePlacementKey(penempatan: string | null | undefined): string {
  const p = (penempatan ?? "").trim().toLowerCase();
  if (p.includes("ayres")) return "ayres";
  if (p.includes("toko")) return "toko";
  return p || "lain";
}

export function getDefaultOmzetTarget(placementKey: string, month: number): number {
  const idx = Math.min(Math.max(month - 1, 0), 11);
  if (placementKey === "ayres") return AYRES_OMZET_DEFAULT[idx];
  if (placementKey === "toko") return TOKO_OMZET_DEFAULT[idx];
  return 0;
}

export type FinanceEmployee = {
  id: number;
  nama: string;
  jabatan: string | null;
  departemen: string | null;
  penempatan: string | null;
  placementKey: string;
};

export type KpiFinanceInputValue = {
  aktualData: string;
  hasilOverride: "terpenuhi" | "tidak" | null;
};

export const DEFAULT_KPI_HARI_KERJA = 23;

let kpiFinanceReady: Promise<void> | null = null;

export async function ensureKpiFinanceTables() {
  if (!kpiFinanceReady) {
    kpiFinanceReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kpi_finance_input (
          id INT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id INT NOT NULL,
          periode_bulan INT NOT NULL,
          periode_tahun INT NOT NULL,
          row_key VARCHAR(64) NOT NULL,
          aktual_data VARCHAR(255) NULL,
          perhitungan DECIMAL(7,2) NOT NULL DEFAULT 0,
          hasil_override ENUM('terpenuhi','tidak') NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_kpi_finance (karyawan_id, periode_bulan, periode_tahun, row_key),
          INDEX idx_kpi_finance_emp_period (karyawan_id, periode_bulan, periode_tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      // Omzet per PENEMPATAN (ayres/toko/…) per periode — target editable + realisasi.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kpi_finance_omzet (
          placement_key VARCHAR(32) NOT NULL,
          periode_bulan INT NOT NULL,
          periode_tahun INT NOT NULL,
          target DECIMAL(16,2) NOT NULL DEFAULT 0,
          realisasi DECIMAL(16,2) NOT NULL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (placement_key, periode_bulan, periode_tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kpi_finance_hari_kerja (
          periode_bulan INT NOT NULL,
          periode_tahun INT NOT NULL,
          hari_kerja INT NOT NULL DEFAULT ${DEFAULT_KPI_HARI_KERJA},
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (periode_bulan, periode_tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })();
  }
  return kpiFinanceReady;
}

// Karyawan Staff departemen Finance (nama otomatis dari database).
export async function getFinanceStaffEmployees(): Promise<FinanceEmployee[]> {
  const [rows] = await pool.query<
    (RowDataPacket & {
      id: number; nama: string; jabatan: string | null; departemen: string | null; penempatan: string | null;
    })[]
  >(
    `SELECT k.id, k.nama, k.jabatan, k.departemen, k.penempatan
       FROM karyawan k
      WHERE k.status_data = 'aktif'
        AND LOWER(COALESCE(k.jabatan, '')) LIKE '%staff%'
        AND (
          LOWER(COALESCE(k.departemen, '')) LIKE '%finance%'
          OR LOWER(COALESCE(k.departemen, '')) LIKE '%keuangan%'
        )
      ORDER BY k.nama ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    jabatan: r.jabatan,
    departemen: r.departemen,
    penempatan: r.penempatan,
    placementKey: resolveFinancePlacementKey(r.penempatan),
  }));
}

export async function getKpiFinanceInputs(
  employeeId: number,
  month: number,
  year: number,
): Promise<Record<string, KpiFinanceInputValue>> {
  await ensureKpiFinanceTables();
  const [rows] = await pool.query<
    (RowDataPacket & { row_key: string; aktual_data: string | null; hasil_override: "terpenuhi" | "tidak" | null })[]
  >(
    `SELECT row_key, aktual_data, hasil_override
       FROM kpi_finance_input
      WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ?`,
    [employeeId, month, year],
  );
  const map: Record<string, KpiFinanceInputValue> = {};
  for (const r of rows) {
    map[r.row_key] = { aktualData: r.aktual_data ?? "", hasilOverride: r.hasil_override };
  }
  return map;
}

export type KpiFinanceInputRow = {
  key: string;
  aktualData: string;
  perhitungan: number;
  hasilOverride: "terpenuhi" | "tidak" | null;
};

export async function upsertKpiFinanceInputs(
  employeeId: number,
  month: number,
  year: number,
  rows: KpiFinanceInputRow[],
) {
  await ensureKpiFinanceTables();
  if (!Number.isInteger(employeeId) || employeeId <= 0) throw new Error("Karyawan tidak valid.");
  if (!rows.length) return;

  const validKeys = new Set(FINANCE_KPI.flatMap((g) => g.items.map((i) => i.key)));
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of rows) {
      if (!validKeys.has(row.key)) continue;
      const perhitungan = Number.isFinite(row.perhitungan) ? row.perhitungan : 0;
      const override =
        row.hasilOverride === "terpenuhi" || row.hasilOverride === "tidak" ? row.hasilOverride : null;
      await conn.query<ResultSetHeader>(
        `INSERT INTO kpi_finance_input
           (karyawan_id, periode_bulan, periode_tahun, row_key, aktual_data, perhitungan, hasil_override)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           aktual_data = VALUES(aktual_data),
           perhitungan = VALUES(perhitungan),
           hasil_override = VALUES(hasil_override)`,
        [employeeId, month, year, row.key, row.aktualData || null, perhitungan, override],
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export type KpiFinanceOmzet = { target: number; realisasi: number };

export async function getKpiFinanceOmzet(
  placementKey: string,
  month: number,
  year: number,
): Promise<KpiFinanceOmzet> {
  await ensureKpiFinanceTables();
  const [rows] = await pool.query<(RowDataPacket & { target: string; realisasi: string })[]>(
    `SELECT target, realisasi FROM kpi_finance_omzet
      WHERE placement_key = ? AND periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [placementKey, month, year],
  );
  if (rows[0]) {
    return { target: Number(rows[0].target) || 0, realisasi: Number(rows[0].realisasi) || 0 };
  }
  // Belum ada → target default (dari sheet), realisasi 0.
  return { target: getDefaultOmzetTarget(placementKey, month), realisasi: 0 };
}

export async function upsertKpiFinanceOmzet(
  placementKey: string,
  month: number,
  year: number,
  target: number,
  realisasi: number,
) {
  await ensureKpiFinanceTables();
  const t = Number.isFinite(target) && target >= 0 ? target : 0;
  const r = Number.isFinite(realisasi) && realisasi >= 0 ? realisasi : 0;
  await pool.query(
    `INSERT INTO kpi_finance_omzet (placement_key, periode_bulan, periode_tahun, target, realisasi)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE target = VALUES(target), realisasi = VALUES(realisasi)`,
    [placementKey, month, year, t, r],
  );
  return { target: t, realisasi: r };
}

export async function getKpiFinanceHariKerja(month: number, year: number): Promise<number> {
  await ensureKpiFinanceTables();
  const [rows] = await pool.query<(RowDataPacket & { hari_kerja: number })[]>(
    `SELECT hari_kerja FROM kpi_finance_hari_kerja WHERE periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [month, year],
  );
  const v = rows[0]?.hari_kerja;
  return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : DEFAULT_KPI_HARI_KERJA;
}

export async function upsertKpiFinanceHariKerja(month: number, year: number, hariKerja: number) {
  await ensureKpiFinanceTables();
  const value = Number.isInteger(hariKerja) && hariKerja > 0 ? hariKerja : DEFAULT_KPI_HARI_KERJA;
  await pool.query(
    `INSERT INTO kpi_finance_hari_kerja (periode_bulan, periode_tahun, hari_kerja)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE hari_kerja = VALUES(hari_kerja)`,
    [month, year, value],
  );
  return value;
}

export function getDefaultKpiPeriod() {
  const active = getActivePayrollPeriod();
  return { month: active.month, year: active.year };
}

export function formatKpiPeriodLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(
    new Date(year, month - 1, 1),
  );
}
