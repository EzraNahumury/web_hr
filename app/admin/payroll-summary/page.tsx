import AdminPayrollSummaryManager from "@/components/AdminPayrollSummaryManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  getPayrollOmzetPeriod,
  listPayrollEmployeeOptions,
  listPayrollPeriods,
} from "@/lib/payroll-admin";
import { getAdminPayrollSummarySheet } from "@/lib/payroll-summary";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminPayrollSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const month = parsePositiveInt(resolvedSearchParams.month);
  const year = parsePositiveInt(resolvedSearchParams.year);
  const period = {
    month: month ?? undefined,
    year: year ?? undefined,
  };

  const [sheet, employeeOptions, omzetPeriod, periodOptions] = await Promise.all([
    getAdminPayrollSummarySheet(period),
    listPayrollEmployeeOptions(),
    getPayrollOmzetPeriod(period),
    listPayrollPeriods(),
  ]);

  return (
    <AdminShell
      title="Summary Payroll"
      description="Input payroll per karyawan, bedakan sales dan non-sales, lalu cek rekap payroll aktif dalam satu halaman."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-summary"
    >
      <AdminPayrollSummaryManager
        sheet={sheet}
        employeeOptions={employeeOptions}
        omzetPeriod={omzetPeriod}
        periodOptions={periodOptions}
      />
    </AdminShell>
  );
}
