import EmployeeShell from "@/components/EmployeeShell";
import EmployeeOvertimeManager from "@/components/EmployeeOvertimeManager";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeOvertime } from "@/lib/hris";

export default async function EmployeeOvertimePage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const rows = await getEmployeeOvertime(employee.id);

  return (
    <EmployeeShell
      title="Pengajuan Lembur"
      description="Karyawan mengisi form lembur di halaman ini, lalu admin akan memproses approve atau reject."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/overtime"
    >
      <EmployeeOvertimeManager employeeId={employee.id} rows={rows} />
    </EmployeeShell>
  );
}
