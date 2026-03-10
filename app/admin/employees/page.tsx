import AdminEmployeesManager from "@/components/AdminEmployeesManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { getEmployeeLookups, getEmployeeStats, listEmployees } from "@/lib/employees";

export default async function AdminEmployeesPage() {
  const admin = await requireAdminSession();

  const [employees, lookups, stats] = await Promise.all([
    listEmployees(),
    getEmployeeLookups(),
    getEmployeeStats(),
  ]);

  return (
    <AdminShell
      title="CRUD Data Karyawan"
      description="Kelola data master karyawan yang nantinya dipakai oleh modul absensi, kontrak, lembur, dan payroll."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/employees"
    >
      <AdminEmployeesManager
        initialEmployees={employees}
        lookups={lookups}
        stats={stats}
      />
    </AdminShell>
  );
}
