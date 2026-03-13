import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listFinanceSummary } from "@/lib/hris";

export default async function AdminFinancePage() {
  const admin = await requireAdminSession();
  const rows = await listFinanceSummary();

  return (
    <AdminShell
      title="Perhitungan untuk Finance"
      description="Pembagian rekapan per departemen, pembebanan, pencairan gaji, dan indikasi hutang/kontrak diringkas dari tabel payroll, karyawan, dan pinjaman."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/finance"
    >
      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Departemen</th>
              <th className="px-6 py-4">Pembagian Rekapan</th>
              <th className="px-6 py-4">Pembebanan</th>
              <th className="px-6 py-4">Pencairan Gaji</th>
              <th className="px-6 py-4">Keterangan Hutang/Kontrak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.departemen}-${index}`} className="border-b border-[#f1e5de] text-[#513d39]">
                <td className="px-6 py-4 font-semibold text-[#241716]">{row.departemen}</td>
                <td className="px-6 py-4">{row.pembagian_rekapan || "-"}</td>
                <td className="px-6 py-4">{row.pembebanan || "-"}</td>
                <td className="px-6 py-4">Rp{row.total_pencairan}</td>
                <td className="px-6 py-4">
                  Kontrak: Rp{row.total_potongan_kontrak} | Pinjaman: Rp{row.total_potongan_pinjaman}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
