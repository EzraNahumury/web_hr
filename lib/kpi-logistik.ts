import type { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import type { KpiGroup } from "@/lib/kpi-rnd";
import type { SalesRetailEmployee } from "@/lib/kpi-sales-retail";

// ─────────────────────────────────────────────────────────────────────────────
// KPI LOGISTIK — jabatan Supervisor, divisi Logistik. Total bobot 100%.
// Konvensi formula (lihat lib/kpi-formula.ts):
//   - default (workdays) : aktual ÷ Hari Kerja × 100  (absensi, seragam)
//   - late               : keterlambatan ≤5x
//   - zeroBest           : 0-∞ jumlah (pelanggaran/teguran/keluhan/kejadian) → 0=100%, >0=0%
//   - direct             : 0-100 (nilai audit/penilaian/checklist)
//   - ratio              : 0-1 (hasil dari perhitungan cara ukur, atau realisasi ÷ target)
// ─────────────────────────────────────────────────────────────────────────────
export const LOGISTIK_SPV_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran Kerja",
    total: 5,
    items: [
      { key: "log1_1", kpi: "Kepatuhan absensi masuk dan pulang", caraUkur: "(Hari hadir lengkap ÷ Hari kerja) × 100%", caraPerhitungan: "Jumlah hari hadir", bobot: 3 },
      { key: "log1_2", kpi: "Tingkat keterlambatan kerja < 5 kali/bulan", caraUkur: "((5 − Jumlah keterlambatan) ÷ 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 2, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Disiplin & Kepatuhan Kerja",
    total: 5,
    items: [
      { key: "log2_1", kpi: "Kepatuhan penggunaan seragam", caraUkur: "(Hari patuh seragam ÷ Hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh memakai seragam)", bobot: 2 },
      { key: "log2_2", kpi: "Kepatuhan terhadap peraturan perusahaan", caraUkur: "Jumlah pelanggaran", caraPerhitungan: "0-∞ (Jumlah pelanggaran peraturan perusahaan)", bobot: 2, formula: { type: "zeroBest" } },
      { key: "log2_3", kpi: "Etika dan profesionalitas kerja", caraUkur: "Jumlah teguran", caraPerhitungan: "0-∞ (Jumlah teguran etika kerja)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 3,
    tugas: "Pengelolaan Operasional Gudang",
    total: 20,
    items: [
      { key: "log3_1", kpi: "Operasional gudang berjalan sesuai SOP", caraUkur: "Audit internal", caraPerhitungan: "0-100 (Nilai audit internal)", bobot: 8, formula: { type: "direct" } },
      { key: "log3_2", kpi: "Target operasional tim gudang tercapai", caraUkur: "(Output tercapai ÷ Target) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6, formula: { type: "ratio" } },
      { key: "log3_3", kpi: "Penanganan kendala operasional ≤ 1x24 jam", caraUkur: "(Kasus selesai tepat waktu ÷ Total kasus) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "log3_4", kpi: "Efisiensi pembagian kerja tim gudang", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Penilaian atasan)", bobot: 2, formula: { type: "direct" } },
    ],
  },
  {
    no: 4,
    tugas: "Pengendalian & Akurasi Persediaan Barang",
    total: 25,
    items: [
      { key: "log4_1", kpi: "Akurasi stok minimal 99%", caraUkur: "(Stok sesuai ÷ Total stok) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 10, formula: { type: "ratio" } },
      { key: "log4_2", kpi: "Seluruh selisih stok ditindaklanjuti", caraUkur: "(Kasus selesai ÷ Total selisih) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6, formula: { type: "ratio" } },
      { key: "log4_3", kpi: "Tidak terjadi stock out akibat monitoring", caraUkur: "100% jika tidak terjadi", caraPerhitungan: "0-∞ (Jumlah kejadian stock out)", bobot: 5, formula: { type: "zeroBest" } },
      { key: "log4_4", kpi: "Kartu stok terupdate real-time", caraUkur: "(Update tepat waktu ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
    ],
  },
  {
    no: 5,
    tugas: "Koordinasi & Sinkronisasi Data Stok Antar Divisi",
    total: 10,
    items: [
      { key: "log5_1", kpi: "Akurasi informasi stok kepada divisi terkait", caraUkur: "(Informasi benar ÷ Total informasi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "log5_2", kpi: "Ketepatan waktu penyampaian informasi stok", caraUkur: "(Tepat waktu ÷ Total informasi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "log5_3", kpi: "Tidak ada gangguan operasional akibat stok", caraUkur: "100% jika tidak terjadi", caraPerhitungan: "0-∞ (Jumlah gangguan operasional akibat stok)", bobot: 3, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 6,
    tugas: "Pelaporan Operasional Logistik",
    total: 10,
    items: [
      { key: "log6_1", kpi: "Laporan harian tepat waktu", caraUkur: "(Laporan tepat waktu ÷ Total hari kerja) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "log6_2", kpi: "Laporan berkala (2x/bulan) tepat waktu", caraUkur: "(Tepat waktu ÷ Total laporan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "log6_3", kpi: "Akurasi isi laporan logistik", caraUkur: "Audit atasan", caraPerhitungan: "0-100 (Nilai audit atasan)", bobot: 3, formula: { type: "direct" } },
    ],
  },
  {
    no: 7,
    tugas: "Dukungan Distribusi & Pelayanan Operasional",
    total: 10,
    items: [
      { key: "log7_1", kpi: "Akurasi scan & distribusi barang keluar", caraUkur: "(Data sesuai ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "log7_2", kpi: "Respons stok kosong ke pelanggan ≤ 30 menit", caraUkur: "(Respons tepat waktu ÷ Total kasus) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "log7_3", kpi: "Penyelesaian kendala distribusi ≤ 1x24 jam", caraUkur: "(Kasus selesai ÷ Total kasus) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
    ],
  },
  {
    no: 8,
    tugas: "Manajemen Tim Gudang",
    total: 10,
    items: [
      { key: "log8_1", kpi: "Pembagian kerja tim efektif", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Penilaian atasan)", bobot: 4, formula: { type: "direct" } },
      { key: "log8_2", kpi: "Monitoring kinerja staf gudang harian", caraUkur: "Checklist supervisi", caraPerhitungan: "0-100 (Nilai checklist supervisi)", bobot: 3, formula: { type: "direct" } },
      { key: "log8_3", kpi: "Penyelesaian tugas tim sesuai target", caraUkur: "(Output tercapai ÷ Target) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
    ],
  },
  {
    no: 9,
    tugas: "Kebersihan & Kerapihan Area Kerja",
    total: 5,
    items: [
      { key: "log9_1", kpi: "Pelaksanaan piket kebersihan", caraUkur: "(Piket terlaksana ÷ Jadwal) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1, formula: { type: "ratio" } },
      { key: "log9_2", kpi: "Kebersihan area gudang", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Nilai checklist atasan)", bobot: 2, formula: { type: "direct" } },
      { key: "log9_3", kpi: "Kerapihan penyimpanan barang", caraUkur: "Audit gudang", caraPerhitungan: "0-100 (Nilai audit gudang)", bobot: 1, formula: { type: "direct" } },
      { key: "log9_4", kpi: "Tidak ada keluhan kebersihan", caraUkur: "100% jika tidak terjadi", caraPerhitungan: "0-∞ (Jumlah keluhan kebersihan)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
];

// Karyawan KPI Logistik = jabatan Supervisor + divisi Logistik (aktif). Nama otomatis dari DB.
export async function getLogistikEmployees(): Promise<SalesRetailEmployee[]> {
  const [rows] = await pool.query<
    (RowDataPacket & {
      id: number; nama: string; jabatan: string | null; sub_divisi: string | null; penempatan: string | null;
    })[]
  >(
    `SELECT k.id, k.nama, k.jabatan, k.sub_divisi, k.penempatan
       FROM karyawan k
      WHERE k.status_data = 'aktif'
        AND LOWER(COALESCE(k.jabatan, '')) = 'supervisor'
        AND LOWER(COALESCE(k.divisi, '')) = 'logistik'
      ORDER BY k.nama ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    jabatan: r.jabatan,
    subDivisi: r.sub_divisi,
    penempatan: r.penempatan,
    csType: null,
  }));
}
