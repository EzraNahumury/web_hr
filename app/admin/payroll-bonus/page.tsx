import AdminPayrollBonusManager from "@/components/AdminPayrollBonusManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  listPayrollBonusEmployeeOptions,
  listPayrollBonusPeriods,
  listPayrollBonusSheet,
} from "@/lib/payroll-bonus";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminPayrollBonusPage({
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

  const [sheet, employeeOptions, periodOptions] = await Promise.all([
    listPayrollBonusSheet(period),
    listPayrollBonusEmployeeOptions(),
    listPayrollBonusPeriods(),
  ]);

  return (
    <AdminShell
      title="Payroll Bonus"
      description="Kelola payroll bonus untuk Sales, SPV, Manager, CS, dan Host Live. Data bonus ini terpisah dari payroll utama dan tidak masuk perhitungan finance."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-bonus"
    >
      <AdminPayrollBonusManager
        sheet={sheet}
        employeeOptions={employeeOptions}
        periodOptions={periodOptions}
      />
    </AdminShell>
  );
}
