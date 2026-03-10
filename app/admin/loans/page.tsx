import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listLoanRecords } from "@/lib/hris";

export default async function AdminLoansPage() {
  const admin = await requireAdminSession();
  const rows = await listLoanRecords();

  return (
    <AdminShell
      title="Manajemen Pinjaman"
      description="Data pinjaman, cicilan, total pembayaran, dan sisa pinjaman diambil dari tabel pinjaman."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/loans"
    >
      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">Jabatan</th>
              <th className="px-6 py-4">Departemen</th>
              <th className="px-6 py-4">Pinjaman</th>
              <th className="px-6 py-4">Angsuran / Bulan</th>
              <th className="px-6 py-4">Total Sudah Bayar</th>
              <th className="px-6 py-4">Sisa Pinjaman</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#f1e5de] text-[#513d39]">
                <td className="px-6 py-4 font-semibold text-[#241716]">{row.nama}</td>
                <td className="px-6 py-4">{row.jabatan}</td>
                <td className="px-6 py-4">{row.departemen}</td>
                <td className="px-6 py-4">Rp{row.jumlah_pinjaman}</td>
                <td className="px-6 py-4">Rp{row.angsuran_per_bulan}</td>
                <td className="px-6 py-4">Rp{row.total_sudah_bayar}</td>
                <td className="px-6 py-4">Rp{row.sisa_pinjaman}</td>
                <td className="px-6 py-4">{row.status_pinjaman}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
