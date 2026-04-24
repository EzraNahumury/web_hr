# Ringkasan Sistem Gaji Penjahit

---

## Identifikasi di Admin Data Karyawan

Flow:
1. Pilih jabatan → dropdown
2. Jika pilih **"penjahit"** → muncul checkbox pilihan di bawah:
   - ☐ Mingguan
   - ☐ Bulanan

Hasil:

| Jabatan | Pilihan |
|---------|---------|
| Penjahit | Mingguan |
| Penjahit | Bulanan |
| (jabatan lain) | - |

---

## 2 Tipe Payroll

1. **Weekly** - 4x bayar (tgl 1, 8, 16, 25)
2. **Monthly** - 1x bayar (tgl 25), sama kayak karyawan reguler

---

## Weekly - Tanpa Pinjaman

| Tanggal Bayar | Potongan |
|---------------|----------|
| 8 | Tidak ada |
| 16 | Tidak ada |
| 25 | Semua potongan (attendance + kontrak + faktor lain) |
| 1 (bln berikutnya) | Tidak ada |

## Weekly - Dengan Pinjaman

| Tanggal Bayar | Potongan |
|---------------|----------|
| 8 | Cicilan mingguan |
| 16 | Cicilan mingguan |
| 25 | Cicilan mingguan + semua potongan |
| 1 (bln berikutnya) | Cicilan mingguan |

---

## Monthly - Tanpa Pinjaman

- 1x bayar tgl 25, potongan sesuai sistem reguler

## Monthly - Dengan Pinjaman

- Potongan cicilan per bulan

---

