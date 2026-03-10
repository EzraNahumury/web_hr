import EmployeeShell from "@/components/EmployeeShell";
import EmployeeOvertimeManager from "@/components/EmployeeOvertimeManager";
import { getEmployeeByEmail, getEmployeeOvertime } from "@/lib/hris";

export default async function EmployeeOvertimePage() {
  const employee = await getEmployeeByEmail("rina.saputri@company.local");

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
