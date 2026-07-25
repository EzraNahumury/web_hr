import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  formatKpiPeriodLabel,
  getDefaultKpiPeriod,
  getKpiRndHariKerja,
  getKpiRndInputs,
  getKpiTemplate,
  getRndEmployees,
} from "@/lib/kpi-rnd";
import AdminKpiRnd from "@/components/AdminKpiRnd";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminKpiRndPage({
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

  const employees = await getRndEmployees();
  const selectedEmployee =
    (empParam ? employees.find((e) => e.id === empParam) : undefined) ?? employees[0] ?? null;

  const template = selectedEmployee ? getKpiTemplate(selectedEmployee.role) : [];
  const [inputs, hariKerja] = await Promise.all([
    selectedEmployee ? getKpiRndInputs(selectedEmployee.id, month, year) : Promise.resolve({}),
    getKpiRndHariKerja(month, year),
  ]);

  return (
    <AdminShell
      title="KPI RnD"
      description="Penilaian KPI tim RnD (Staff & SPV). Nama karyawan otomatis dari database divisi RnD."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/kpi/rnd"
    >
      <AdminKpiRnd
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
