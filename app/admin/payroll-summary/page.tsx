import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayrollSummary } from "@/lib/hris";

export default async function AdminPayrollSummaryPage() {
  const admin = await requireAdminSession();
  const rows = await listPayrollSummary();

  return (
    <AdminShell
      title="Summary Payroll"
      description="Semua komponen payroll dibaca dari tabel payroll dan ditampilkan sebagai rekap untuk admin dan finance."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-summary"
    >
      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-4 py-4">Nama</th>
                <th className="px-4 py-4">Periode</th>
                <th className="px-4 py-4">Gaji Pokok</th>
                <th className="px-4 py-4">Final/Harian</th>
                <th className="px-4 py-4">Tunj. Jabatan</th>
                <th className="px-4 py-4">Tunj. Lain</th>
                <th className="px-4 py-4">Transport</th>
                <th className="px-4 py-4">BPJS</th>
                <th className="px-4 py-4">Bonus Performa</th>
                <th className="px-4 py-4">Hari Kerja</th>
                <th className="px-4 py-4">Masuk</th>
                <th className="px-4 py-4">Uang Makan</th>
                <th className="px-4 py-4">Lembur</th>
                <th className="px-4 py-4">Setengah Hari</th>
                <th className="px-4 py-4">Total Potongan</th>
                <th className="px-4 py-4">Kontrak</th>
                <th className="px-4 py-4">Pinjaman</th>
                <th className="px-4 py-4">Denda</th>
                <th className="px-4 py-4">Kerajinan</th>
                <th className="px-4 py-4">Penerimaan Bersih</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#f1e5de] text-[#513d39]">
                  <td className="px-4 py-4 font-semibold text-[#241716]">{row.nama}</td>
                  <td className="px-4 py-4">{row.periode_bulan}/{row.periode_tahun}</td>
                  <td className="px-4 py-4">Rp{row.gaji_pokok}</td>
                  <td className="px-4 py-4">Rp{row.total_gaji_pokok}</td>
                  <td className="px-4 py-4">Rp{row.tunjangan_jabatan}</td>
                  <td className="px-4 py-4">Rp{row.tunjangan_lain}</td>
                  <td className="px-4 py-4">Rp{row.transport}</td>
                  <td className="px-4 py-4">Rp{row.bpjs}</td>
                  <td className="px-4 py-4">Rp{row.bonus_performa}</td>
                  <td className="px-4 py-4">{row.hari_kerja}</td>
                  <td className="px-4 py-4">{row.total_masuk}</td>
                  <td className="px-4 py-4">Rp{row.uang_makan}</td>
                  <td className="px-4 py-4">{row.total_lembur_jam} jam</td>
                  <td className="px-4 py-4">{row.total_setengah_hari}</td>
                  <td className="px-4 py-4">Rp{row.total_potongan}</td>
                  <td className="px-4 py-4">Rp{row.potongan_kontrak}</td>
                  <td className="px-4 py-4">Rp{row.potongan_pinjaman}</td>
                  <td className="px-4 py-4">Rp{row.potongan_keterlambatan}</td>
                  <td className="px-4 py-4">Rp{row.potongan_kerajinan}</td>
                  <td className="px-4 py-4 font-semibold text-[#8f1d22]">Rp{row.gaji_bersih}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
