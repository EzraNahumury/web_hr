import { redirect } from "next/navigation";

import EmployeeShell from "@/components/EmployeeShell";
import EmployeeVisitReportCapture from "@/components/EmployeeVisitReportCapture";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { isSalesFieldRole } from "@/lib/sales-roles";

export default async function EmployeeVisitReportPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  if (!isSalesFieldRole(employee.jabatan)) {
    redirect("/employee");
  }

  return (
    <EmployeeShell
      title="Laporan Kunjungan"
      description="Submit laporan tiap kali sampai di lokasi toko/customer. Bisa submit berkali-kali dalam satu hari."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/visit-report"
      employeeRole={employee.jabatan}
    >
      <EmployeeVisitReportCapture />
    </EmployeeShell>
  );
}
