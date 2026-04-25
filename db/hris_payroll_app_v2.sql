-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 25, 2026 at 11:13 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hris_payroll_app_v2`
--

-- --------------------------------------------------------

--
-- Table structure for table `absensi`
--

CREATE TABLE `absensi` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `tanggal` date NOT NULL,
  `jam_masuk` datetime DEFAULT NULL,
  `jam_pulang` datetime DEFAULT NULL,
  `status_absensi` enum('hadir','sakit','izin','libur','setengah_hari','alfa') NOT NULL DEFAULT 'hadir',
  `kode_absensi` varchar(10) DEFAULT NULL,
  `foto_masuk` varchar(255) DEFAULT NULL,
  `foto_pulang` varchar(255) DEFAULT NULL,
  `latitude_masuk` decimal(10,7) DEFAULT NULL,
  `longitude_masuk` decimal(10,7) DEFAULT NULL,
  `latitude_pulang` decimal(10,7) DEFAULT NULL,
  `longitude_pulang` decimal(10,7) DEFAULT NULL,
  `terlambat_menit` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `setengah_hari` tinyint(1) NOT NULL DEFAULT 0,
  `lembur_jam` decimal(6,2) NOT NULL DEFAULT 0.00,
  `keterangan` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `absensi`
--

INSERT INTO `absensi` (`id`, `karyawan_id`, `tanggal`, `jam_masuk`, `jam_pulang`, `status_absensi`, `kode_absensi`, `foto_masuk`, `foto_pulang`, `latitude_masuk`, `longitude_masuk`, `latitude_pulang`, `longitude_pulang`, `terlambat_menit`, `setengah_hari`, `lembur_jam`, `keterangan`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-03-10', '2026-03-10 15:49:09', '2026-03-10 15:51:06', 'hadir', 'H', '/uploads/attendance/employee-1-in-1773132549670.jpg', '/uploads/attendance/employee-1-out-1773132666131.jpg', -7.7780000, 110.3677000, -7.7780000, 110.3677000, 439, 0, 0.00, NULL, '2026-03-10 15:49:09', '2026-03-10 15:51:06'),
(2, 2, '2026-03-10', '2026-03-10 16:23:48', '2026-03-10 16:24:31', 'hadir', 'H', '/uploads/attendance/employee-2-in-1773134628726.jpg', '/uploads/attendance/employee-2-out-1773134671107.jpg', -7.7780000, 110.3677000, -7.7780000, 110.3677000, 473, 0, 0.00, '', '2026-03-10 16:14:45', '2026-03-10 16:24:31'),
(3, 3, '2026-03-10', NULL, NULL, 'sakit', 'S', '/uploads/attendance/1773135033521-FOTO-KATALOG-STUDIO-.pdf', NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'demam', '2026-03-10 16:30:33', '2026-03-10 16:30:33'),
(4, 2, '2026-03-11', '2026-03-11 08:34:36', NULL, 'hadir', 'H', '/uploads/attendance/employee-2-in-1773192876009.jpg', NULL, -7.7780000, 110.3677000, NULL, NULL, 4, 0, 0.00, '', '2026-03-11 08:34:36', '2026-03-11 08:34:36'),
(5, 1, '2026-03-11', '2026-03-11 11:18:36', NULL, 'hadir', 'H', '/uploads/attendance/employee-1-in-1773202716087.jpg', NULL, -7.7780000, 110.3677000, NULL, NULL, 168, 0, 0.00, '', '2026-03-11 11:18:36', '2026-03-11 11:18:36'),
(6, 3, '2026-03-11', NULL, NULL, 'izin', 'X', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'keperluan keluarga', '2026-03-11 11:38:27', '2026-03-11 11:38:27'),
(7, 2, '2026-03-12', '2026-03-12 09:33:23', NULL, 'hadir', 'O', '/uploads/attendance/employee-2-in-1773282803112.jpg', NULL, -7.7780000, 110.3677000, NULL, NULL, 63, 0, 0.00, '', '2026-03-12 09:33:23', '2026-03-12 09:33:23'),
(8, 3, '2026-03-12', '2026-03-12 11:44:23', NULL, 'hadir', 'O', '/uploads/attendance/employee-3-in-1773290663470.jpg', NULL, -7.7780000, 110.3677000, NULL, NULL, 194, 0, 0.00, '', '2026-03-12 11:44:23', '2026-03-12 11:44:23'),
(9, 3, '2026-04-16', '2026-04-16 08:55:25', NULL, 'hadir', 'O', '/uploads/attendance/employee-3-in-1776304525785.jpg', NULL, -7.8025076, 110.4068520, NULL, NULL, 25, 0, 0.00, '', '2026-04-16 08:55:25', '2026-04-16 08:55:25'),
(10, 3, '2026-04-17', NULL, NULL, 'izin', 'X', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'sedang acara keluarga', '2026-04-17 10:10:28', '2026-04-17 10:10:28'),
(11, 3, '2026-04-18', '2026-04-18 10:49:02', NULL, 'hadir', 'O', '/uploads/attendance/employee-3-in-1776484142921.jpg', NULL, -7.8025094, 110.4068550, NULL, NULL, 139, 0, 0.00, '', '2026-04-18 10:49:02', '2026-04-18 10:49:02'),
(12, 2, '2026-04-18', '2026-04-18 11:11:44', NULL, 'hadir', 'O', '/uploads/attendance/employee-2-in-1776485505000.jpg', NULL, -7.8025076, 110.4068520, NULL, NULL, 161, 0, 0.00, '', '2026-04-18 11:11:45', '2026-04-18 11:11:45'),
(13, 1, '2026-04-18', '2026-04-18 11:14:32', NULL, 'hadir', 'O', '/uploads/attendance/employee-1-in-1776485672233.jpg', NULL, -7.8025067, 110.4067805, NULL, NULL, 164, 0, 0.00, '', '2026-04-18 11:14:32', '2026-04-18 11:14:32'),
(14, 4, '2026-04-23', NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'Auto hadir perjalanan dinas #3 (2026-04-24 s/d 2026-04-27)', '2026-04-24 15:24:51', '2026-04-24 15:24:51'),
(15, 4, '2026-04-24', NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'Auto hadir perjalanan dinas #3 (2026-04-24 s/d 2026-04-27)', '2026-04-24 15:24:51', '2026-04-24 15:24:51'),
(16, 4, '2026-04-25', NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'Auto hadir perjalanan dinas #3 (2026-04-24 s/d 2026-04-27)', '2026-04-24 15:24:51', '2026-04-24 15:24:51'),
(17, 4, '2026-04-26', NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'Auto hadir perjalanan dinas #3 (2026-04-24 s/d 2026-04-27)', '2026-04-24 15:24:51', '2026-04-24 15:24:51'),
(18, 4, '2026-04-27', NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'Auto hadir perjalanan dinas #3 (2026-04-24 s/d 2026-04-27)', '2026-04-24 15:24:51', '2026-04-24 15:24:51'),
(19, 3, '2026-04-24', NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'Auto hadir perjalanan dinas #2 (2026-04-24 s/d 2026-04-26)', '2026-04-24 15:27:21', '2026-04-24 15:27:21'),
(20, 3, '2026-04-25', NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'Auto hadir perjalanan dinas #2 (2026-04-24 s/d 2026-04-26)', '2026-04-24 15:27:21', '2026-04-24 15:27:21'),
(21, 3, '2026-04-26', NULL, NULL, 'hadir', 'O', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0.00, 'Auto hadir perjalanan dinas #2 (2026-04-24 s/d 2026-04-26)', '2026-04-24 15:27:21', '2026-04-24 15:27:21');

-- --------------------------------------------------------

--
-- Table structure for table `finance_lembur_tambahan`
--

CREATE TABLE `finance_lembur_tambahan` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `periode_bulan` tinyint(3) UNSIGNED NOT NULL,
  `periode_tahun` smallint(5) UNSIGNED NOT NULL,
  `unit` varchar(100) NOT NULL,
  `nominal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `catatan` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jadwal_karyawan`
--

CREATE TABLE `jadwal_karyawan` (
  `id` int(11) NOT NULL,
  `karyawan_id` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `shift` enum('pagi','lembur','siang','setengah_1','setengah_2','libur') NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `karyawan`
--

CREATE TABLE `karyawan` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `no_karyawan` varchar(50) DEFAULT NULL,
  `nama` varchar(150) NOT NULL,
  `unit` varchar(100) DEFAULT NULL,
  `jabatan` varchar(100) DEFAULT NULL,
  `tipe_payroll_penjahit` enum('mingguan','bulanan') DEFAULT NULL,
  `departemen` varchar(100) DEFAULT NULL,
  `divisi` varchar(100) DEFAULT NULL,
  `sub_divisi` varchar(100) DEFAULT NULL,
  `penempatan` varchar(150) DEFAULT NULL,
  `penempatan_extra` varchar(500) DEFAULT NULL,
  `pembagian_rekapan` varchar(100) DEFAULT NULL,
  `pembebanan` varchar(100) DEFAULT NULL,
  `bank` varchar(50) DEFAULT 'BCA',
  `no_rekening` varchar(50) DEFAULT NULL,
  `jenis_kelamin` enum('laki-laki','perempuan') DEFAULT NULL,
  `tempat_lahir` varchar(100) DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `nik` varchar(30) DEFAULT NULL,
  `agama` varchar(30) DEFAULT NULL,
  `alamat_ktp` text DEFAULT NULL,
  `alamat_rumah_kost` text DEFAULT NULL,
  `nomor_telepon` varchar(30) DEFAULT NULL,
  `foto_ktp` varchar(255) DEFAULT NULL,
  `status_kepegawaian` enum('training','kontrak','tetap','freelance','magang','resign') NOT NULL DEFAULT 'kontrak',
  `status_kerja` enum('training','kontrak','tetap','freelance','magang','resign') NOT NULL DEFAULT 'kontrak',
  `status_data` enum('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  `tanggal_masuk_pertama` date DEFAULT NULL,
  `tanggal_kontrak` date DEFAULT NULL,
  `tanggal_selesai_kontrak` date DEFAULT NULL,
  `kenaikan_tiap_tahun` decimal(14,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `karyawan`
--

INSERT INTO `karyawan` (`id`, `user_id`, `no_karyawan`, `nama`, `unit`, `jabatan`, `tipe_payroll_penjahit`, `departemen`, `divisi`, `sub_divisi`, `penempatan`, `penempatan_extra`, `pembagian_rekapan`, `pembebanan`, `bank`, `no_rekening`, `jenis_kelamin`, `tempat_lahir`, `tanggal_lahir`, `nik`, `agama`, `alamat_ktp`, `alamat_rumah_kost`, `nomor_telepon`, `foto_ktp`, `status_kepegawaian`, `status_kerja`, `status_data`, `tanggal_masuk_pertama`, `tanggal_kontrak`, `tanggal_selesai_kontrak`, `kenaikan_tiap_tahun`, `created_at`, `updated_at`) VALUES
(1, 2, '0001', 'ZEXO', 'Ayres Apparel', 'Sales Nasional', NULL, 'Marketing', 'Sales & Retail', 'Media', 'Office', NULL, NULL, 'penjualan ava', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/ktp/1773132378887-ABSENSI.drawio.png', 'kontrak', 'kontrak', 'aktif', '2025-12-10', '2026-03-10', '2027-03-10', 100000.00, '2026-03-10 15:46:18', '2026-04-22 12:39:52'),
(2, 3, '0002', 'ZETACO', 'AVA Sportivo', 'Penjahit', 'mingguan', 'Finance', 'RnD', 'Customer Service', 'Office', NULL, NULL, 'penjualan ayres', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/ktp/1773134048617-Mar06-02_09.jpg.jpeg', 'tetap', 'tetap', 'aktif', '2026-03-10', '2026-06-10', '2027-06-10', 999999999999.99, '2026-03-10 16:14:08', '2026-04-24 09:28:02'),
(3, 4, '0003', 'LEIF', 'AVA Sportivo', 'Sales Area', NULL, 'Marketing', 'Sales & Retail', 'Finishing', 'Toko', 'Ayres', NULL, 'penjualan ava', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/ktp/1773134994321-AdiVira-01.jpg.jpeg', 'tetap', 'tetap', 'aktif', '2026-03-11', '2026-06-11', '2027-06-11', 999999999999.99, '2026-03-10 16:29:54', '2026-04-24 14:54:35'),
(4, 5, '', 'ezranhmry', NULL, 'Staff', NULL, 'Finance', 'Logistik', 'Finishing', 'Toko', NULL, NULL, 'penjualan ava', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '33', 'tetap', 'tetap', 'aktif', '2026-04-02', '2026-07-02', '2027-07-02', 0.00, '2026-04-07 10:19:21', '2026-04-24 15:22:30'),
(5, 6, NULL, 'avagrouphrd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'BCA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'training', 'training', 'aktif', NULL, NULL, NULL, 0.00, '2026-04-18 09:18:49', '2026-04-18 09:18:49');

-- --------------------------------------------------------

--
-- Table structure for table `laporan_kunjungan`
--

CREATE TABLE `laporan_kunjungan` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `tanggal` date NOT NULL,
  `waktu_submit` datetime NOT NULL,
  `nama_toko` varchar(255) NOT NULL,
  `foto_path` varchar(500) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `laporan_kunjungan`
--

INSERT INTO `laporan_kunjungan` (`id`, `karyawan_id`, `tanggal`, `waktu_submit`, `nama_toko`, `foto_path`, `latitude`, `longitude`, `created_at`) VALUES
(1, 3, '2026-04-21', '2026-04-21 12:58:07', 'Toko Lampu', '/uploads/visit-reports/visit-3-1776751087422.jpg', -7.8025077, 110.4067648, '2026-04-21 12:58:07'),
(2, 1, '2026-04-21', '2026-04-21 14:31:47', 'TOKO MAWAR', '/uploads/visit-reports/visit-1-1776756707076.jpg', -7.8025077, 110.4067648, '2026-04-21 14:31:47');

-- --------------------------------------------------------

--
-- Table structure for table `lembur`
--

CREATE TABLE `lembur` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `tanggal` date NOT NULL,
  `jam_mulai` datetime NOT NULL,
  `jam_selesai` datetime NOT NULL,
  `total_jam` decimal(6,2) NOT NULL DEFAULT 0.00,
  `bukti_lembur` varchar(255) DEFAULT NULL,
  `status_approval` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `catatan_atasan` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lembur`
--

INSERT INTO `lembur` (`id`, `karyawan_id`, `tanggal`, `jam_mulai`, `jam_selesai`, `total_jam`, `bukti_lembur`, `status_approval`, `approved_by`, `catatan_atasan`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-03-10', '2026-03-10 16:30:00', '2026-03-10 18:51:00', 2.35, '/uploads/overtime/1773132713856-Mar06-02_09.jpg.jpeg', 'rejected', 1, NULL, '2026-03-10 15:51:53', '2026-03-10 15:53:59'),
(2, 1, '2026-03-12', '2026-03-12 12:20:00', '2026-03-12 15:30:00', 3.17, '/uploads/overtime/1773202742942-Mar06-02_07.jpg.jpeg', 'approved', 1, 'jangan sampai larut malam', '2026-03-11 11:19:02', '2026-03-11 11:19:30');

-- --------------------------------------------------------

--
-- Table structure for table `log_distribusi_slip`
--

CREATE TABLE `log_distribusi_slip` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `slip_gaji_id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `didistribusikan_oleh` bigint(20) UNSIGNED NOT NULL,
  `tanggal_distribusi` datetime NOT NULL,
  `status_baca` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `omzet_bulanan`
--

CREATE TABLE `omzet_bulanan` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `periode_bulan` tinyint(3) UNSIGNED NOT NULL,
  `periode_tahun` smallint(5) UNSIGNED NOT NULL,
  `unit` varchar(100) NOT NULL DEFAULT '',
  `total_omzet` decimal(14,2) NOT NULL DEFAULT 0.00,
  `is_custom_bonus` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `omzet_bulanan`
--

INSERT INTO `omzet_bulanan` (`id`, `periode_bulan`, `periode_tahun`, `unit`, `total_omzet`, `is_custom_bonus`, `created_at`, `updated_at`) VALUES
(1, 3, 2026, '', 1030403520.00, 0, '2026-03-11 16:00:00', '2026-03-11 16:05:18'),
(2, 4, 2026, 'AVA+Ayres', 4000000000.00, 0, '2026-04-15 08:52:00', '2026-04-15 08:52:00'),
(3, 4, 2026, 'JNE', 20000.00, 1, '2026-04-15 08:52:00', '2026-04-15 08:57:08');

-- --------------------------------------------------------

--
-- Table structure for table `otp_codes`
--

CREATE TABLE `otp_codes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(190) NOT NULL,
  `code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `otp_codes`
--

INSERT INTO `otp_codes` (`id`, `email`, `code`, `expires_at`, `used`, `created_at`) VALUES
(1, 'ezranhmry@gmail.com', '489344', '2026-04-07 09:26:50', 1, '2026-04-07 09:21:50'),
(2, 'ezranhmry@gmail.com', '792405', '2026-04-07 10:24:02', 1, '2026-04-07 10:19:02'),
(3, 'ezra.kristanto@ti.ukdw.ac.id', '889381', '2026-04-18 09:15:20', 0, '2026-04-18 09:10:20');

-- --------------------------------------------------------

--
-- Table structure for table `payroll`
--

CREATE TABLE `payroll` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `periode_bulan` tinyint(3) UNSIGNED NOT NULL,
  `periode_tahun` smallint(5) UNSIGNED NOT NULL,
  `hari_kerja` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_masuk` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_lembur_jam` decimal(8,2) NOT NULL DEFAULT 0.00,
  `total_terlambat` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_setengah_hari` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `gaji_pokok` decimal(14,2) NOT NULL DEFAULT 0.00,
  `tunjangan_jabatan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `tunjangan_lain` decimal(14,2) NOT NULL DEFAULT 0.00,
  `bonus_performa` decimal(14,2) NOT NULL DEFAULT 0.00,
  `bpjs` decimal(14,2) NOT NULL DEFAULT 0.00,
  `uang_makan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `transport` decimal(14,2) NOT NULL DEFAULT 0.00,
  `insentif` decimal(14,2) NOT NULL DEFAULT 0.00,
  `upah_lembur` decimal(14,2) NOT NULL DEFAULT 0.00,
  `potongan_keterlambatan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `potongan_setengah_hari` decimal(14,2) NOT NULL DEFAULT 0.00,
  `potongan_kontrak` decimal(14,2) NOT NULL DEFAULT 0.00,
  `potongan_pinjaman` decimal(14,2) NOT NULL DEFAULT 0.00,
  `potongan_kerajinan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total_potongan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `gaji_bersih` decimal(14,2) NOT NULL DEFAULT 0.00,
  `status_payroll` enum('draft','processed','approved_finance','paid') NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll`
--

INSERT INTO `payroll` (`id`, `karyawan_id`, `periode_bulan`, `periode_tahun`, `hari_kerja`, `total_masuk`, `total_lembur_jam`, `total_terlambat`, `total_setengah_hari`, `gaji_pokok`, `tunjangan_jabatan`, `tunjangan_lain`, `bonus_performa`, `bpjs`, `uang_makan`, `transport`, `insentif`, `upah_lembur`, `potongan_keterlambatan`, `potongan_setengah_hari`, `potongan_kontrak`, `potongan_pinjaman`, `potongan_kerajinan`, `total_potongan`, `gaji_bersih`, `status_payroll`, `created_at`, `updated_at`) VALUES
(1, 3, 3, 2026, 24, 24, 4.00, 0, 1, 6000000.00, 100000.00, 380998.00, 0.00, 25000.00, 1680000.00, 0.00, 0.00, 80000.00, 0.00, 50000.00, 0.00, 700000.00, 0.00, 750000.00, 4515998.00, 'draft', '2026-03-11 16:08:42', '2026-03-12 10:57:01'),
(21, 2, 3, 2026, 24, 22, 2.00, 3, 0, 15000000.00, 200000.00, 736996.00, 0.00, 25000.00, 3300000.00, 0.00, 0.00, 40000.00, 60000.00, 0.00, 200000.00, 0.00, 1500000.00, 1760000.00, 10641996.00, 'draft', '2026-03-12 11:17:23', '2026-03-12 11:17:23'),
(26, 1, 3, 2026, 24, 10, 0.00, 2, 0, 2000000.00, 100000.00, 10000.00, 0.00, 25000.00, 100000.00, 0.00, 0.00, 0.00, 40000.00, 0.00, 200000.00, 0.00, 10000.00, 250000.00, 995000.00, 'draft', '2026-03-12 15:17:22', '2026-03-13 10:32:34'),
(27, 3, 4, 2026, 27, 10, 0.00, 2, 0, 2000000.00, 100000.00, 150000.00, 0.00, 25000.00, 200000.00, 15000.00, 0.00, 0.00, 40000.00, 0.00, 0.00, 0.00, 200000.00, 240000.00, 750000.00, 'draft', '2026-04-22 12:42:07', '2026-04-22 12:42:07'),
(28, 2, 4, 2026, 27, 27, 0.00, 1, 0, 4000000.00, 100000.00, 0.00, 0.00, 25000.00, 2403000.00, 0.00, 0.00, 0.00, 20000.00, 0.00, 0.00, 0.00, 0.00, 20000.00, 3858000.00, 'draft', '2026-04-24 09:35:15', '2026-04-24 09:35:46'),
(31, 1, 4, 2026, 27, 1, 0.00, 1, 0, 2000000.00, 0.00, 0.00, 0.00, 50000.00, 0.00, 5000.00, 0.00, 0.00, 20000.00, 0.00, 200000.00, 500000.00, 0.00, 720000.00, -615000.00, 'draft', '2026-04-24 14:27:49', '2026-04-24 14:27:49');

-- --------------------------------------------------------

--
-- Table structure for table `payroll_bonus`
--

CREATE TABLE `payroll_bonus` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `periode_bulan` tinyint(3) UNSIGNED NOT NULL,
  `periode_tahun` smallint(5) UNSIGNED NOT NULL,
  `bonus_type` enum('sales','spv','manager','cs','host_live') NOT NULL,
  `nominal_bonus` decimal(14,2) NOT NULL DEFAULT 0.00,
  `catatan` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_employee_input`
--

CREATE TABLE `payroll_employee_input` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `payroll_id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `payroll_type` enum('non_sales','sales') NOT NULL DEFAULT 'non_sales',
  `gaji_pokok_per_hari` decimal(14,2) NOT NULL DEFAULT 0.00,
  `uang_makan_per_hari` decimal(14,2) NOT NULL DEFAULT 0.00,
  `subsidi` decimal(14,2) NOT NULL DEFAULT 0.00,
  `uang_kerajinan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `bpjs` decimal(14,2) NOT NULL DEFAULT 0.00,
  `bonus_performa` decimal(14,2) NOT NULL DEFAULT 0.00,
  `insentif` decimal(14,2) NOT NULL DEFAULT 0.00,
  `uang_transport` decimal(14,2) NOT NULL DEFAULT 0.00,
  `kendaraan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `perjalanan_dinas_reimburse` decimal(14,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `override_masuk` int(11) DEFAULT NULL,
  `override_lembur` decimal(14,2) DEFAULT NULL,
  `override_izin` int(11) DEFAULT NULL,
  `override_sakit` int(11) DEFAULT NULL,
  `override_sakit_tanpa_surat` int(11) DEFAULT NULL,
  `override_setengah_hari` int(11) DEFAULT NULL,
  `override_kontrak` decimal(14,2) DEFAULT NULL,
  `override_pinjaman` decimal(14,2) DEFAULT NULL,
  `override_pinjaman_pribadi` decimal(14,2) DEFAULT NULL,
  `override_gaji_pokok` decimal(14,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payroll_employee_input`
--

INSERT INTO `payroll_employee_input` (`id`, `payroll_id`, `karyawan_id`, `payroll_type`, `gaji_pokok_per_hari`, `uang_makan_per_hari`, `subsidi`, `uang_kerajinan`, `bpjs`, `bonus_performa`, `insentif`, `uang_transport`, `kendaraan`, `perjalanan_dinas_reimburse`, `created_at`, `updated_at`, `override_masuk`, `override_lembur`, `override_izin`, `override_sakit`, `override_sakit_tanpa_surat`, `override_setengah_hari`, `override_kontrak`, `override_pinjaman`, `override_pinjaman_pribadi`, `override_gaji_pokok`) VALUES
(1, 1, 3, 'non_sales', 100000.00, 70000.00, 380998.00, 600000.00, 25000.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-11 16:08:42', '2026-03-12 10:57:01', 24, 4.00, 0, 1, 0, 1, NULL, 700000.00, NULL, 6000000.00),
(21, 21, 2, 'non_sales', 300000.00, 150000.00, 736996.00, 1500000.00, 25000.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-12 11:17:23', '2026-03-12 11:17:23', 22, 2.00, 1, 1, 1, 0, 200000.00, NULL, NULL, 15000000.00),
(26, 26, 1, 'non_sales', 100000.00, 10000.00, 10000.00, 10000.00, 25000.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-03-12 15:17:22', '2026-03-13 10:32:34', 10, 0.00, 0, 0, 0, 0, NULL, NULL, NULL, 2000000.00),
(29, 27, 3, 'sales', 30000.00, 20000.00, 150000.00, 200000.00, 25000.00, 0.00, 0.00, 15000.00, 0.00, 0.00, '2026-04-22 12:42:07', '2026-04-22 12:42:07', 10, 0.00, 0, 0, 0, 0, 0.00, 0.00, 0.00, 2000000.00),
(30, 28, 2, 'non_sales', 50000.00, 89000.00, 0.00, 0.00, 25000.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2026-04-24 09:35:15', '2026-04-24 09:35:46', 27, 0.00, 0, 0, 0, 0, 0.00, 0.00, NULL, 4000000.00),
(33, 31, 1, 'sales', 0.00, 0.00, 0.00, 0.00, 50000.00, 0.00, 0.00, 5000.00, 50000.00, 0.00, '2026-04-24 14:27:49', '2026-04-24 14:27:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2000000.00);

-- --------------------------------------------------------

--
-- Table structure for table `payroll_period_config`
--

CREATE TABLE `payroll_period_config` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `periode_bulan` tinyint(3) UNSIGNED NOT NULL,
  `periode_tahun` smallint(5) UNSIGNED NOT NULL,
  `total_omzet` decimal(14,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payroll_period_config`
--

INSERT INTO `payroll_period_config` (`id`, `periode_bulan`, `periode_tahun`, `total_omzet`, `created_at`, `updated_at`) VALUES
(1, 3, 2026, 2.00, '2026-03-11 15:50:01', '2026-03-11 15:55:32');

-- --------------------------------------------------------

--
-- Table structure for table `perjalanan_dinas`
--

CREATE TABLE `perjalanan_dinas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date NOT NULL,
  `surat_path` varchar(500) NOT NULL,
  `catatan` text DEFAULT NULL,
  `status_approval` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `catatan_admin` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `perjalanan_dinas`
--

INSERT INTO `perjalanan_dinas` (`id`, `karyawan_id`, `tanggal_mulai`, `tanggal_selesai`, `surat_path`, `catatan`, `status_approval`, `approved_by`, `approved_at`, `catatan_admin`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-04-24', '2026-04-26', '/uploads/business-trips/1777018612393-FancyIconText.png', 'PERGI CAMPING', 'rejected', 1, '2026-04-24 15:27:16', NULL, '2026-04-24 15:16:52', '2026-04-24 15:27:16'),
(2, 3, '2026-04-24', '2026-04-26', '/uploads/business-trips/1777018822923-SimpleIconBanner.png', 'CAMPING', 'approved', 1, '2026-04-24 15:27:21', NULL, '2026-04-24 15:20:22', '2026-04-24 15:27:21'),
(3, 4, '2026-04-24', '2026-04-27', '/uploads/business-trips/1777019013669-MascotIconWText.png', 'camp', 'approved', 1, '2026-04-24 15:24:51', NULL, '2026-04-24 15:23:33', '2026-04-24 15:24:51');

-- --------------------------------------------------------

--
-- Table structure for table `pinjaman`
--

CREATE TABLE `pinjaman` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `jumlah_pinjaman` decimal(14,2) NOT NULL,
  `jumlah_angsuran` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `angsuran_per_bulan` decimal(14,2) NOT NULL,
  `total_sudah_bayar` decimal(14,2) NOT NULL DEFAULT 0.00,
  `sisa_pinjaman` decimal(14,2) NOT NULL,
  `tanggal_pengajuan` date NOT NULL,
  `tanggal_approval` date DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `status_pinjaman` enum('pending','approved','berjalan','lunas','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pinjaman`
--

INSERT INTO `pinjaman` (`id`, `karyawan_id`, `jumlah_pinjaman`, `jumlah_angsuran`, `angsuran_per_bulan`, `total_sudah_bayar`, `sisa_pinjaman`, `tanggal_pengajuan`, `tanggal_approval`, `approved_by`, `status_pinjaman`, `created_at`, `updated_at`) VALUES
(1, 1, 1000000.00, 2, 500000.00, 0.00, 1000000.00, '2026-03-12', NULL, NULL, 'rejected', '2026-03-12 15:12:06', '2026-03-12 15:12:49'),
(2, 1, 1000000.00, 2, 500000.00, 500000.00, 500000.00, '2026-02-12', '2026-03-12', 1, 'berjalan', '2026-03-12 15:14:40', '2026-04-24 14:27:49');

-- --------------------------------------------------------

--
-- Table structure for table `pinjaman_cicilan`
--

CREATE TABLE `pinjaman_cicilan` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `pinjaman_id` bigint(20) UNSIGNED NOT NULL,
  `urutan_cicilan` int(10) UNSIGNED NOT NULL,
  `bulan` tinyint(3) UNSIGNED NOT NULL,
  `tahun` smallint(5) UNSIGNED NOT NULL,
  `nominal_potongan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `nominal_terpotong` decimal(14,2) DEFAULT NULL,
  `payroll_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pinjaman_cicilan`
--

INSERT INTO `pinjaman_cicilan` (`id`, `pinjaman_id`, `urutan_cicilan`, `bulan`, `tahun`, `nominal_potongan`, `nominal_terpotong`, `payroll_id`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 4, 2026, 500000.00, 500000.00, 31, '2026-03-12 15:15:32', '2026-04-24 14:27:49'),
(2, 2, 2, 5, 2026, 500000.00, NULL, NULL, '2026-03-12 15:15:32', '2026-03-12 15:15:32');

-- --------------------------------------------------------

--
-- Table structure for table `potongan_kontrak`
--

CREATE TABLE `potongan_kontrak` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `bulan` tinyint(3) UNSIGNED NOT NULL,
  `tahun` smallint(5) UNSIGNED NOT NULL,
  `nominal_potongan` decimal(14,2) NOT NULL DEFAULT 0.00,
  `keterangan` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `potongan_kontrak`
--

INSERT INTO `potongan_kontrak` (`id`, `karyawan_id`, `bulan`, `tahun`, `nominal_potongan`, `keterangan`, `created_at`, `updated_at`) VALUES
(151, 1, 3, 2026, 200000.00, 'Potongan kontrak bulan ke-1 dari 5', '2026-04-22 12:39:52', '2026-04-22 12:39:52'),
(152, 1, 4, 2026, 200000.00, 'Potongan kontrak bulan ke-2 dari 5', '2026-04-22 12:39:52', '2026-04-22 12:39:52'),
(153, 1, 5, 2026, 200000.00, 'Potongan kontrak bulan ke-3 dari 5', '2026-04-22 12:39:52', '2026-04-22 12:39:52'),
(154, 1, 6, 2026, 200000.00, 'Potongan kontrak bulan ke-4 dari 5', '2026-04-22 12:39:52', '2026-04-22 12:39:52'),
(155, 1, 7, 2026, 200000.00, 'Potongan kontrak bulan ke-5 dari 5', '2026-04-22 12:39:52', '2026-04-22 12:39:52'),
(156, 2, 6, 2026, 200000.00, 'Potongan kontrak bulan ke-1 dari 5', '2026-04-24 09:28:02', '2026-04-24 09:28:02'),
(157, 2, 7, 2026, 200000.00, 'Potongan kontrak bulan ke-2 dari 5', '2026-04-24 09:28:02', '2026-04-24 09:28:02'),
(158, 2, 8, 2026, 200000.00, 'Potongan kontrak bulan ke-3 dari 5', '2026-04-24 09:28:02', '2026-04-24 09:28:02'),
(159, 2, 9, 2026, 200000.00, 'Potongan kontrak bulan ke-4 dari 5', '2026-04-24 09:28:02', '2026-04-24 09:28:02'),
(160, 2, 10, 2026, 200000.00, 'Potongan kontrak bulan ke-5 dari 5', '2026-04-24 09:28:02', '2026-04-24 09:28:02'),
(161, 3, 6, 2026, 200000.00, 'Potongan kontrak bulan ke-1 dari 5', '2026-04-24 14:54:35', '2026-04-24 14:54:35'),
(162, 3, 7, 2026, 200000.00, 'Potongan kontrak bulan ke-2 dari 5', '2026-04-24 14:54:35', '2026-04-24 14:54:35'),
(163, 3, 8, 2026, 200000.00, 'Potongan kontrak bulan ke-3 dari 5', '2026-04-24 14:54:35', '2026-04-24 14:54:35'),
(164, 3, 9, 2026, 200000.00, 'Potongan kontrak bulan ke-4 dari 5', '2026-04-24 14:54:35', '2026-04-24 14:54:35'),
(165, 3, 10, 2026, 200000.00, 'Potongan kontrak bulan ke-5 dari 5', '2026-04-24 14:54:35', '2026-04-24 14:54:35'),
(166, 4, 7, 2026, 200000.00, 'Potongan kontrak bulan ke-1 dari 5', '2026-04-24 15:22:30', '2026-04-24 15:22:30'),
(167, 4, 8, 2026, 200000.00, 'Potongan kontrak bulan ke-2 dari 5', '2026-04-24 15:22:30', '2026-04-24 15:22:30'),
(168, 4, 9, 2026, 200000.00, 'Potongan kontrak bulan ke-3 dari 5', '2026-04-24 15:22:30', '2026-04-24 15:22:30'),
(169, 4, 10, 2026, 200000.00, 'Potongan kontrak bulan ke-4 dari 5', '2026-04-24 15:22:30', '2026-04-24 15:22:30'),
(170, 4, 11, 2026, 200000.00, 'Potongan kontrak bulan ke-5 dari 5', '2026-04-24 15:22:30', '2026-04-24 15:22:30');

-- --------------------------------------------------------

--
-- Table structure for table `reimbursements`
--

CREATE TABLE `reimbursements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `karyawan_id` bigint(20) UNSIGNED NOT NULL,
  `tanggal_pengajuan` date NOT NULL,
  `tanggal_biaya` date NOT NULL,
  `kategori` varchar(100) NOT NULL DEFAULT 'Perjalanan Dinas',
  `keterangan` text DEFAULT NULL,
  `nominal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `nota_path` varchar(500) NOT NULL,
  `status_approval` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `catatan_admin` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reimbursements`
--

INSERT INTO `reimbursements` (`id`, `karyawan_id`, `tanggal_pengajuan`, `tanggal_biaya`, `kategori`, `keterangan`, `nominal`, `nota_path`, `status_approval`, `approved_by`, `approved_at`, `catatan_admin`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-04-21', '2026-04-21', 'Perjalanan Dinas', '-', 200000.00, '/uploads/reimbursements/1776756726588-pelatih2.png', 'approved', 1, '2026-04-21 14:32:42', NULL, '2026-04-21 14:32:06', '2026-04-21 14:32:42'),
(2, 1, '2026-04-22', '2026-04-22', 'Perjalanan Dinas', '55555 erwg', 500000.00, '/uploads/reimbursements/1776835775613-Logo-Ayres-only-white--1-.png', 'approved', 1, '2026-04-22 12:30:02', NULL, '2026-04-22 12:29:35', '2026-04-22 12:30:02');

-- --------------------------------------------------------

--
-- Table structure for table `slip_gaji`
--

CREATE TABLE `slip_gaji` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `payroll_id` bigint(20) UNSIGNED NOT NULL,
  `nomor_slip` varchar(50) NOT NULL,
  `tanggal_distribusi` datetime DEFAULT NULL,
  `status_distribusi` enum('draft','didistribusikan','dibaca') NOT NULL DEFAULT 'draft',
  `file_slip` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nama` varchar(150) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','karyawan','spv') NOT NULL DEFAULT 'karyawan',
  `status_aktif` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nama`, `email`, `password`, `role`, `status_aktif`, `created_at`, `updated_at`) VALUES
(1, 'Ezra Kristanto', 'ezra.kristanto@ti.ukdw.ac.id', '437a70301fed0618c6c3375402de28fef9248362aafdc3070046339b4501195c', 'admin', 1, '2026-03-10 15:00:08', '2026-03-10 15:00:08'),
(2, 'ZEXO', 'zexo@gmail.com', '120eb43c9db4d2c719ec1a16519976bf3cbf59bff9f7cdf8745f4944db48d481', 'karyawan', 1, '2026-03-10 15:46:18', '2026-03-10 15:46:18'),
(3, 'ZETACO', 'zetaco@gmail.com', 'f87ddab125c15f8b9c73a89a2c4ba6ae145ff33d1e6a57629e4b403026a83382', 'karyawan', 1, '2026-03-10 16:14:08', '2026-03-10 16:14:08'),
(4, 'LEIF', 'leif@gmail.com', '5d00fdccb9467908ee514ef6516d24e04cd473d063796b9511d0e98c4bf62325', 'karyawan', 1, '2026-03-10 16:29:54', '2026-03-10 16:29:54'),
(5, 'ezranhmry', 'ezranhmry@gmail.com', '437a70301fed0618c6c3375402de28fef9248362aafdc3070046339b4501195c', 'karyawan', 1, '2026-04-07 10:19:21', '2026-04-07 10:19:21'),
(6, 'avagrouphrd', 'avagrouphrd@gmail.com', 'af4e76dcf9ca1021e3846b85ee029e187810c4dc3f2f23d5477e0feda6e5068f', 'karyawan', 1, '2026-04-18 09:18:49', '2026-04-18 09:18:49'),
(9, 'ezra', 'spv@gmail.com', '437a70301fed0618c6c3375402de28fef9248362aafdc3070046339b4501195c', 'spv', 1, '2026-04-25 15:29:43', '2026-04-25 15:29:43');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `absensi`
--
ALTER TABLE `absensi`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_absensi_karyawan_tanggal` (`karyawan_id`,`tanggal`),
  ADD KEY `idx_absensi_tanggal` (`tanggal`),
  ADD KEY `idx_absensi_status` (`status_absensi`),
  ADD KEY `idx_absensi_kode` (`kode_absensi`);

--
-- Indexes for table `finance_lembur_tambahan`
--
ALTER TABLE `finance_lembur_tambahan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_finance_lembur_unit` (`periode_bulan`,`periode_tahun`,`unit`);

--
-- Indexes for table `jadwal_karyawan`
--
ALTER TABLE `jadwal_karyawan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_karyawan_tanggal` (`karyawan_id`,`tanggal`),
  ADD KEY `idx_tanggal` (`tanggal`);

--
-- Indexes for table `karyawan`
--
ALTER TABLE `karyawan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_karyawan_user_id` (`user_id`),
  ADD UNIQUE KEY `uq_karyawan_no_karyawan` (`no_karyawan`),
  ADD UNIQUE KEY `uq_karyawan_nik` (`nik`),
  ADD KEY `idx_karyawan_nama` (`nama`),
  ADD KEY `idx_karyawan_unit` (`unit`),
  ADD KEY `idx_karyawan_departemen` (`departemen`),
  ADD KEY `idx_karyawan_divisi` (`divisi`),
  ADD KEY `idx_karyawan_status_kepegawaian` (`status_kepegawaian`),
  ADD KEY `idx_karyawan_status_kerja` (`status_kerja`),
  ADD KEY `idx_karyawan_status_data` (`status_data`);

--
-- Indexes for table `laporan_kunjungan`
--
ALTER TABLE `laporan_kunjungan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_laporan_kunjungan_karyawan_tanggal` (`karyawan_id`,`tanggal`),
  ADD KEY `idx_laporan_kunjungan_tanggal` (`tanggal`);

--
-- Indexes for table `lembur`
--
ALTER TABLE `lembur`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lembur_karyawan_tanggal` (`karyawan_id`,`tanggal`),
  ADD KEY `idx_lembur_status_approval` (`status_approval`),
  ADD KEY `idx_lembur_approved_by` (`approved_by`);

--
-- Indexes for table `log_distribusi_slip`
--
ALTER TABLE `log_distribusi_slip`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_log_distribusi_slip` (`slip_gaji_id`),
  ADD KEY `idx_log_distribusi_karyawan` (`karyawan_id`),
  ADD KEY `idx_log_distribusi_admin` (`didistribusikan_oleh`);

--
-- Indexes for table `omzet_bulanan`
--
ALTER TABLE `omzet_bulanan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_omzet_bulanan_periode_unit` (`periode_bulan`,`periode_tahun`,`unit`);

--
-- Indexes for table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_otp_email_code` (`email`,`code`);

--
-- Indexes for table `payroll`
--
ALTER TABLE `payroll`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payroll_periode` (`karyawan_id`,`periode_bulan`,`periode_tahun`),
  ADD KEY `idx_payroll_periode` (`periode_tahun`,`periode_bulan`),
  ADD KEY `idx_payroll_status` (`status_payroll`);

--
-- Indexes for table `payroll_bonus`
--
ALTER TABLE `payroll_bonus`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payroll_bonus_employee_period` (`karyawan_id`,`periode_bulan`,`periode_tahun`),
  ADD KEY `idx_payroll_bonus_period` (`periode_tahun`,`periode_bulan`);

--
-- Indexes for table `payroll_employee_input`
--
ALTER TABLE `payroll_employee_input`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payroll_employee_input_payroll` (`payroll_id`),
  ADD KEY `idx_payroll_employee_input_karyawan` (`karyawan_id`);

--
-- Indexes for table `payroll_period_config`
--
ALTER TABLE `payroll_period_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payroll_period_config` (`periode_bulan`,`periode_tahun`);

--
-- Indexes for table `perjalanan_dinas`
--
ALTER TABLE `perjalanan_dinas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_perjalanan_dinas_karyawan` (`karyawan_id`),
  ADD KEY `idx_perjalanan_dinas_status` (`status_approval`),
  ADD KEY `idx_perjalanan_dinas_tanggal` (`tanggal_mulai`,`tanggal_selesai`);

--
-- Indexes for table `pinjaman`
--
ALTER TABLE `pinjaman`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pinjaman_karyawan` (`karyawan_id`),
  ADD KEY `idx_pinjaman_status` (`status_pinjaman`),
  ADD KEY `idx_pinjaman_tanggal` (`tanggal_pengajuan`);

--
-- Indexes for table `pinjaman_cicilan`
--
ALTER TABLE `pinjaman_cicilan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pinjaman_cicilan_periode` (`pinjaman_id`,`bulan`,`tahun`),
  ADD UNIQUE KEY `uq_pinjaman_cicilan_urutan` (`pinjaman_id`,`urutan_cicilan`),
  ADD KEY `idx_pinjaman_cicilan_periode` (`tahun`,`bulan`),
  ADD KEY `idx_pinjaman_cicilan_payroll` (`payroll_id`);

--
-- Indexes for table `potongan_kontrak`
--
ALTER TABLE `potongan_kontrak`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_potongan_kontrak_periode` (`karyawan_id`,`bulan`,`tahun`),
  ADD KEY `idx_potongan_kontrak_periode` (`tahun`,`bulan`);

--
-- Indexes for table `reimbursements`
--
ALTER TABLE `reimbursements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reimbursements_karyawan` (`karyawan_id`),
  ADD KEY `idx_reimbursements_status` (`status_approval`),
  ADD KEY `idx_reimbursements_tanggal_biaya` (`tanggal_biaya`);

--
-- Indexes for table `slip_gaji`
--
ALTER TABLE `slip_gaji`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_slip_gaji_payroll_id` (`payroll_id`),
  ADD UNIQUE KEY `uq_slip_gaji_nomor_slip` (`nomor_slip`),
  ADD KEY `idx_slip_gaji_status` (`status_distribusi`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD KEY `idx_users_role_status` (`role`,`status_aktif`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `absensi`
--
ALTER TABLE `absensi`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `finance_lembur_tambahan`
--
ALTER TABLE `finance_lembur_tambahan`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jadwal_karyawan`
--
ALTER TABLE `jadwal_karyawan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `karyawan`
--
ALTER TABLE `karyawan`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `laporan_kunjungan`
--
ALTER TABLE `laporan_kunjungan`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `lembur`
--
ALTER TABLE `lembur`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `log_distribusi_slip`
--
ALTER TABLE `log_distribusi_slip`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `omzet_bulanan`
--
ALTER TABLE `omzet_bulanan`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `payroll`
--
ALTER TABLE `payroll`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `payroll_bonus`
--
ALTER TABLE `payroll_bonus`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_employee_input`
--
ALTER TABLE `payroll_employee_input`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `payroll_period_config`
--
ALTER TABLE `payroll_period_config`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `perjalanan_dinas`
--
ALTER TABLE `perjalanan_dinas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `pinjaman`
--
ALTER TABLE `pinjaman`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `pinjaman_cicilan`
--
ALTER TABLE `pinjaman_cicilan`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `potongan_kontrak`
--
ALTER TABLE `potongan_kontrak`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=171;

--
-- AUTO_INCREMENT for table `reimbursements`
--
ALTER TABLE `reimbursements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `slip_gaji`
--
ALTER TABLE `slip_gaji`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `absensi`
--
ALTER TABLE `absensi`
  ADD CONSTRAINT `fk_absensi_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `karyawan`
--
ALTER TABLE `karyawan`
  ADD CONSTRAINT `fk_karyawan_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lembur`
--
ALTER TABLE `lembur`
  ADD CONSTRAINT `fk_lembur_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lembur_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `log_distribusi_slip`
--
ALTER TABLE `log_distribusi_slip`
  ADD CONSTRAINT `fk_log_distribusi_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_log_distribusi_slip` FOREIGN KEY (`slip_gaji_id`) REFERENCES `slip_gaji` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_log_distribusi_user` FOREIGN KEY (`didistribusikan_oleh`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `payroll`
--
ALTER TABLE `payroll`
  ADD CONSTRAINT `fk_payroll_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payroll_bonus`
--
ALTER TABLE `payroll_bonus`
  ADD CONSTRAINT `fk_payroll_bonus_employee` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payroll_employee_input`
--
ALTER TABLE `payroll_employee_input`
  ADD CONSTRAINT `fk_payroll_employee_input_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_payroll_employee_input_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `perjalanan_dinas`
--
ALTER TABLE `perjalanan_dinas`
  ADD CONSTRAINT `fk_perjalanan_dinas_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pinjaman`
--
ALTER TABLE `pinjaman`
  ADD CONSTRAINT `fk_pinjaman_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pinjaman_cicilan`
--
ALTER TABLE `pinjaman_cicilan`
  ADD CONSTRAINT `fk_pinjaman_cicilan_pinjaman` FOREIGN KEY (`pinjaman_id`) REFERENCES `pinjaman` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `potongan_kontrak`
--
ALTER TABLE `potongan_kontrak`
  ADD CONSTRAINT `fk_potongan_kontrak_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reimbursements`
--
ALTER TABLE `reimbursements`
  ADD CONSTRAINT `fk_reimbursements_karyawan` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `slip_gaji`
--
ALTER TABLE `slip_gaji`
  ADD CONSTRAINT `fk_slip_gaji_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
