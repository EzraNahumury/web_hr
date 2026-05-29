import EmployeeShell from "@/components/EmployeeShell";
import EmployeeOvertimeManager from "@/components/EmployeeOvertimeManager";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeOvertime } from "@/lib/hris";
import { listEligibleApprovers } from "@/lib/overtime";
import { isManager } from "@/lib/scheduler-roles";

export default async function EmployeeOvertimePage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const routesToAdmin = isManager(employee.jabatan);
  const [rows, approvers] = await Promise.all([
    getEmployeeOvertime(employee.id),
    listEligibleApprovers(employee.jabatan),
  ]);

  // Exclude self from approver list
  const approverOptions = approvers
    .filter((approver) => approver.userId !== session.userId)
    .map((approver) => ({
      userId: approver.userId,
      name: approver.name,
      role: approver.role,
    }));

  const jabatan = employee.jabatan ?? "";

  return (
    <EmployeeShell
      title="Pengajuan Lembur"
      description={
        routesToAdmin
          ? "Isi form lembur dan pilih admin yang akan menerima pengajuan."
          : jabatan.toLowerCase() === "supervisor"
            ? "Isi form lembur dan pilih Manager atau Admin yang akan menerima pengajuan."
            : "Isi form lembur dan pilih Supervisor atau Admin yang akan menerima pengajuan."
      }
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
        jabatan={jabatan}
        divisi={employee.divisi ?? ""}
      />
    </EmployeeShell>
  );
}
