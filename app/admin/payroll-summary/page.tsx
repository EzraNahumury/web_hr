import AdminPayrollSummaryManager from "@/components/AdminPayrollSummaryManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { getPayrollOmzetPeriod, listPayrollEmployeeOptions } from "@/lib/payroll-admin";
import { getAdminPayrollSummarySheet } from "@/lib/payroll-summary";

export default async function AdminPayrollSummaryPage() {
  const admin = await requireAdminSession();
  const [sheet, employeeOptions, omzetPeriod] = await Promise.all([
    getAdminPayrollSummarySheet(),
    listPayrollEmployeeOptions(),
    getPayrollOmzetPeriod(),
  ]);

  return (
    <AdminShell
      title="Summary Payroll"
      description="Input payroll per karyawan, bedakan sales dan non-sales, lalu cek rekap payroll aktif dalam satu halaman."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-summary"
    >
      <AdminPayrollSummaryManager sheet={sheet} employeeOptions={employeeOptions} omzetPeriod={omzetPeriod} />
    </AdminShell>
  );
}
