import { redirect } from "next/navigation";

import EmployeeShell from "@/components/EmployeeShell";
import AdminOvertimeApprovals from "@/components/AdminOvertimeApprovals";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, listOvertimeRecords } from "@/lib/hris";
import { isManager } from "@/lib/scheduler-roles";

export const dynamic = "force-dynamic";

export default async function EmployeeOvertimeHistoryPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  // Hanya manager yang boleh lihat history lembur seluruh karyawan (read-only).
  if (!isManager(employee.jabatan)) {
    redirect("/employee");
  }

  const rows = await listOvertimeRecords();

  return (
    <EmployeeShell
      title="History Lembur"
      description="Riwayat lembur seluruh karyawan. Hanya untuk dilihat (read-only)."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/overtime-history"
      employeeRole={employee.jabatan}
      employeeDepartment={employee.departemen}
    >
      <AdminOvertimeApprovals rows={rows} canApprove={false} />
    </EmployeeShell>
  );
}
