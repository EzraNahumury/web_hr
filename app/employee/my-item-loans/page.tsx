import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { listItemLoansByEmployee } from "@/lib/item-loans";

export const dynamic = "force-dynamic";

export default async function EmployeeMyItemLoansPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  // Hanya barang yang dipinjam oleh karyawan ini (tidak menampilkan pinjaman orang lain).
  const rows = await listItemLoansByEmployee(employee.id);

  return (
    <EmployeeShell
      title="Barang Dipinjam"
      description="Daftar barang/aset perusahaan yang sedang Anda pinjam (lihat saja)."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/my-item-loans"
      employeeRole={employee.jabatan}
      employeeDepartment={employee.departemen}
    >
      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">No</th>
              <th className="px-6 py-4">Barang Dipinjam</th>
              <th className="px-6 py-4">Tgl Peminjaman</th>
              <th className="px-6 py-4">Keterangan</th>
              <th className="px-6 py-4">Dipinjam Bersama</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#9e7467]">
                  Anda belum meminjam barang apa pun.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const others = row.employees.filter((e) => e.id !== employee.id);
                return (
                  <tr key={row.id} className="border-b border-[#f1e5de] align-top">
                    <td className="px-6 py-4 text-[#b49a90]">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {row.items.length === 0 ? (
                          <span className="text-[#9e7467]">-</span>
                        ) : (
                          row.items.map((item, idx) => (
                            <span
                              key={`${row.id}-${idx}`}
                              className="rounded-full border border-[#dbe5f0] bg-[#eef4fb] px-3 py-1 text-xs font-medium text-[#2f5a86]"
                            >
                              {item}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{row.loanDate || "-"}</td>
                    <td className="px-6 py-4 max-w-[260px] text-[#6b4f48]">{row.note?.trim() || "-"}</td>
                    <td className="px-6 py-4 max-w-[220px] text-[#6b4f48]">
                      {others.length === 0 ? "-" : others.map((e) => e.name).join(", ")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </EmployeeShell>
  );
}
