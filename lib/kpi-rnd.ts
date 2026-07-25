import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { getActivePayrollPeriod } from "@/lib/payroll-admin";

// ─────────────────────────────────────────────────────────────────────────────
// Template KPI RnD (statis). Diambil dari sheet penilaian KPI:
//   - Staff RnD  : 12 kelompok tugas, total bobot 100%.
//   - SPV RnD    : 11 kelompok tugas, total bobot 100%.
// Nama karyawan OTOMATIS dari database (divisi RnD). Jabatan Supervisor/SPV
// memakai template SPV, jabatan lain memakai template Staff.
// ─────────────────────────────────────────────────────────────────────────────

export type { KpiFormula } from "@/lib/kpi-formula";
export { computeKpiPerhitungan } from "@/lib/kpi-formula";
import type { KpiFormula } from "@/lib/kpi-formula";

export type KpiRole = "staff" | "spv";

export type KpiItem = {
  key: string; // stabil, dipakai sebagai penyimpanan input per baris
  kpi: string;
  caraUkur: string;
  caraPerhitungan: string;
  bobot: number; // persen (mis. 3 = 3%)
  formula?: KpiFormula; // default = { type: "workdays" }
};

export type KpiGroup = {
  no: number;
  tugas: string;
  total: number; // total bobot kelompok (persen)
  items: KpiItem[];
};

export const STAFF_RND_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran Kerja",
    total: 5,
    items: [
      { key: "s1_1", kpi: "Kepatuhan absensi masuk dan pulang", caraUkur: "(Hari hadir lengkap ÷ Hari kerja)×100%", caraPerhitungan: "Jumlah hari dia hadir", bobot: 3 },
      { key: "s1_2", kpi: "Keterlambatan kerja ≤5x", caraUkur: "((5 - Jumlah Keterlambatan) / 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 2, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Disiplin & Kepatuhan Kerja",
    total: 3,
    items: [
      { key: "s2_1", kpi: "Kepatuhan penggunaan seragam", caraUkur: "(Jumlah hari tidak patuh ÷ Hari kerja) x 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh memakai seragam)", bobot: 1 },
      { key: "s2_2", kpi: "Kehadiran briefing tepat waktu", caraUkur: "(Hari hadir briefing ÷ Hari kerja)×100%", caraPerhitungan: "1-25 (Berapa hari dia mengikuti briefing tepat waktu)", bobot: 1, formula: { type: "fixed", divisor: 25 } },
      { key: "s2_3", kpi: "Kepatuhan terhadap peraturan perusahaan", caraUkur: "Jumlah pelanggaran", caraPerhitungan: "0-∞ (Jumlah pelanggaran peraturan perusahaan)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 3,
    tugas: "Riset & Pengembangan Produk",
    total: 15,
    items: [
      { key: "s3_1", kpi: "Seluruh worklist ditindaklanjuti", caraUkur: "(Worklist selesai ÷ Total worklist)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6 },
      { key: "s3_2", kpi: "Progress pekerjaan dilaporkan setiap hari", caraUkur: "(Hari laporan ÷ Hari kerja)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4 },
      { key: "s3_3", kpi: "Tidak ada pekerjaan yang terlewat", caraUkur: "(Worklist selesai ÷ Total worklist)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
    ],
  },
  {
    no: 4,
    tugas: "Pengembangan Desain Produk",
    total: 20,
    items: [
      { key: "s4_1", kpi: "Target desain Jersey Dunia", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain Jersey Dunia yang diselesaikan", bobot: 5 },
      { key: "s4_2", kpi: "Target desain Jersey Nusantara", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain Jersey Nusantara yang diselesaikan", bobot: 5 },
      { key: "s4_3", kpi: "Target desain glove", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain glove yang diselesaikan", bobot: 4 },
      { key: "s4_4", kpi: "Seluruh desain selesai sesuai deadline", caraUkur: "(Desain tepat waktu ÷ Total desain) ×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6 },
    ],
  },
  {
    no: 5,
    tugas: "Pengembangan Pola Produk",
    total: 14,
    items: [
      { key: "s5_1", kpi: "Seluruh pola selesai sesuai deadline", caraUkur: "(Pola selesai ÷ Target pola)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
      { key: "s5_2", kpi: "Tingkat kesalahan pola maksimal 1%", caraUkur: "(Pola benar ÷ Total pola)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
      { key: "s5_3", kpi: "Seluruh revisi pola terselesaikan", caraUkur: "(Revisi selesai ÷ Total revisi)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4 },
    ],
  },
  {
    no: 6,
    tugas: "Validasi Desain & Pola (CLO 3D)",
    total: 5,
    items: [
      { key: "s6_1", kpi: "Seluruh pola baru divalidasi CLO 3D", caraUkur: "(Pola tervalidasi ÷ Total pola baru)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3 },
      { key: "s6_2", kpi: "Tidak terdapat kesalahan ukuran mayor saat sampling", caraUkur: "(Sampling tanpa error mayor ÷ Total sampling)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2 },
    ],
  },
  {
    no: 7,
    tugas: "Pengelolaan Database Pattern Lab",
    total: 5,
    items: [
      { key: "s7_1", kpi: "Database Pattern Lab terupdate", caraUkur: "(Update terlaksana ÷ Target update)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2 },
      { key: "s7_2", kpi: "Tidak ada kehilangan file pola", caraUkur: "100% jika tidak ada kehilangan file", caraPerhitungan: "0-∞ (Jumlah file pola yang hilang)", bobot: 2, formula: { type: "zeroBest" } },
      { key: "s7_3", kpi: "Ketersediaan pola saat dibutuhkan", caraUkur: "(Permintaan terpenuhi ÷ Total permintaan)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1 },
    ],
  },
  {
    no: 8,
    tugas: "Proses Sampling Produk",
    total: 10,
    items: [
      { key: "s8_1", kpi: "Seluruh sampling selesai sesuai jadwal", caraUkur: "(Sampling tepat waktu ÷ Total sampling)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
      { key: "s8_2", kpi: "Tingkat keberhasilan sampling", caraUkur: "(Sampling berhasil ÷ Total sampling)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
    ],
  },
  {
    no: 9,
    tugas: "Desain Katalog & Media Promosi",
    total: 8,
    items: [
      { key: "s9_1", kpi: "Target desain katalog", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain katalog yang diselesaikan", bobot: 3 },
      { key: "s9_2", kpi: "Target desain marketplace", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain marketplace yang diselesaikan", bobot: 3 },
      { key: "s9_3", kpi: "Seluruh desain selesai sesuai deadline", caraUkur: "(Desain tepat waktu ÷ Total desain) ×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2 },
    ],
  },
  {
    no: 10,
    tugas: "Penyusunan Tech Pack",
    total: 5,
    items: [
      { key: "s10_1", kpi: "Seluruh desain ACC memiliki Tech Pack", caraUkur: "(Tech tersedia ÷ Total desain ACC)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3 },
      { key: "s10_2", kpi: "Tingkat kesalahan data Tech Pack", caraUkur: "(Tech Pack benar ÷ Total Tech Pack)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2 },
    ],
  },
  {
    no: 11,
    tugas: "Pekerjaan Desain By Order Internal",
    total: 5,
    items: [
      { key: "s11_1", kpi: "Seluruh pekerjaan selesai sesuai deadline", caraUkur: "(Pekerjaan tepat waktu ÷ Total pekerjaan)×100%", caraPerhitungan: "0-100", bobot: 3 },
      { key: "s11_2", kpi: "Tingkat kepuasan pengguna internal", caraUkur: "Penilaian user internal", caraPerhitungan: "0-100", bobot: 2 },
    ],
  },
  {
    no: 12,
    tugas: "Kebersihan & Kerapihan Area Kerja",
    total: 5,
    items: [
      { key: "s12_1", kpi: "Kehadiran pelaksanaan piket", caraUkur: "(Piket terlaksana ÷ Jadwal piket)×100%", caraPerhitungan: "0-8 (Jumlah total berapa kali karyawan melakukan piket kebersihan)", bobot: 1 },
      { key: "s12_2", kpi: "Tingkat kebersihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100", bobot: 2 },
      { key: "s12_3", kpi: "Tingkat kerapihan penyimpanan dokumen dan file kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100", bobot: 1 },
      { key: "s12_4", kpi: "Tidak ada keluhan terkait kebersihan area kerja", caraUkur: "100% jika tidak ada keluhan", caraPerhitungan: "0-∞ (Jumlah keluhan terkait kebersihan area kerja)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
];

export const SPV_RND_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran Kerja",
    total: 3,
    items: [
      { key: "v1_1", kpi: "Kepatuhan absensi masuk dan pulang", caraUkur: "(Hari hadir lengkap ÷ Hari kerja)×100%", caraPerhitungan: "Jumlah hari dia hadir", bobot: 2 },
      { key: "v1_2", kpi: "Tingkat keterlambatan kerja ≤ 5 kali/bulan", caraUkur: "((5 - Jumlah Keterlambatan) / 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 1, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Disiplin & Kepatuhan Kerja",
    total: 2,
    items: [
      { key: "v2_1", kpi: "Kepatuhan penggunaan seragam", caraUkur: "(Jumlah hari patuh ÷ Hari kerja) x 100%", caraPerhitungan: "1-25 (Berapa hari dia menggunakan seragam)", bobot: 1 },
      { key: "v2_2", kpi: "Kepatuhan terhadap peraturan perusahaan", caraUkur: "Jumlah pelanggaran", caraPerhitungan: "0-∞ (Jumlah pelanggaran peraturan perusahaan)", bobot: 0.5, formula: { type: "zeroBest" } },
      { key: "v2_3", kpi: "Etika dan profesionalitas kerja", caraUkur: "Jumlah teguran", caraPerhitungan: "0-∞ (Jumlah teguran etika kerja)", bobot: 0.5, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 3,
    tugas: "Perencanaan & Pengelolaan Tim RnD",
    total: 20,
    items: [
      { key: "v3_1", kpi: "Worklist tersusun setiap minggu", caraUkur: "(Worklist selesai ÷ Target)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
      { key: "v3_2", kpi: "Seluruh pekerjaan terdokumentasi di Notion", caraUkur: "(Pekerjaan terdokumentasi ÷ Total pekerjaan)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
      { key: "v3_3", kpi: "Target desain Jersey Dunia tim tercapai", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain Jersey Dunia yang diselesaikan", bobot: 3 },
      { key: "v3_4", kpi: "Target desain Jersey Nusantara tim tercapai", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain Jersey Nusantara yang diselesaikan", bobot: 3 },
      { key: "v3_5", kpi: "Target desain glove tim tercapai", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain glove yang diselesaikan", bobot: 4 },
    ],
  },
  {
    no: 4,
    tugas: "Pengelolaan Pekerjaan By Order & Prioritas",
    total: 10,
    items: [
      { key: "v4_1", kpi: "Seluruh pekerjaan by order terdistribusi", caraUkur: "(Pekerjaan terdistribusi ÷ Total pekerjaan)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4 },
      { key: "v4_2", kpi: "Ketepatan penyelesaian pekerjaan", caraUkur: "(Pekerjaan tepat waktu ÷ Total pekerjaan) ×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4 },
      { key: "v4_3", kpi: "Tidak terjadi overload kerja signifikan", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100", bobot: 2 },
    ],
  },
  {
    no: 5,
    tugas: "Pengembangan Produk Baru",
    total: 20,
    items: [
      { key: "v5_1", kpi: "Minimal 1 pengembangan produk baru per bulan", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah produk baru yang berhasil dikembangkan", bobot: 8 },
      { key: "v5_2", kpi: "Seluruh konsep produk memiliki analisis pasar dan HPP", caraUkur: "(Konsep lengkap ÷ Total konsep)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6 },
      { key: "v5_3", kpi: "Proposal produk selesai sesuai target", caraUkur: "(Proposal selesai tepat waktu ÷ Total proposal)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6 },
    ],
  },
  {
    no: 6,
    tugas: "Pengembangan & Approval Desain Produk",
    total: 10,
    items: [
      { key: "v6_1", kpi: "Target desain glove supervisor tercapai", caraUkur: "(Aktual ÷ Target)×100%", caraPerhitungan: "Jumlah desain glove supervisor yang diselesaikan", bobot: 4 },
      { key: "v6_2", kpi: "Target desain sesuai kalender launching", caraUkur: "(Desain selesai ÷ Target launching)×100%", caraPerhitungan: "Jumlah desain yang selesai sesuai jadwal launching", bobot: 3 },
      { key: "v6_3", kpi: "Tingkat revisi mayor maksimal 10%", caraUkur: "(Desain tanpa revisi mayor ÷ Total desain)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3 },
    ],
  },
  {
    no: 7,
    tugas: "Pengawasan Kualitas Hasil Kerja Tim RnD",
    total: 10,
    items: [
      { key: "v7_1", kpi: "Tingkat kesalahan pekerjaan tim 0%", caraUkur: "(Pekerjaan benar ÷ Total pekerjaan)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
      { key: "v7_2", kpi: "Seluruh hasil kerja melalui proses review", caraUkur: "(Hasil direview ÷ Total hasil kerja)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5 },
    ],
  },
  {
    no: 8,
    tugas: "Koordinasi Lintas Divisi",
    total: 8,
    items: [
      { key: "v8_1", kpi: "Seluruh kebutuhan koordinasi ditindaklanjuti", caraUkur: "(Koordinasi selesai ÷ Total koordinasi)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3 },
      { key: "v8_2", kpi: "Tidak ada keterlambatan proyek akibat miskomunikasi", caraUkur: "(Proyek tanpa keterlambatan ÷ Total proyek)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3 },
      { key: "v8_3", kpi: "Kecepatan respon koordinasi", caraUkur: "Penilaian atasan/divisi terkait", caraPerhitungan: "0-100", bobot: 2 },
    ],
  },
  {
    no: 9,
    tugas: "Pengendalian Sampling & Penyelesaian Masalah Teknis",
    total: 10,
    items: [
      { key: "v9_1", kpi: "Tingkat keberhasilan sampling ≥95%", caraUkur: "(Sampling berhasil ÷ Total sampling)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4 },
      { key: "v9_2", kpi: "Kendala produksi ditindaklanjuti ≤1x24 jam", caraUkur: "(Kendala tertangani tepat waktu ÷ Total kendala)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3 },
      { key: "v9_3", kpi: "Penyelesaian masalah teknis maksimal H+2", caraUkur: "(Masalah selesai tepat waktu ÷ Total masalah)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2 },
      { key: "v9_4", kpi: "Tingkat pengulangan masalah ≤10%", caraUkur: "(Masalah tidak berulang ÷ Total masalah)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1 },
    ],
  },
  {
    no: 10,
    tugas: "Pelaporan Operasional RnD",
    total: 4,
    items: [
      { key: "v10_1", kpi: "Ketepatan laporan harian", caraUkur: "(Laporan tepat waktu ÷ Total laporan)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1 },
      { key: "v10_2", kpi: "Ketepatan laporan mingguan", caraUkur: "(Laporan tepat waktu ÷ Total laporan)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1 },
      { key: "v10_3", kpi: "Ketepatan laporan bulanan", caraUkur: "(Laporan tepat waktu ÷ Total laporan)×100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1 },
      { key: "v10_4", kpi: "Kelengkapan laporan operasional", caraUkur: "Checklist manajemen", caraPerhitungan: "0-100", bobot: 1 },
    ],
  },
  {
    no: 11,
    tugas: "Kebersihan & Kerapihan Area Kerja",
    total: 3,
    items: [
      { key: "v11_1", kpi: "Kehadiran pelaksanaan piket", caraUkur: "(Piket terlaksana ÷ Jadwal piket)×100%", caraPerhitungan: "0-8 (Jumlah total berapa kali karyawan melakukan piket kebersihan)", bobot: 1 },
      { key: "v11_2", kpi: "Tingkat kebersihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100", bobot: 1 },
      { key: "v11_3", kpi: "Tingkat kerapihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100", bobot: 1 },
    ],
  },
];

export function getKpiTemplate(role: KpiRole): KpiGroup[] {
  return role === "spv" ? SPV_RND_KPI : STAFF_RND_KPI;
}

// SPV/Supervisor -> template SPV; selain itu -> template Staff.
export function resolveRndRole(jabatan: string | null | undefined): KpiRole {
  const j = (jabatan ?? "").trim().toLowerCase();
  if (j.includes("spv") || j.includes("supervisor")) return "spv";
  return "staff";
}

export type RndEmployee = {
  id: number;
  nama: string;
  jabatan: string | null;
  divisi: string | null;
  role: KpiRole;
};

export type KpiRndInputValue = {
  aktualData: string;
  perhitungan: number; // persen 0-100+ (hasil dari cara ukur, diinput admin)
  hasilOverride: "terpenuhi" | "tidak" | null; // null = otomatis dari perhitungan
};

// Pembagi default rumus Perhitungan (= aktual data / hari kerja). Bisa diubah per periode.
export const DEFAULT_KPI_HARI_KERJA = 23;

let kpiRndTableReady: Promise<void> | null = null;

export async function ensureKpiRndTable() {
  if (!kpiRndTableReady) {
    kpiRndTableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kpi_rnd_input (
          id INT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id INT NOT NULL,
          periode_bulan INT NOT NULL,
          periode_tahun INT NOT NULL,
          row_key VARCHAR(64) NOT NULL,
          aktual_data VARCHAR(255) NULL,
          perhitungan DECIMAL(7,2) NOT NULL DEFAULT 0,
          hasil_override ENUM('terpenuhi','tidak') NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_kpi_rnd (karyawan_id, periode_bulan, periode_tahun, row_key),
          INDEX idx_kpi_rnd_emp_period (karyawan_id, periode_bulan, periode_tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      // Hari kerja (pembagi Perhitungan) per periode — sama untuk semua karyawan di bulan itu.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kpi_rnd_hari_kerja (
          periode_bulan INT NOT NULL,
          periode_tahun INT NOT NULL,
          hari_kerja INT NOT NULL DEFAULT ${DEFAULT_KPI_HARI_KERJA},
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (periode_bulan, periode_tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })();
  }
  return kpiRndTableReady;
}

// Hari kerja (pembagi rumus Perhitungan) untuk suatu periode. Default 23.
export async function getKpiRndHariKerja(month: number, year: number): Promise<number> {
  await ensureKpiRndTable();
  const [rows] = await pool.query<(RowDataPacket & { hari_kerja: number })[]>(
    `SELECT hari_kerja FROM kpi_rnd_hari_kerja WHERE periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [month, year],
  );
  const v = rows[0]?.hari_kerja;
  return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : DEFAULT_KPI_HARI_KERJA;
}

export async function upsertKpiRndHariKerja(month: number, year: number, hariKerja: number) {
  await ensureKpiRndTable();
  const value = Number.isInteger(hariKerja) && hariKerja > 0 ? hariKerja : DEFAULT_KPI_HARI_KERJA;
  await pool.query(
    `INSERT INTO kpi_rnd_hari_kerja (periode_bulan, periode_tahun, hari_kerja)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE hari_kerja = VALUES(hari_kerja)`,
    [month, year, value],
  );
  return value;
}

// Karyawan divisi RnD (nama otomatis dari database).
export async function getRndEmployees(): Promise<RndEmployee[]> {
  const [rows] = await pool.query<
    (RowDataPacket & { id: number; nama: string; jabatan: string | null; divisi: string | null })[]
  >(
    `SELECT k.id, k.nama, k.jabatan, k.divisi
       FROM karyawan k
      WHERE k.status_data = 'aktif'
        AND (
          LOWER(REPLACE(REPLACE(REPLACE(COALESCE(k.divisi, ''), ' ', ''), '&', ''), '.', '')) IN ('rnd', 'rd')
          OR LOWER(REPLACE(REPLACE(REPLACE(COALESCE(k.sub_divisi, ''), ' ', ''), '&', ''), '.', '')) IN ('rnd', 'rd')
          OR LOWER(COALESCE(k.divisi, '')) LIKE '%rnd%'
          OR LOWER(COALESCE(k.sub_divisi, '')) LIKE '%rnd%'
          OR LOWER(COALESCE(k.departemen, '')) LIKE '%rnd%'
          OR LOWER(COALESCE(k.divisi, '')) LIKE '%riset%'
          OR LOWER(COALESCE(k.sub_divisi, '')) LIKE '%riset%'
        )
      ORDER BY k.nama ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    jabatan: r.jabatan,
    divisi: r.divisi,
    role: resolveRndRole(r.jabatan),
  }));
}

export async function getKpiRndInputs(
  employeeId: number,
  month: number,
  year: number,
): Promise<Record<string, KpiRndInputValue>> {
  await ensureKpiRndTable();
  const [rows] = await pool.query<
    (RowDataPacket & {
      row_key: string;
      aktual_data: string | null;
      perhitungan: string;
      hasil_override: "terpenuhi" | "tidak" | null;
    })[]
  >(
    `SELECT row_key, aktual_data, perhitungan, hasil_override
       FROM kpi_rnd_input
      WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ?`,
    [employeeId, month, year],
  );
  const map: Record<string, KpiRndInputValue> = {};
  for (const r of rows) {
    map[r.row_key] = {
      aktualData: r.aktual_data ?? "",
      perhitungan: Number(r.perhitungan) || 0,
      hasilOverride: r.hasil_override,
    };
  }
  return map;
}

export type KpiRndInputRow = {
  key: string;
  aktualData: string;
  perhitungan: number;
  hasilOverride: "terpenuhi" | "tidak" | null;
};

export async function upsertKpiRndInputs(
  employeeId: number,
  month: number,
  year: number,
  rows: KpiRndInputRow[],
) {
  await ensureKpiRndTable();
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    throw new Error("Karyawan tidak valid.");
  }
  if (!rows.length) return;

  // Batasi row_key hanya yang ada di template supaya tidak menyimpan sampah.
  const validKeys = new Set(
    [...STAFF_RND_KPI, ...SPV_RND_KPI].flatMap((g) => g.items.map((i) => i.key)),
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of rows) {
      if (!validKeys.has(row.key)) continue;
      const perhitungan = Number.isFinite(row.perhitungan) ? row.perhitungan : 0;
      const override =
        row.hasilOverride === "terpenuhi" || row.hasilOverride === "tidak"
          ? row.hasilOverride
          : null;
      await conn.query<ResultSetHeader>(
        `INSERT INTO kpi_rnd_input
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

export function getDefaultKpiPeriod() {
  const active = getActivePayrollPeriod();
  return { month: active.month, year: active.year };
}

export function formatKpiPeriodLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(year, month - 1, 1));
}
