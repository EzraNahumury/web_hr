import AdminPayrollSummaryManager from "@/components/AdminPayrollSummaryManager";
import AdminShell from "@/components/AdminShell";
import { isPayrollEditor, requireAdminSession } from "@/lib/auth";
import {
  getPayrollOmzetPeriod,
  listPayrollEmployeeOptions,
  listPayrollPeriods,
  type OmzetGroupConfig,
} from "@/lib/payroll-admin";
import { getAdminPayrollSummarySheet } from "@/lib/payroll-summary";
import { isSalesNasionalRole } from "@/lib/sales-roles";
import { isPenjahit } from "@/lib/penjahit-roles";
import { isFreelanceJabatan } from "@/lib/freelance-roles";

const SOLO_PLACEMENT = "Toko Solo";

const SOLO_OMZET_GROUPS: OmzetGroupConfig[] = [
  {
    key: "Toko Solo",
    label: "Toko Solo",
    units: ["Toko Solo"],
    defaultCustomBonus: true,
  },
];

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminSoloPayrollSummaryPage({
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
    getAdminPayrollSummarySheet(period, { placementFilter: SOLO_PLACEMENT }),
    listPayrollEmployeeOptions({ placementFilter: SOLO_PLACEMENT }),
    getPayrollOmzetPeriod(period, { groups: SOLO_OMZET_GROUPS, includeOtherSaved: false }),
    listPayrollPeriods(),
  ]);

  return (
    <AdminShell
      title="Summary Payroll Solo"
      description="Rekap payroll khusus karyawan penempatan Toko Solo. Input omzet bulanan dimasukkan manual sebagai nominal bonus langsung (tanpa rumus persentase)."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-summary/solo"
    >
      <AdminPayrollSummaryManager
        sheet={sheet}
        employeeOptions={employeeOptions.filter((employee) => {
          const status = (employee.employmentStatus ?? "").trim().toLowerCase();
          return (
            !isSalesNasionalRole(employee.role) &&
            !isPenjahit(employee.subDivision) &&
            !isFreelanceJabatan(employee.role) &&
            status !== "partime" &&
            status !== "freelance"
          );
        })}
        omzetPeriod={omzetPeriod}
        periodOptions={periodOptions}
        basePath="/admin/payroll-summary/solo"
        canEdit={await isPayrollEditor(admin.email)}
      />
    </AdminShell>
  );
}
