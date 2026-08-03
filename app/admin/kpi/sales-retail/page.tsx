import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  formatKpiPeriodLabel,
  getCustomerServiceEmployees,
  getDefaultKpiPeriod,
  getKpiSalesRetailHariKerja,
  getKpiSalesRetailInputs,
  getSalesRetailTemplate,
} from "@/lib/kpi-sales-retail";
import AdminKpiSalesRetail from "@/components/AdminKpiSalesRetail";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminKpiSalesRetailPage({
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

  const employees = await getCustomerServiceEmployees();
  const selectedEmployee =
    (empParam ? employees.find((e) => e.id === empParam) : undefined) ?? employees[0] ?? null;

  const template = selectedEmployee
    ? getSalesRetailTemplate(selectedEmployee.subDivisi, selectedEmployee.jabatan, selectedEmployee.csType)
    : [];
  const [inputs, hariKerja] = await Promise.all([
    selectedEmployee ? getKpiSalesRetailInputs(selectedEmployee.id, month, year) : Promise.resolve({}),
    getKpiSalesRetailHariKerja(month, year),
  ]);

  return (
    <AdminShell
      title="KPI Sales & Retail"
      description="Penilaian KPI sub divisi Customer Service (CS Selling / Order / Grosir / Marketplace). Nama otomatis dari database."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/kpi/sales-retail"
    >
      <AdminKpiSalesRetail
        month={month}
        year={year}
        periodLabel={formatKpiPeriodLabel(month, year)}
        hariKerja={hariKerja}
        employees={employees}
        selectedEmployee={selectedEmployee}
        template={template}
        inputs={inputs}
      />
    </AdminShell>
  );
}
