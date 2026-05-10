import AdminBonusSlipBuilder from "@/components/AdminBonusSlipBuilder";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listBonusSlipsForPeriod } from "@/lib/bonus-slip";
import { listPayrollBonusPeriods } from "@/lib/payroll-bonus";
import { getActivePayrollPeriod, formatPayrollPeriodLabel } from "@/lib/payroll-admin";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminBonusSlipsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const adminPromise = requireAdminSession();
  const periodOptions = await listPayrollBonusPeriods();
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedMonth = parsePositiveInt(resolvedSearchParams.month);
  const requestedYear = parsePositiveInt(resolvedSearchParams.year);
  const selectedEmployeeId = parsePositiveInt(resolvedSearchParams.employee);

  const loadRows = async () => {
    if (requestedMonth && requestedYear) {
      const rows = await listBonusSlipsForPeriod(requestedMonth, requestedYear);
      return {
        month: requestedMonth,
        year: requestedYear,
        label: formatPayrollPeriodLabel(requestedMonth, requestedYear),
        rows,
      };
    }

    for (const option of periodOptions) {
      const rows = await listBonusSlipsForPeriod(option.month, option.year);
      if (rows.length > 0) {
        return { month: option.month, year: option.year, label: option.label, rows };
      }
    }

    const active = getActivePayrollPeriod();
    return {
      month: active.month,
      year: active.year,
      label: formatPayrollPeriodLabel(active.month, active.year),
      rows: [],
    };
  };

  const [admin, dataset] = await Promise.all([adminPromise, loadRows()]);

  return (
    <AdminShell
      title="Slip Bonus"
      description="Pilih karyawan untuk menampilkan slip bonus berdasarkan data payroll bonus aktif."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/bonus-slips"
    >
      <AdminBonusSlipBuilder
        periodLabel={dataset.label}
        rows={dataset.rows}
        selectedEmployeeId={selectedEmployeeId}
      />
    </AdminShell>
  );
}
