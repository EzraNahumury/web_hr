import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeePayslips } from "@/lib/hris";

export default async function EmployeePayslipsPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  const rows = await getEmployeePayslips(employee.id);

  return (
    <EmployeeShell
      title="Slip Gaji"
      description="Daftar slip gaji pribadi dibaca dari tabel slip_gaji dan payroll."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/payslips"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">{row.nomor_slip}</p>
            <h3 className="mt-3 text-xl font-semibold text-[#241716]">
              Periode {row.periode_bulan}/{row.periode_tahun}
            </h3>
            <p className="mt-3 text-sm text-[#7a6059]">Bank {row.bank || "-"} • {row.no_rekening || "-"}</p>
            <p className="mt-4 text-sm text-[#7a6059]">Hari kerja {row.hari_kerja}, lembur {row.total_lembur_jam} jam, terlambat {row.total_terlambat} menit.</p>
            <p className="mt-5 text-lg font-semibold text-[#8f1d22]">Rp{row.gaji_bersih}</p>
          </article>
        ))}
      </div>
    </EmployeeShell>
  );
}
