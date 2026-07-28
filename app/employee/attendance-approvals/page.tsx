import { redirect } from "next/navigation";

import EmployeeShell from "@/components/EmployeeShell";
import AttendanceApprovalManager from "@/components/AttendanceApprovalManager";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { listAttendanceApprovalsForApprover } from "@/lib/attendance-approval";
import { canSetSchedule } from "@/lib/scheduler-roles";

export const dynamic = "force-dynamic";

export default async function EmployeeAttendanceApprovalsPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }
  if (!canSetSchedule(employee.jabatan)) {
    redirect("/employee");
  }

  const rows = await listAttendanceApprovalsForApprover(session.userId);

  return (
    <EmployeeShell
      title="Approval Absensi"
      description="Review pengajuan telat / pulang awal dari tim yang ditujukan ke Anda, lalu approve atau reject."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/attendance-approvals"
      employeeRole={employee.jabatan}
      employeeDepartment={employee.departemen}
    >
      <AttendanceApprovalManager rows={rows} endpoint="/api/employee/attendance-approvals" />
    </EmployeeShell>
  );
}
