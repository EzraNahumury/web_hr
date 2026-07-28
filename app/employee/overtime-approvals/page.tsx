import { redirect } from "next/navigation";

import EmployeeShell from "@/components/EmployeeShell";
import OvertimeApproverManager from "@/components/OvertimeApproverManager";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { listOvertimeForApprover } from "@/lib/overtime";
import { canSetSchedule } from "@/lib/scheduler-roles";

export const dynamic = "force-dynamic";

export default async function EmployeeOvertimeApprovalsPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  if (!canSetSchedule(employee.jabatan)) {
    redirect("/employee");
  }

  const rows = await listOvertimeForApprover(session.userId);

  return (
    <EmployeeShell
      title="Approval Lembur"
      description="Review pengajuan lembur dari tim yang Anda supervise lalu approve atau reject."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/overtime-approvals"
      employeeRole={employee.jabatan}
      employeeDepartment={employee.departemen}
    >
      <OvertimeApproverManager rows={rows} endpoint="/api/employee/overtime-approvals" />
    </EmployeeShell>
  );
}
