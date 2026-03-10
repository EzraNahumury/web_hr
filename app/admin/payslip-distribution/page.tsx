import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayslipDistribution } from "@/lib/hris";

export default async function AdminPayslipDistributionPage() {
  const admin = await requireAdminSession();
  const rows = await listPayslipDistribution();

  return (
    <AdminShell
      title="Distribusi Slip Gaji"
      description="Log distribusi slip dibaca dari tabel log_distribusi_slip dan slip_gaji untuk memantau status kirim dan baca."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payslip-distribution"
    >
      <div className="mb-6 flex items-center justify-between rounded-[28px] border border-[#ead7ce] bg-[#fff8f4] px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-[#2f1f1d]">Distribusi Slip Gaji</p>
          <p className="mt-1 text-sm text-[#7a6059]">Tombol distribusi akan mengikuti alur tabel `slip_gaji` dan `log_distribusi_slip`.</p>
        </div>
        <button className="rounded-2xl bg-[#8f1d22] px-5 py-3 text-sm font-semibold text-white">
          Distribusi Slip Gaji
        </button>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Slip</th>
              <th className="px-6 py-4">Karyawan</th>
              <th className="px-6 py-4">Didistribusikan Oleh</th>
              <th className="px-6 py-4">Tanggal Distribusi</th>
              <th className="px-6 py-4">Status Slip</th>
              <th className="px-6 py-4">Status Baca</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#f1e5de] text-[#513d39]">
                <td className="px-6 py-4 font-semibold text-[#241716]">{row.nomor_slip}</td>
                <td className="px-6 py-4">{row.nama}</td>
                <td className="px-6 py-4">{row.didistribusikan_oleh_nama}</td>
                <td className="px-6 py-4">{row.tanggal_distribusi}</td>
                <td className="px-6 py-4">{row.status_distribusi}</td>
                <td className="px-6 py-4">{row.status_baca === 1 ? "Sudah dibaca" : "Belum dibaca"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
