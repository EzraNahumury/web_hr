import AdminLoansManager from "@/components/AdminLoansManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listAdminLoans } from "@/lib/loans";
import { listPayrollEmployeeOptions } from "@/lib/payroll-admin";

export default async function AdminLoansPage() {
  const admin = await requireAdminSession();
  const [rows, employeeOptions] = await Promise.all([
    listAdminLoans(),
    listPayrollEmployeeOptions(),
  ]);

  return (
    <AdminShell
      title="Pinjaman Karyawan"
      description="Admin memproses approval pinjaman, melihat jadwal bulan cicilan otomatis, dan memastikan potongan pinjaman masuk ke payroll sesuai periode cicilan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/loans"
    >
      <AdminLoansManager
        initialRows={rows}
        employeeOptions={employeeOptions.map((emp) => ({
          employeeId: emp.employeeId,
          name: emp.name,
          role: emp.role,
          isWeekly: emp.isWeekly,
        }))}
      />
    </AdminShell>
  );
}
