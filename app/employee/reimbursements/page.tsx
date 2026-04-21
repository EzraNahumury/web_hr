import EmployeeReimbursementsManager from "@/components/EmployeeReimbursementsManager";
import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { getJakartaDate } from "@/lib/attendance";
import { listEmployeeReimbursements } from "@/lib/reimbursements";

export default async function EmployeeReimbursementsPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const rows = await listEmployeeReimbursements(employee.id);

  return (
    <EmployeeShell
      title="Pengajuan Reimburse"
      description="Upload nota perjalanan dinas untuk diajukan ke admin."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} | ${employee.jabatan}`}
      currentPath="/employee/reimbursements"
      employeeRole={employee.jabatan}
    >
      <EmployeeReimbursementsManager initialRows={rows} defaultRequestDate={getJakartaDate()} />
    </EmployeeShell>
  );
}
