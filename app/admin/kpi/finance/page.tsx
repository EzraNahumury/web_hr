import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  FINANCE_KPI,
  formatKpiPeriodLabel,
  getDefaultKpiPeriod,
  getFinanceStaffEmployees,
  getKpiFinanceHariKerja,
  getKpiFinanceInputs,
  getKpiFinanceOmzet,
} from "@/lib/kpi-finance";
import AdminKpiFinance from "@/components/AdminKpiFinance";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminKpiFinancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolved = (await searchParams) ?? {};

  const def = getDefaultKpiPeriod();
  const month = parsePositiveInt(resolved.month) ?? def.month;
  const year = parsePositiveInt(resolved.year) ?? def.year;
  const empParam = parsePositiveInt(resolved.emp);

  const employees = await getFinanceStaffEmployees();
  const selectedEmployee =
    (empParam ? employees.find((e) => e.id === empParam) : undefined) ?? employees[0] ?? null;

  const [inputs, hariKerja, omzet] = await Promise.all([
    selectedEmployee ? getKpiFinanceInputs(selectedEmployee.id, month, year) : Promise.resolve({}),
    getKpiFinanceHariKerja(month, year),
    selectedEmployee
      ? getKpiFinanceOmzet(selectedEmployee.placementKey, month, year)
      : Promise.resolve({ target: 0, realisasi: 0 }),
  ]);

  return (
    <AdminShell
      title="KPI Finance"
      description="Penilaian KPI Staff departemen Finance (AYRES & Toko). Nama otomatis dari database."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/kpi/finance"
    >
      <AdminKpiFinance
        month={month}
        year={year}
        periodLabel={formatKpiPeriodLabel(month, year)}
        hariKerja={hariKerja}
        employees={employees}
        selectedEmployee={selectedEmployee}
        template={FINANCE_KPI}
        inputs={inputs}
        omzet={omzet}
      />
    </AdminShell>
  );
}
