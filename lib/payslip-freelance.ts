import { getFreelanceSheet } from "@/lib/payroll-freelance";

// Satu baris rincian pekerjaan freelance untuk slip.
export type FreelanceSlipItem = {
  jenis: string;
  detail: string;
  total: number;
};

export type FreelanceSlip = {
  employeeId: number;
  name: string;
  periodMonth: number;
  periodYear: number;
  items: FreelanceSlipItem[];
  grandTotal: number;
};

function rp(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

// Slip gaji freelance untuk SATU karyawan pada satu periode: gabung semua tipe pekerjaan
// (jam, pengerjaan, harian, custom) menjadi daftar rincian + total take-home.
// Freelance tidak punya baris di tabel payroll, jadi slip dihitung live dari getFreelanceSheet.
export async function getFreelanceSlipForEmployee(
  employeeId: number,
  month: number,
  year: number,
): Promise<FreelanceSlip | null> {
  const sheet = await getFreelanceSheet({ month, year });
  if (!sheet) return null;

  const items: FreelanceSlipItem[] = [];
  let name = "";

  for (const r of sheet.jam) {
    if (r.employeeId !== employeeId) continue;
    name = r.name;
    if (r.total > 0 || r.jamKerja > 0) {
      items.push({
        jenis: "Per Jam",
        detail: `${r.jamKerja} jam × ${rp(r.ratePerJam)}`,
        total: r.total,
      });
    }
  }
  for (const r of sheet.pengerjaan) {
    if (r.employeeId !== employeeId) continue;
    name = name || r.name;
    items.push({
      jenis: "Pengerjaan",
      detail: `${r.jumlahPcs} pcs × ${rp(r.hargaPerPcs)}`,
      total: r.total,
    });
  }
  for (const r of sheet.harian) {
    if (r.employeeId !== employeeId) continue;
    name = name || r.name;
    items.push({
      jenis: "Harian",
      detail: `${r.hariMasuk} hari × ${rp(r.hargaPerHari)}`,
      total: r.total,
    });
  }
  for (const r of sheet.custom) {
    if (r.employeeId !== employeeId) continue;
    name = name || r.name;
    for (const it of r.items) {
      items.push({
        jenis: it.namaJenis,
        detail: `${it.jumlahPcs} pcs × ${rp(it.hargaPerPcs)}`,
        total: it.total,
      });
    }
  }

  const grandTotal = items.reduce((s, it) => s + it.total, 0);
  if (items.length === 0) return null;

  return {
    employeeId,
    name,
    periodMonth: sheet.periodMonth,
    periodYear: sheet.periodYear,
    items,
    grandTotal,
  };
}
