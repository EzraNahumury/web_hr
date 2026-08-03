import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { getActivePayrollPeriod } from "@/lib/payroll-admin";
import type { KpiGroup } from "@/lib/kpi-rnd";

// ─────────────────────────────────────────────────────────────────────────────
// KPI SALES & RETAIL — sub divisi Customer Service.
// Template dipilih berdasarkan cs_type karyawan: selling / order / grosir / marketplace.
// Konvensi input (dari sheet CS):
//   - workdays : aktual (jumlah hari) ÷ Hari Kerja × 100  (absensi, seragam, dll)
//   - late     : keterlambatan ≤5x
//   - ratio    : baris "0-1" → admin isi rasio 0-1, Perhitungan = aktual × 100
//   - direct   : baris "0-100" penilaian/checklist → aktual = persen
//   - zeroBest : baris "0-∞ jumlah" (komplain/error/keluhan) → 0 = 100%, >0 = 0%
//   - fixed    : piket ÷ 8, closing ÷ 5625, omzet ÷ target (aktual = realisasi)
// ─────────────────────────────────────────────────────────────────────────────

export type CsType = "selling" | "order" | "grosir" | "marketplace";

export const CS_SELLING_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran",
    total: 5,
    items: [
      { key: "sel1_1", kpi: "Kepatuhan absensi 100%", caraUkur: "(Hari hadir ÷ Hari kerja) × 100%", caraPerhitungan: "Jumlah hari dia hadir", bobot: 3 },
      { key: "sel1_2", kpi: "Keterlambatan kerja ≤5x", caraUkur: "((5 - Jumlah Keterlambatan) ÷ 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 2, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Kedisiplinan & Etika Kerja",
    total: 5,
    items: [
      { key: "sel2_1", kpi: "Kepatuhan penggunaan seragam 100%", caraUkur: "(Hari patuh seragam ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai seragam)", bobot: 1 },
      { key: "sel2_2", kpi: "Kepatuhan penggunaan ID Card 100%", caraUkur: "(Hari pakai ID Card ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai ID Card)", bobot: 1 },
      { key: "sel2_3", kpi: "Kepatuhan penggunaan sepatu/flat shoes 100%", caraUkur: "(Hari sesuai aturan ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai sepatu)", bobot: 1 },
      { key: "sel2_4", kpi: "Ketepatan hadir briefing pagi", caraUkur: "(Jumlah hadir tepat waktu ÷ total briefing) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh hadir briefing pagi)", bobot: 1 },
      { key: "sel2_5", kpi: "Pelanggaran etika kerja 0%", caraUkur: "Jumlah pelanggaran per bulan", caraPerhitungan: "Jumlah pelanggaran", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 3,
    tugas: "Respons & Pelayanan Customer",
    total: 20,
    items: [
      { key: "sel3_1", kpi: "Response time ≤ 3 menit", caraUkur: "(% chat direspon ≤ 3 menit)", caraPerhitungan: "0-100 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "direct" } },
      { key: "sel3_2", kpi: "Tingkat respon customer", caraUkur: "(Chat terbalas ÷ Total chat masuk) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "sel3_3", kpi: "Follow up database customer aktif", caraUkur: "(Customer difollow up sesuai jadwal ÷ Total customer aktif) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "sel3_4", kpi: "Tingkat komplain pelayanan customer service", caraUkur: "Target 0 komplain", caraPerhitungan: "0-∞ (Jumlah komplain dalam 1 bulan)", bobot: 5, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 4,
    tugas: "Pencapaian Closing dan Omzet Penjualan",
    total: 50,
    items: [
      { key: "sel5_1", kpi: "Closing penjualan harian (min. 5.625 pcs/bulan)", caraUkur: "Minimal 5.625 pcs/bulan", caraPerhitungan: "0-5625 (Total closing per hari × 25 hari kerja)", bobot: 15, formula: { type: "fixed", divisor: 5625 } },
      { key: "sel5_2", kpi: "Omzet bulanan (Target Rp500.000.000)", caraUkur: "(Realisasi omzet ÷ Target Rp500.000.000) × 100%", caraPerhitungan: "Jumlah realisasi omzet", bobot: 15, formula: { type: "fixed", divisor: 500000000 } },
      { key: "sel5_3", kpi: "Omzet leads organic (Target Rp100.000.000)", caraUkur: "(Realisasi omzet organic ÷ Target Rp100.000.000) × 100%", caraPerhitungan: "Jumlah realisasi omzet organic", bobot: 15, formula: { type: "fixed", divisor: 100000000 } },
      { key: "sel5_4", kpi: "Customer melakukan DP desain sesuai target", caraUkur: "(Customer DP ÷ Target customer DP) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
    ],
  },
  {
    no: 5,
    tugas: "Handover Pesanan ke CS Order",
    total: 15,
    items: [
      { key: "sel6_1", kpi: "Kelengkapan data pesanan saat handover", caraUkur: "(Handover lengkap ÷ Total handover) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "sel6_2", kpi: "Akurasi pembuatan grup customer", caraUkur: "(Grup sesuai SOP ÷ Total customer DP) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "sel6_3", kpi: "Kecepatan pembuatan grup ≤ 10 menit", caraUkur: "(Grup dibuat tepat waktu ÷ Total customer DP) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "sel6_4", kpi: "Tingkat miskomunikasi saat handover", caraUkur: "Target 0 kasus", caraPerhitungan: "0-∞ (Jumlah kasus miskomunikasi)", bobot: 5, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 6,
    tugas: "Kebersihan Area Kerja",
    total: 5,
    items: [
      { key: "sel7_1", kpi: "Kehadiran piket kebersihan", caraUkur: "(Piket terlaksana ÷ Jadwal) × 100%", caraPerhitungan: "0-8 (Jumlah piket kebersihan)", bobot: 1, formula: { type: "fixed", divisor: 8 } },
      { key: "sel7_2", kpi: "Kebersihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 2, formula: { type: "direct" } },
      { key: "sel7_3", kpi: "Kerapihan meja & dokumen kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "sel7_4", kpi: "Keluhan kebersihan area kerja", caraUkur: "100% jika tidak ada keluhan", caraPerhitungan: "0-∞ (Jumlah keluhan)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
];

export const CS_ORDER_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran",
    total: 5,
    items: [
      { key: "ord1_1", kpi: "Kepatuhan absensi 100%", caraUkur: "(Hari hadir ÷ Hari kerja) × 100%", caraPerhitungan: "Jumlah hari dia hadir", bobot: 3 },
      { key: "ord1_2", kpi: "Keterlambatan kerja ≤5x", caraUkur: "((5 - Jumlah Keterlambatan) ÷ 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 2, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Kedisiplinan & Etika Kerja",
    total: 5,
    items: [
      { key: "ord2_1", kpi: "Kepatuhan penggunaan seragam 100%", caraUkur: "(Hari patuh seragam ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai seragam)", bobot: 1 },
      { key: "ord2_2", kpi: "Kepatuhan penggunaan ID Card 100%", caraUkur: "(Hari pakai ID Card ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai ID Card)", bobot: 1 },
      { key: "ord2_3", kpi: "Kepatuhan penggunaan sepatu/flat shoes 100%", caraUkur: "(Hari sesuai aturan ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai sepatu)", bobot: 1 },
      { key: "ord2_4", kpi: "Ketepatan hadir briefing pagi", caraUkur: "(Jumlah hadir tepat waktu ÷ total briefing) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh hadir briefing pagi)", bobot: 1 },
      { key: "ord2_5", kpi: "Pelanggaran etika kerja 0%", caraUkur: "Jumlah pelanggaran per bulan", caraPerhitungan: "Jumlah pelanggaran", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 3,
    tugas: "Handover & Pengelolaan Order Masuk",
    total: 10,
    items: [
      { key: "ord3_1", kpi: "Handover order dari CS Selling diterima & diproses", caraUkur: "(Handover diproses ÷ Total handover) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "ord3_2", kpi: "Distribusi order ke grup internal tepat waktu", caraUkur: "(Order tersampaikan ÷ Total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "ord3_3", kpi: "Tidak ada order yang terlewat saat handover", caraUkur: "Total order yang terlewat", caraPerhitungan: "0-∞ (Jumlah order terlewat)", bobot: 2, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 4,
    tugas: "Komunikasi Customer & Pengelolaan Pesanan",
    total: 35,
    items: [
      { key: "ord4_1", kpi: "Akurasi informasi pesanan ke customer", caraUkur: "Total order error", caraPerhitungan: "0-∞ (Jumlah order error)", bobot: 8, formula: { type: "zeroBest" } },
      { key: "ord4_2", kpi: "Kelengkapan data customer (size, nama, nomor, dll)", caraUkur: "(Data lengkap ÷ Total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 7, formula: { type: "ratio" } },
      { key: "ord4_3", kpi: "Ketepatan update progres desain & produksi", caraUkur: "(Update tepat waktu ÷ Total update) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6, formula: { type: "ratio" } },
      { key: "ord4_4", kpi: "Tingkat keberhasilan ACC desain tepat waktu", caraUkur: "(ACC sesuai target ÷ Total desain) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "ord4_5", kpi: "Follow up customer aktif & profesional", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Penilaian atasan)", bobot: 3, formula: { type: "direct" } },
      { key: "ord4_6", kpi: "Ketepatan penyampaian timeline produksi", caraUkur: "(Timeline sesuai ÷ Total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "ord4_7", kpi: "Tingkat komplain customer terkait komunikasi", caraUkur: "Total komplain customer terkait komunikasi", caraPerhitungan: "0-∞ (Jumlah komplain)", bobot: 3, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 5,
    tugas: "Pengelolaan Data Order (CRM & Administrasi)",
    total: 15,
    items: [
      { key: "ord5_1", kpi: "Input data order ke CRM tepat waktu (H+1)", caraUkur: "(Order terinput ÷ Total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6, formula: { type: "ratio" } },
      { key: "ord5_2", kpi: "Akurasi data CRM (tanpa revisi)", caraUkur: "(Data benar ÷ Total input) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "ord5_3", kpi: "Kelengkapan data order di sistem", caraUkur: "(Data lengkap ÷ Total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
    ],
  },
  {
    no: 6,
    tugas: "Koordinasi Internal & Handover ke Produksi",
    total: 20,
    items: [
      { key: "ord6_1", kpi: "Koordinasi dengan desain berjalan efektif", caraUkur: "(Koordinasi selesai ÷ Total kasus) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "ord6_2", kpi: "Keberhasilan revisi & approval desain", caraUkur: "(Desain fix ÷ Total desain) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "ord6_3", kpi: "Handover ke produksi tepat waktu", caraUkur: "(Handover tepat waktu ÷ Total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "ord6_4", kpi: "Tingkat kesalahan brief ke produksi", caraUkur: "(Brief benar ÷ Total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 9, formula: { type: "ratio" } },
      { key: "ord6_5", kpi: "Keterlambatan handover order", caraUkur: "100% jika tepat waktu", caraPerhitungan: "0-∞ (Jumlah keterlambatan handover)", bobot: 2, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 7,
    tugas: "Koordinasi Finance (Invoice & Pembayaran)",
    total: 5,
    items: [
      { key: "ord7_1", kpi: "Invoice/nota dibuat tepat waktu", caraUkur: "(Invoice tepat waktu ÷ Total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "ord7_2", kpi: "Akurasi data invoice", caraUkur: "(Invoice benar ÷ Total invoice) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
    ],
  },
  {
    no: 8,
    tugas: "Kebersihan Area Kerja",
    total: 5,
    items: [
      { key: "ord8_1", kpi: "Kehadiran piket kebersihan", caraUkur: "(Piket terlaksana ÷ Jadwal) × 100%", caraPerhitungan: "0-8 (Jumlah piket kebersihan)", bobot: 1, formula: { type: "fixed", divisor: 8 } },
      { key: "ord8_2", kpi: "Kebersihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 2, formula: { type: "direct" } },
      { key: "ord8_3", kpi: "Kerapihan meja & dokumen kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "ord8_4", kpi: "Keluhan kebersihan area kerja", caraUkur: "100% jika tidak ada keluhan", caraPerhitungan: "0-∞ (Jumlah keluhan)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
];

export const CS_GROSIR_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran",
    total: 5,
    items: [
      { key: "gro1_1", kpi: "Kepatuhan absensi 100%", caraUkur: "(Hari hadir ÷ Hari kerja) × 100%", caraPerhitungan: "Jumlah hari dia hadir", bobot: 3 },
      { key: "gro1_2", kpi: "Keterlambatan kerja ≤5x", caraUkur: "((5 - Jumlah Keterlambatan) ÷ 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 2, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Kedisiplinan & Etika Kerja",
    total: 4,
    items: [
      { key: "gro2_1", kpi: "Kepatuhan penggunaan seragam 100%", caraUkur: "(Hari patuh seragam ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai seragam)", bobot: 1 },
      { key: "gro2_2", kpi: "Kepatuhan penggunaan ID Card 100%", caraUkur: "(Hari pakai ID Card ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai ID Card)", bobot: 1 },
      { key: "gro2_3", kpi: "Kepatuhan penggunaan sepatu/flat shoes 100%", caraUkur: "(Hari sesuai aturan ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai sepatu)", bobot: 1 },
      { key: "gro2_4", kpi: "Pelanggaran etika kerja 0%", caraUkur: "Jumlah pelanggaran per bulan", caraPerhitungan: "Jumlah pelanggaran", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 3,
    tugas: "Customer Service WhatsApp & Online Chat",
    total: 26,
    items: [
      { key: "gro3_1", kpi: "Response time ≤ 3 menit", caraUkur: "(Chat sesuai SLA ÷ Total chat) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 8, formula: { type: "ratio" } },
      { key: "gro3_2", kpi: "Tingkat respon chat customer", caraUkur: "(Chat terbalas ÷ Total chat masuk) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "gro3_3", kpi: "Akurasi informasi produk", caraUkur: "(Informasi benar ÷ Total respon) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "gro3_4", kpi: "Penanganan komplain customer", caraUkur: "(Komplain terselesaikan ÷ Total komplain) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "gro3_5", kpi: "Follow-up customer aktif 100%", caraUkur: "(Follow-up terlaksana ÷ Database) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 6, formula: { type: "ratio" } },
      { key: "gro3_6", kpi: "Cancel/refund karena CS (0%)", caraUkur: "Jumlah customer cancel/refund", caraPerhitungan: "0-∞ (Jumlah cancel/refund)", bobot: 2, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 4,
    tugas: "Pelayanan Offline (Shopkeeper Toko)",
    total: 15,
    items: [
      { key: "gro4_1", kpi: "Akurasi transaksi penjualan offline", caraUkur: "(Transaksi benar ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "gro4_2", kpi: "Nota/order tercatat lengkap", caraUkur: "(Order tercatat ÷ Total transaksi) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "gro4_3", kpi: "Handling customer offline", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Penilaian atasan)", bobot: 3, formula: { type: "direct" } },
      { key: "gro4_4", kpi: "Penyelesaian komplain customer", caraUkur: "(Komplain selesai ÷ Total komplain) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "gro4_5", kpi: "Tingkat kesalahan transaksi (0 = 100% score)", caraUkur: "Jumlah kesalahan transaksi", caraPerhitungan: "0-∞ (Jumlah kesalahan)", bobot: 2, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 5,
    tugas: "Pengelolaan Data Stok & Administrasi",
    total: 10,
    items: [
      { key: "gro5_1", kpi: "Update kartu stok harian", caraUkur: "(Update selesai ÷ Hari kerja) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "gro5_2", kpi: "Akurasi data stok", caraUkur: "(Stok benar ÷ Total item) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "gro5_3", kpi: "Kesesuaian stok fisik & sistem", caraUkur: "(Match data ÷ Total cek) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
    ],
  },
  {
    no: 6,
    tugas: "Penjualan & Target Omzet Grosir",
    total: 25,
    items: [
      { key: "gro6_1", kpi: "Pencapaian omzet bulanan (Target Rp200.000.000)", caraUkur: "(Realisasi ÷ Target Rp200.000.000) × 100%", caraPerhitungan: "Jumlah realisasi omzet", bobot: 12, formula: { type: "fixed", divisor: 200000000 } },
      { key: "gro6_2", kpi: "Follow up database customer aktif 100% (setiap 2 hari sekali)", caraUkur: "(Follow-up terlaksana ÷ Database) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "gro6_3", kpi: "Konversi reseller/toko baru (min. Rp1.000.000)", caraUkur: "(Realisasi omzet reseller baru ÷ Target Rp1.000.000) × 100%", caraPerhitungan: "Jumlah realisasi omzet", bobot: 9, formula: { type: "fixed", divisor: 1000000 } },
    ],
  },
  {
    no: 7,
    tugas: "Editing Custom Deker",
    total: 5,
    items: [
      { key: "gro7_1", kpi: "Pengerjaan desain custom deker tepat waktu 100%", caraUkur: "(Desain selesai ÷ total desain) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
    ],
  },
  {
    no: 8,
    tugas: "Koordinasi Pengiriman BA",
    total: 5,
    items: [
      { key: "gro8_1", kpi: "Data pengiriman akurat 100%", caraUkur: "(Data sesuai ÷ total pengiriman) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "gro8_2", kpi: "Kesalahan pengiriman = 0%", caraUkur: "Jumlah error", caraPerhitungan: "0-∞ (Jumlah error)", bobot: 2, formula: { type: "zeroBest" } },
      { key: "gro8_3", kpi: "Follow up pengiriman 100%", caraUkur: "(Pengiriman difollow up ÷ total) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1, formula: { type: "ratio" } },
    ],
  },
  {
    no: 9,
    tugas: "Kebersihan Area Kerja",
    total: 5,
    items: [
      { key: "gro9_1", kpi: "Kehadiran piket kebersihan", caraUkur: "(Piket terlaksana ÷ Jadwal) × 100%", caraPerhitungan: "0-8 (Jumlah piket kebersihan)", bobot: 1, formula: { type: "fixed", divisor: 8 } },
      { key: "gro9_2", kpi: "Kebersihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 2, formula: { type: "direct" } },
      { key: "gro9_3", kpi: "Kerapihan meja & dokumen kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "gro9_4", kpi: "Keluhan kebersihan area kerja", caraUkur: "100% jika tidak ada keluhan", caraPerhitungan: "0-∞ (Jumlah keluhan)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
];

export const CS_MARKETPLACE_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran",
    total: 5,
    items: [
      { key: "mkt1_1", kpi: "Kepatuhan absensi 100%", caraUkur: "(Hari hadir ÷ Hari kerja) × 100%", caraPerhitungan: "Jumlah hari dia hadir", bobot: 3 },
      { key: "mkt1_2", kpi: "Keterlambatan kerja ≤5x", caraUkur: "((5 - Jumlah Keterlambatan) ÷ 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 2, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Kedisiplinan & Etika Kerja",
    total: 5,
    items: [
      { key: "mkt2_1", kpi: "Kepatuhan penggunaan seragam 100%", caraUkur: "(Hari patuh seragam ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai seragam)", bobot: 1 },
      { key: "mkt2_2", kpi: "Kepatuhan penggunaan ID Card 100%", caraUkur: "(Hari pakai ID Card ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai ID Card)", bobot: 1 },
      { key: "mkt2_3", kpi: "Kepatuhan penggunaan sepatu/flat shoes 100%", caraUkur: "(Hari sesuai aturan ÷ hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai sepatu)", bobot: 1 },
      { key: "mkt2_4", kpi: "Ketepatan hadir briefing pagi", caraUkur: "(Jumlah hadir tepat waktu ÷ total briefing) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh hadir briefing pagi)", bobot: 1 },
      { key: "mkt2_5", kpi: "Pelanggaran etika kerja 0%", caraUkur: "Jumlah pelanggaran per bulan", caraPerhitungan: "Jumlah pelanggaran", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 3,
    tugas: "Pengelolaan Chat Marketplace",
    total: 35,
    items: [
      { key: "mkt3_1", kpi: "Response time ≤ 3 menit", caraUkur: "(Chat sesuai SLA ÷ Total chat) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 10, formula: { type: "ratio" } },
      { key: "mkt3_2", kpi: "Persentase chat dibalas ≥ 70%", caraUkur: "(Chat terbalas ÷ Total chat masuk) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 10, formula: { type: "ratio" } },
      { key: "mkt3_3", kpi: "Tingkat kepuasan chat pembeli ≥ 70%", caraUkur: "Data marketplace", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "mkt3_4", kpi: "Store rating ≥ 4,5", caraUkur: "Rating toko marketplace (÷ 5)", caraPerhitungan: "Rating toko marketplace (0-5)", bobot: 3, formula: { type: "fixed", divisor: 5 } },
      { key: "mkt3_5", kpi: "Komplain terkait pelayanan CS = 0%", caraUkur: "Jumlah komplain pelayanan", caraPerhitungan: "0-∞ (Jumlah komplain)", bobot: 5, formula: { type: "zeroBest" } },
      { key: "mkt3_6", kpi: "Customer misunderstanding = 0%", caraUkur: "Jumlah kasus kesalahan informasi", caraPerhitungan: "0-∞ (Jumlah kasus)", bobot: 2, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 4,
    tugas: "Pengelolaan Pesanan Marketplace",
    total: 20,
    items: [
      { key: "mkt4_1", kpi: "Akurasi data pesanan 100%", caraUkur: "(Pesanan benar ÷ Total pesanan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "mkt4_2", kpi: "Kesalahan input pesanan = 0%", caraUkur: "Jumlah kesalahan input", caraPerhitungan: "0-∞ (Jumlah kesalahan)", bobot: 4, formula: { type: "zeroBest" } },
      { key: "mkt4_3", kpi: "Pesanan terlambat diproses = 0%", caraUkur: "Jumlah pesanan terlambat", caraPerhitungan: "0-∞ (Jumlah pesanan terlambat)", bobot: 4, formula: { type: "zeroBest" } },
      { key: "mkt4_4", kpi: "Pesanan batal akibat kesalahan internal = 0%", caraUkur: "Jumlah pembatalan internal", caraPerhitungan: "0-∞ (Jumlah pembatalan)", bobot: 3, formula: { type: "zeroBest" } },
      { key: "mkt4_5", kpi: "Distribusi pesanan ke bagian terkait 100%", caraUkur: "(Pesanan terdistribusi ÷ Total pesanan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
    ],
  },
  {
    no: 5,
    tugas: "Pengelolaan Pesanan Jersey",
    total: 10,
    items: [
      { key: "mkt5_1", kpi: "Rekap pesanan selesai sebelum pukul 10.00 WIB", caraUkur: "(Hari tepat waktu ÷ Hari kerja) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "mkt5_2", kpi: "Akurasi data pesanan jersey 100%", caraUkur: "(Data benar ÷ Total pesanan jersey) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "mkt5_3", kpi: "Pesanan jersey terlewat = 0%", caraUkur: "Jumlah pesanan terlewat", caraPerhitungan: "0-∞ (Jumlah pesanan terlewat)", bobot: 2, formula: { type: "zeroBest" } },
      { key: "mkt5_4", kpi: "Kesalahan data produksi jersey = 0%", caraUkur: "Jumlah kesalahan data", caraPerhitungan: "0-∞ (Jumlah kesalahan)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 6,
    tugas: "Pengelolaan Pesanan PO & Sablon",
    total: 8,
    items: [
      { key: "mkt6_1", kpi: "Seluruh pesanan PO teridentifikasi 100%", caraUkur: "(PO teridentifikasi ÷ Total PO) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "mkt6_2", kpi: "Pesanan PO terlambat diproses = 0%", caraUkur: "Jumlah keterlambatan PO", caraPerhitungan: "0-∞ (Jumlah keterlambatan)", bobot: 3, formula: { type: "zeroBest" } },
      { key: "mkt6_3", kpi: "Pesanan sablon terlewat = 0%", caraUkur: "Jumlah pesanan sablon terlewat", caraPerhitungan: "0-∞ (Jumlah pesanan terlewat)", bobot: 2, formula: { type: "zeroBest" } },
    ],
  },
  {
    no: 7,
    tugas: "Pengelolaan Dekker COD",
    total: 7,
    items: [
      { key: "mkt7_1", kpi: "Tingkat kesalahan produksi dekker = 0%", caraUkur: "Jumlah kesalahan produksi dekker", caraPerhitungan: "0-∞ (Jumlah kesalahan)", bobot: 2, formula: { type: "zeroBest" } },
      { key: "mkt7_2", kpi: "Tingkat kesalahan pengemasan = 0%", caraUkur: "Jumlah kesalahan packing", caraPerhitungan: "0-∞ (Jumlah kesalahan)", bobot: 1, formula: { type: "zeroBest" } },
      { key: "mkt7_3", kpi: "Pesanan dekker diproses sesuai target 100%", caraUkur: "(Pesanan selesai ÷ Total pesanan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "mkt7_4", kpi: "Pesanan dekker terlambat dikirim = 0%", caraUkur: "Jumlah keterlambatan", caraPerhitungan: "0-∞ (Jumlah keterlambatan)", bobot: 1, formula: { type: "zeroBest" } },
      { key: "mkt7_5", kpi: "Kapasitas penanganan dekker ≥ 50 pcs/hari", caraUkur: "(Realisasi ÷ Target) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1, formula: { type: "ratio" } },
    ],
  },
  {
    no: 8,
    tugas: "Pengelolaan Review Marketplace",
    total: 5,
    items: [
      { key: "mkt8_1", kpi: "Review customer dibalas 100%", caraUkur: "(Review dibalas ÷ Total review) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "mkt8_2", kpi: "Respon review maksimal 1 x 24 jam", caraUkur: "(Review tepat waktu ÷ Total review) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1, formula: { type: "ratio" } },
      { key: "mkt8_3", kpi: "Review tidak ditanggapi = 0%", caraUkur: "Jumlah review terlewat", caraPerhitungan: "0-∞ (Jumlah review terlewat)", bobot: 1, formula: { type: "zeroBest" } },
      { key: "mkt8_4", kpi: "Penyelesaian komplain review 100%", caraUkur: "(Komplain selesai ÷ Total komplain) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 1, formula: { type: "ratio" } },
    ],
  },
  {
    no: 9,
    tugas: "Kebersihan Area Kerja",
    total: 5,
    items: [
      { key: "mkt9_1", kpi: "Kehadiran piket kebersihan", caraUkur: "(Piket terlaksana ÷ Jadwal) × 100%", caraPerhitungan: "0-8 (Jumlah piket kebersihan)", bobot: 1, formula: { type: "fixed", divisor: 8 } },
      { key: "mkt9_2", kpi: "Kebersihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 2, formula: { type: "direct" } },
      { key: "mkt9_3", kpi: "Kerapihan meja & dokumen kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "mkt9_4", kpi: "Keluhan kebersihan area kerja", caraUkur: "100% jika tidak ada keluhan", caraPerhitungan: "0-∞ (Jumlah keluhan)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
];

// Template PURCHASE — sub divisi Purchase. Total bobot 100%.
export const PURCHASE_KPI: KpiGroup[] = [
  {
    no: 1,
    tugas: "Kehadiran",
    total: 5,
    items: [
      { key: "pur1_1", kpi: "Kepatuhan absensi 100%", caraUkur: "(Hari hadir ÷ Hari kerja) × 100%", caraPerhitungan: "Jumlah hari dia hadir", bobot: 3 },
      { key: "pur1_2", kpi: "Keterlambatan kerja ≤ 5x", caraUkur: "((5 - Jumlah Keterlambatan) ÷ 5) × 100%", caraPerhitungan: "Jumlah keterlambatan", bobot: 2, formula: { type: "late", threshold: 5 } },
    ],
  },
  {
    no: 2,
    tugas: "Kedisiplinan & Etika Kerja",
    total: 5,
    items: [
      { key: "pur2_1", kpi: "Kepatuhan penggunaan seragam 100%", caraUkur: "(Hari patuh seragam ÷ Hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai seragam)", bobot: 1 },
      { key: "pur2_2", kpi: "Kepatuhan penggunaan ID Card 100%", caraUkur: "(Hari menggunakan ID Card ÷ Hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai ID Card)", bobot: 1 },
      { key: "pur2_3", kpi: "Kepatuhan penggunaan sepatu/flat shoes 100%", caraUkur: "(Hari sesuai ketentuan ÷ Hari kerja) × 100%", caraPerhitungan: "1-25 (Berapa hari dia patuh pakai flat shoes)", bobot: 1 },
      { key: "pur2_4", kpi: "Pelanggaran etika kerja 0%", caraUkur: "Jumlah pelanggaran per bulan", caraPerhitungan: "0-∞ (Jumlah pelanggaran)", bobot: 1, formula: { type: "zeroBest" } },
      { key: "pur2_5", kpi: "Kepatuhan terhadap peraturan perusahaan", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Penilaian atasan)", bobot: 1, formula: { type: "direct" } },
    ],
  },
  {
    no: 3,
    tugas: "Pengelolaan Stok & Perencanaan Pembelian",
    total: 25,
    items: [
      { key: "pur3_1", kpi: "Ketepatan pengecekan stok 100%", caraUkur: "(Cek stok benar ÷ total pengecekan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "pur3_2", kpi: "Kekosongan stok produk utama 0%", caraUkur: "Jumlah stockout", caraPerhitungan: "0-∞ (Berapa kali stok kosong pada produk utama)", bobot: 5, formula: { type: "zeroBest" } },
      { key: "pur3_3", kpi: "Ketepatan perencanaan pembelian 100%", caraUkur: "(Rencana sesuai kebutuhan ÷ total kebutuhan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "pur3_4", kpi: "Monitoring stok minimum 100%", caraUkur: "(Monitoring dilakukan ÷ jadwal) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "pur3_5", kpi: "Akurasi rekomendasi pembelian", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Nilai penilaian atasan terhadap akurasi rekomendasi pembelian)", bobot: 5, formula: { type: "direct" } },
    ],
  },
  {
    no: 4,
    tugas: "Proses Pembelian & Purchasing Order",
    total: 25,
    items: [
      { key: "pur4_1", kpi: "Ketepatan proses pemesanan 100%", caraUkur: "(Order benar ÷ total order) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "pur4_2", kpi: "Ketepatan pembuatan form order 100%", caraUkur: "(Form benar ÷ total form) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "pur4_3", kpi: "Ketepatan pembuatan PO 100%", caraUkur: "(PO benar ÷ total PO) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "pur4_4", kpi: "Kesalahan invoice supplier 0%", caraUkur: "Jumlah kesalahan invoice supplier", caraPerhitungan: "0-∞ (Jumlah kesalahan invoice supplier)", bobot: 4, formula: { type: "zeroBest" } },
      { key: "pur4_5", kpi: "Ketepatan input invoice ke Accurate 100%", caraUkur: "(Input tepat waktu ÷ total invoice) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "pur4_6", kpi: "Keterlambatan input invoice < 2 jam", caraUkur: "(Input tepat waktu/terlambat < 2 jam ÷ total invoice) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
    ],
  },
  {
    no: 5,
    tugas: "Monitoring & Penerimaan Barang",
    total: 25,
    items: [
      { key: "pur5_1", kpi: "Follow up pengiriman barang 100%", caraUkur: "(Follow up dilakukan ÷ total pengiriman) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 4, formula: { type: "ratio" } },
      { key: "pur5_2", kpi: "Update status pengiriman 100%", caraUkur: "(Update dilakukan ÷ total pengiriman) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "pur5_3", kpi: "Kesesuaian barang datang dengan PO 100%", caraUkur: "(Barang sesuai ÷ total barang datang) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 5, formula: { type: "ratio" } },
      { key: "pur5_4", kpi: "Kesalahan penerimaan barang 0%", caraUkur: "Jumlah kesalahan penerimaan", caraPerhitungan: "0-∞ (Jumlah kesalahan penerimaan barang)", bobot: 5, formula: { type: "zeroBest" } },
      { key: "pur5_5", kpi: "Pembelian via supplier Indonesia maksimal ≤ 3 hari", caraUkur: "Rata-rata hari pengiriman", caraPerhitungan: "Rata-rata hari pengiriman (≤ 3 = 100%)", bobot: 4, formula: { type: "maxTarget", threshold: 3 } },
      { key: "pur5_6", kpi: "Pembelian via supplier China ≤ 4 bulan", caraUkur: "Rata-rata hari pengiriman", caraPerhitungan: "Rata-rata hari pengiriman (≤ 120 = 100%)", bobot: 4, formula: { type: "maxTarget", threshold: 120 } },
    ],
  },
  {
    no: 6,
    tugas: "Koordinasi & Dukungan Operasional",
    total: 10,
    items: [
      { key: "pur6_1", kpi: "Referensi produk baru 100%", caraUkur: "(Usulan valid ÷ total usulan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 3, formula: { type: "ratio" } },
      { key: "pur6_2", kpi: "Kelancaran koordinasi dengan finance 100%", caraUkur: "Penilaian atasan", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "pur6_3", kpi: "Ketepatan laporan closing ≤ 20.00 WIB", caraUkur: "(Laporan tepat waktu ÷ total laporan) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "pur6_4", kpi: "Ketepatan input saldo bank 100%", caraUkur: "(Input benar ÷ total input) × 100%", caraPerhitungan: "0-1 (Hasil dari perhitungan cara ukur)", bobot: 2, formula: { type: "ratio" } },
      { key: "pur6_5", kpi: "Pelayanan customer (bila diperlukan) 100%", caraUkur: "Penilaian atasan", caraPerhitungan: "0-100 (Nilai penilaian atasan terhadap pelayanan customer)", bobot: 1, formula: { type: "direct" } },
    ],
  },
  {
    no: 7,
    tugas: "Kebersihan Area Kerja",
    total: 5,
    items: [
      { key: "pur7_1", kpi: "Kehadiran piket kebersihan", caraUkur: "(Piket terlaksana ÷ jadwal) × 100%", caraPerhitungan: "0-8 (Jumlah piket kebersihan)", bobot: 1, formula: { type: "fixed", divisor: 8 } },
      { key: "pur7_2", kpi: "Kebersihan area kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 2, formula: { type: "direct" } },
      { key: "pur7_3", kpi: "Kerapihan meja & dokumen kerja", caraUkur: "Checklist atasan", caraPerhitungan: "0-100 (Checklist atasan)", bobot: 1, formula: { type: "direct" } },
      { key: "pur7_4", kpi: "Keluhan kebersihan area kerja", caraUkur: "100% jika tidak ada keluhan", caraPerhitungan: "0-∞ (Jumlah keluhan)", bobot: 1, formula: { type: "zeroBest" } },
    ],
  },
];

export const CS_TYPE_LABEL: Record<CsType, string> = {
  selling: "CS Selling",
  order: "CS Order",
  grosir: "CS Grosir",
  marketplace: "CS Marketplace",
};

// Template dipilih dari sub divisi + cs_type. Purchase → PURCHASE_KPI; Customer Service → cs_type.
export function getSalesRetailTemplate(
  subDivisi: string | null,
  csType: CsType | null,
): KpiGroup[] {
  if ((subDivisi ?? "").trim().toLowerCase() === "purchase") return PURCHASE_KPI;
  switch (csType) {
    case "order":
      return CS_ORDER_KPI;
    case "grosir":
      return CS_GROSIR_KPI;
    case "marketplace":
      return CS_MARKETPLACE_KPI;
    case "selling":
    default:
      return CS_SELLING_KPI;
  }
}

const ALL_SALES_RETAIL_KEYS = new Set(
  [...CS_SELLING_KPI, ...CS_ORDER_KPI, ...CS_GROSIR_KPI, ...CS_MARKETPLACE_KPI, ...PURCHASE_KPI].flatMap(
    (g) => g.items.map((i) => i.key),
  ),
);

export type SalesRetailEmployee = {
  id: number;
  nama: string;
  jabatan: string | null;
  subDivisi: string | null;
  penempatan: string | null;
  csType: CsType | null;
};

export type KpiSalesRetailInputValue = {
  aktualData: string;
  hasilOverride: "terpenuhi" | "tidak" | null;
};

export const DEFAULT_KPI_HARI_KERJA = 23;

let kpiSalesRetailReady: Promise<void> | null = null;

export async function ensureKpiSalesRetailTables() {
  if (!kpiSalesRetailReady) {
    kpiSalesRetailReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kpi_sales_retail_input (
          id INT AUTO_INCREMENT PRIMARY KEY,
          karyawan_id INT NOT NULL,
          periode_bulan INT NOT NULL,
          periode_tahun INT NOT NULL,
          row_key VARCHAR(64) NOT NULL,
          aktual_data VARCHAR(255) NULL,
          perhitungan DECIMAL(9,2) NOT NULL DEFAULT 0,
          hasil_override ENUM('terpenuhi','tidak') NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_kpi_sr (karyawan_id, periode_bulan, periode_tahun, row_key),
          INDEX idx_kpi_sr_emp_period (karyawan_id, periode_bulan, periode_tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kpi_sales_retail_hari_kerja (
          periode_bulan INT NOT NULL,
          periode_tahun INT NOT NULL,
          hari_kerja INT NOT NULL DEFAULT ${DEFAULT_KPI_HARI_KERJA},
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (periode_bulan, periode_tahun)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })();
  }
  return kpiSalesRetailReady;
}

// Karyawan sub divisi Customer Service ATAU Purchase (nama otomatis dari database).
export async function getCustomerServiceEmployees(): Promise<SalesRetailEmployee[]> {
  const [rows] = await pool.query<
    (RowDataPacket & {
      id: number; nama: string; jabatan: string | null; sub_divisi: string | null; penempatan: string | null; cs_type: CsType | null;
    })[]
  >(
    `SELECT k.id, k.nama, k.jabatan, k.sub_divisi, k.penempatan, k.cs_type
       FROM karyawan k
      WHERE k.status_data = 'aktif'
        AND LOWER(COALESCE(k.sub_divisi, '')) IN ('customer service', 'purchase')
      ORDER BY k.nama ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    jabatan: r.jabatan,
    subDivisi: r.sub_divisi,
    penempatan: r.penempatan,
    csType: r.cs_type ?? null,
  }));
}

export async function getKpiSalesRetailInputs(
  employeeId: number,
  month: number,
  year: number,
): Promise<Record<string, KpiSalesRetailInputValue>> {
  await ensureKpiSalesRetailTables();
  const [rows] = await pool.query<
    (RowDataPacket & { row_key: string; aktual_data: string | null; hasil_override: "terpenuhi" | "tidak" | null })[]
  >(
    `SELECT row_key, aktual_data, hasil_override
       FROM kpi_sales_retail_input
      WHERE karyawan_id = ? AND periode_bulan = ? AND periode_tahun = ?`,
    [employeeId, month, year],
  );
  const map: Record<string, KpiSalesRetailInputValue> = {};
  for (const r of rows) {
    map[r.row_key] = { aktualData: r.aktual_data ?? "", hasilOverride: r.hasil_override };
  }
  return map;
}

export type KpiSalesRetailInputRow = {
  key: string;
  aktualData: string;
  perhitungan: number;
  hasilOverride: "terpenuhi" | "tidak" | null;
};

export async function upsertKpiSalesRetailInputs(
  employeeId: number,
  month: number,
  year: number,
  rows: KpiSalesRetailInputRow[],
) {
  await ensureKpiSalesRetailTables();
  if (!Number.isInteger(employeeId) || employeeId <= 0) throw new Error("Karyawan tidak valid.");
  if (!rows.length) return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of rows) {
      if (!ALL_SALES_RETAIL_KEYS.has(row.key)) continue;
      const perhitungan = Number.isFinite(row.perhitungan) ? row.perhitungan : 0;
      const override =
        row.hasilOverride === "terpenuhi" || row.hasilOverride === "tidak" ? row.hasilOverride : null;
      await conn.query<ResultSetHeader>(
        `INSERT INTO kpi_sales_retail_input
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

export async function getKpiSalesRetailHariKerja(month: number, year: number): Promise<number> {
  await ensureKpiSalesRetailTables();
  const [rows] = await pool.query<(RowDataPacket & { hari_kerja: number })[]>(
    `SELECT hari_kerja FROM kpi_sales_retail_hari_kerja WHERE periode_bulan = ? AND periode_tahun = ? LIMIT 1`,
    [month, year],
  );
  const v = rows[0]?.hari_kerja;
  return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : DEFAULT_KPI_HARI_KERJA;
}

export async function upsertKpiSalesRetailHariKerja(month: number, year: number, hariKerja: number) {
  await ensureKpiSalesRetailTables();
  const value = Number.isInteger(hariKerja) && hariKerja > 0 ? hariKerja : DEFAULT_KPI_HARI_KERJA;
  await pool.query(
    `INSERT INTO kpi_sales_retail_hari_kerja (periode_bulan, periode_tahun, hari_kerja)
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
