import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayrollEmployeeOptions, listPayrollPeriods } from "@/lib/payroll-admin";
import { getPenjahitSheet } from "@/lib/payroll-penjahit";
import AdminPenjahitPayrollSummary from "@/components/AdminPenjahitPayrollSummary";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminPenjahitPayrollSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const month = parsePositiveInt(resolvedSearchParams.month);
  const year = parsePositiveInt(resolvedSearchParams.year);

  const [sheet, periodOptions, employeeOptions] = await Promise.all([
    getPenjahitSheet({ month: month ?? undefined, year: year ?? undefined }),
    listPayrollPeriods(),
    listPayrollEmployeeOptions(),
  ]);

  const penjahitEmployeeOptions = employeeOptions.filter(
    (e) => e.role?.toLowerCase() === "penjahit",
  );

  return (
    <AdminShell
      title="Summary Payroll Penjahit"
      description="Rekap payroll khusus penjahit: mingguan (Tgl 8, 16, 25, 1) dan bulanan (Tgl 25)."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-summary/penjahit"
    >
      <AdminPenjahitPayrollSummary
        sheet={sheet}
        periodOptions={periodOptions}
        employeeOptions={penjahitEmployeeOptions}
      />
    </AdminShell>
  );
}
