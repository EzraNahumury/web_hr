import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeOverview } from "@/lib/hris";

export default async function EmployeeDashboardPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const overview = await getEmployeeOverview(employee.id);

  return (
    <EmployeeShell
      title="Dashboard Karyawan"
      description="Ringkasan data pribadi diambil langsung dari tabel absensi, lembur, pinjaman, dan slip gaji."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Masuk Bulan Ini</p>
          <p className="mt-3 text-3xl font-semibold text-[#241716]">{overview.attendanceThisMonth}</p>
        </div>
        <div className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Request Lembur</p>
          <p className="mt-3 text-3xl font-semibold text-[#241716]">{overview.overtimeCount}</p>
        </div>
        <div className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Sisa Pinjaman</p>
          <p className="mt-3 text-3xl font-semibold text-[#241716]">Rp{overview.remainingLoan}</p>
        </div>
        <div className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Slip Gaji</p>
          <p className="mt-3 text-3xl font-semibold text-[#241716]">{overview.payslipCount}</p>
        </div>
      </div>
    </EmployeeShell>
  );
}
