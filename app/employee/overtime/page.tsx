import EmployeeShell from "@/components/EmployeeShell";
import EmployeeOvertimeManager from "@/components/EmployeeOvertimeManager";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeOvertime } from "@/lib/hris";
import { listEligibleApprovers } from "@/lib/overtime";
import { canSetSchedule } from "@/lib/scheduler-roles";

export default async function EmployeeOvertimePage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const routesToAdmin = canSetSchedule(employee.jabatan);
  const [rows, approvers] = await Promise.all([
    getEmployeeOvertime(employee.id),
    routesToAdmin ? Promise.resolve([]) : listEligibleApprovers(),
  ]);

  // Exclude self from approver list (so a Manager/Supervisor cannot pick themselves)
  const approverOptions = approvers
    .filter((approver) => approver.userId !== session.userId)
    .map((approver) => ({
      userId: approver.userId,
      name: approver.name,
      role: approver.role,
    }));

  return (
    <EmployeeShell
      title="Pengajuan Lembur"
      description="Karyawan mengisi form lembur di halaman ini. Pengajuan diproses oleh SPV/Manager (atau admin untuk jabatan Manager/Supervisor)."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/overtime"
      employeeRole={employee.jabatan}
    >
      <EmployeeOvertimeManager
        employeeId={employee.id}
        rows={rows}
        approvers={approverOptions}
        routesToAdmin={routesToAdmin}
      />
    </EmployeeShell>
  );
}
