import { redirect } from "next/navigation";

import EmployeeShell from "@/components/EmployeeShell";
import AdminItemLoansManager from "@/components/AdminItemLoansManager";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { listEmployees } from "@/lib/employees";
import { listItemLoans } from "@/lib/item-loans";
import { isFinanceDept } from "@/lib/scheduler-roles";

export const dynamic = "force-dynamic";

export default async function EmployeeItemLoansPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  // Hanya karyawan departemen Finance (read-only).
  if (!isFinanceDept(employee.departemen)) {
    redirect("/employee");
  }

  const [rows, employees] = await Promise.all([listItemLoans(), listEmployees()]);
  const employeeOptions = employees
    .filter((e) => e.dataStatus !== "nonaktif")
    .map((e) => ({ id: e.id, name: e.name, nip: e.nip || "-" }));

  return (
    <EmployeeShell
      title="Peminjaman Barang"
      description="Daftar peminjaman barang/aset perusahaan oleh karyawan. Hanya untuk dilihat (read-only)."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/item-loans"
      employeeRole={employee.jabatan}
      employeeDepartment={employee.departemen}
    >
      <AdminItemLoansManager initialRows={rows} employees={employeeOptions} readOnly />
    </EmployeeShell>
  );
}
