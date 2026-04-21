import AdminPayrollSummaryManager from "@/components/AdminPayrollSummaryManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  getPayrollDateRange,
  getPayrollOmzetPeriod,
  listPayrollEmployeeOptions,
  listPayrollPeriods,
} from "@/lib/payroll-admin";
import { getAdminPayrollSummarySheet, type AdminPayrollSummarySheet } from "@/lib/payroll-summary";
import { getApprovedReimbursementRowsForPeriod } from "@/lib/reimbursements";
import { isSalesNasionalRole } from "@/lib/sales-roles";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function filterSalesNasionalSheet(sheet: AdminPayrollSummarySheet | null) {
  if (!sheet) {
    return null;
  }

  const rows = sheet.rows
    .filter((row) => isSalesNasionalRole(row.role))
    .map((row, index) => ({ ...row, number: index + 1 }));

  return {
    ...sheet,
    rows,
    totalNetIncome: rows.reduce((total, row) => total + row.netIncome, 0),
    totalDeduction: rows.reduce(
      (total, row) => total + row.fineDeduction + row.contractCut + row.loanCut,
      0,
    ),
  };
}

export default async function AdminSalesNasionalPayrollSummaryPage({
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
  const salesNasionalEmployeeOptions = employeeOptions.filter((employee) => isSalesNasionalRole(employee.role));
  const range = getPayrollDateRange(omzetPeriod.periodMonth, omzetPeriod.periodYear);
  const reimbursementRows = await getApprovedReimbursementRowsForPeriod(
    salesNasionalEmployeeOptions.map((employee) => employee.employeeId),
    range.startSql,
    range.endSql,
  );
  const automaticTravelReimbursements = Object.fromEntries(
    reimbursementRows.map((row) => [row.employeeId, Number(row.totalReimbursement)]),
  );

  return (
    <AdminShell
      title="Summary Payroll Sales Nasional"
      description="Input dan rekap payroll khusus Sales Nasional: gaji pokok, transport, BPJS, kendaraan, perjalanan dinas reimburse, dan bonus opsional."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-summary/sales-nasional"
    >
      <AdminPayrollSummaryManager
        sheet={filterSalesNasionalSheet(sheet)}
        employeeOptions={salesNasionalEmployeeOptions}
        omzetPeriod={omzetPeriod}
        periodOptions={periodOptions}
        basePath="/admin/payroll-summary/sales-nasional"
        variant="sales-nasional"
        automaticTravelReimbursements={automaticTravelReimbursements}
      />
    </AdminShell>
  );
}
