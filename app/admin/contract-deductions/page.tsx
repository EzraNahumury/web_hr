import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listContractDeductionRecords } from "@/lib/hris";

export default async function AdminContractDeductionsPage() {
  const admin = await requireAdminSession();
  const rows = await listContractDeductionRecords();

  return (
    <AdminShell
      title="Potongan Kontrak"
      description="Menampilkan data kontrak, kenaikan tiap tahun, dan potongan kontrak per bulan dari tabel karyawan dan potongan_kontrak."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/contract-deductions"
    >
      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">NIP</th>
              <th className="px-6 py-4">Jabatan</th>
              <th className="px-6 py-4">Divisi</th>
              <th className="px-6 py-4">Departemen</th>
              <th className="px-6 py-4">Kontrak</th>
              <th className="px-6 py-4">Kenaikan / Tahun</th>
              <th className="px-6 py-4">Potongan / Bulan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#f1e5de] text-[#513d39]">
                <td className="px-6 py-4 font-semibold text-[#241716]">{row.nama}</td>
                <td className="px-6 py-4">{row.no_karyawan}</td>
                <td className="px-6 py-4">{row.jabatan}</td>
                <td className="px-6 py-4">{row.divisi}</td>
                <td className="px-6 py-4">{row.departemen}</td>
                <td className="px-6 py-4">{row.tanggal_kontrak || "-"}</td>
                <td className="px-6 py-4">Rp{row.kenaikan_tiap_tahun}</td>
                <td className="px-6 py-4">Rp{row.nominal_potongan} ({row.bulan}/{row.tahun})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
