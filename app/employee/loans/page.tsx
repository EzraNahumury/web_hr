import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeLoans } from "@/lib/hris";

export default async function EmployeeLoansPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  const rows = await getEmployeeLoans(employee.id);

  return (
    <EmployeeShell
      title="Status Pinjaman"
      description="Sisa pinjaman, cicilan per bulan, dan total pembayaran dibaca dari tabel pinjaman."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/loans"
    >
      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Pinjaman</th>
              <th className="px-6 py-4">Angsuran/Bulan</th>
              <th className="px-6 py-4">Total Sudah Bayar</th>
              <th className="px-6 py-4">Sisa</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#f1e5de]">
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
    </EmployeeShell>
  );
}
