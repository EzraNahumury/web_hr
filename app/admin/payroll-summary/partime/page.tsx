import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayrollEmployeeOptions, listPayrollPeriods } from "@/lib/payroll-admin";
import { getPartimeSheet } from "@/lib/payroll-partime";
import AdminPartimePayrollSummary from "@/components/AdminPartimePayrollSummary";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminPartimePayrollSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const month = parsePositiveInt(resolvedSearchParams.month);
  const year = parsePositiveInt(resolvedSearchParams.year);

  const [sheet, periodOptions, employeeOptions] = await Promise.all([
    getPartimeSheet({ month: month ?? undefined, year: year ?? undefined }),
    listPayrollPeriods(),
    listPayrollEmployeeOptions(),
  ]);

  const partimeEmployeeOptions = employeeOptions.filter(
    (e) => (e.employmentStatus ?? "").toLowerCase() === "partime",
  );

  return (
    <AdminShell
      title="Summary Payroll Partime"
      description="Rekap payroll khusus karyawan Partime: insentif ×25 hari, uang makan ×25 hari, tunjangan/subsidi/BPJS custom, potongan telat Rp5.000/telat."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-summary/partime"
    >
      <AdminPartimePayrollSummary
        sheet={sheet}
        periodOptions={periodOptions}
        employeeOptions={partimeEmployeeOptions}
      />
    </AdminShell>
  );
}
