import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  formatKpiPeriodLabel,
  getDefaultKpiPeriod,
  getKpiSalesRetailHariKerja,
  getKpiSalesRetailInputs,
} from "@/lib/kpi-sales-retail";
import { getLogistikEmployees, LOGISTIK_SPV_KPI } from "@/lib/kpi-logistik";
import AdminKpiSalesRetail from "@/components/AdminKpiSalesRetail";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminKpiLogistikPage({
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

  const employees = await getLogistikEmployees();
  const selectedEmployee =
    (empParam ? employees.find((e) => e.id === empParam) : undefined) ?? employees[0] ?? null;

  const [inputs, hariKerja] = await Promise.all([
    selectedEmployee ? getKpiSalesRetailInputs(selectedEmployee.id, month, year) : Promise.resolve({}),
    getKpiSalesRetailHariKerja(month, year),
  ]);

  return (
    <AdminShell
      title="KPI Logistik"
      description="Penilaian KPI Supervisor divisi Logistik. Nama otomatis dari database."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/kpi/logistik"
    >
      <AdminKpiSalesRetail
        month={month}
        year={year}
        periodLabel={formatKpiPeriodLabel(month, year)}
        hariKerja={hariKerja}
        employees={employees}
        selectedEmployee={selectedEmployee}
        template={selectedEmployee ? LOGISTIK_SPV_KPI : []}
        inputs={inputs}
        basePath="/admin/kpi/logistik"
        endpoint="/api/admin/kpi/logistik"
        groupLabelOverride="Supervisor Logistik"
      />
    </AdminShell>
  );
}
