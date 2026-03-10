import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeContract } from "@/lib/hris";

export default async function EmployeeContractPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  const rows = await getEmployeeContract(employee.id);

  return (
    <EmployeeShell
      title="Informasi Kontrak"
      description="Menampilkan data kontrak aktif, kenaikan tiap tahun, dan riwayat potongan kontrak dari tabel karyawan dan potongan_kontrak."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/contract"
    >
      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Tanggal Kontrak</th>
              <th className="px-6 py-4">Kenaikan/Tahun</th>
              <th className="px-6 py-4">Potongan</th>
              <th className="px-6 py-4">Periode</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#f1e5de]">
                <td className="px-6 py-4">{row.tanggal_kontrak || "-"}</td>
                <td className="px-6 py-4">Rp{row.kenaikan_tiap_tahun}</td>
                <td className="px-6 py-4">Rp{row.nominal_potongan}</td>
                <td className="px-6 py-4">{row.bulan}/{row.tahun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EmployeeShell>
  );
}
