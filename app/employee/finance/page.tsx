import { redirect } from "next/navigation";

import EmployeeShell from "@/components/EmployeeShell";
import FinanceRecap from "@/components/FinanceRecap";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { loadFinanceRecapData } from "@/lib/finance-recap";
import { isFinanceDept } from "@/lib/scheduler-roles";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function EmployeeFinancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  // Hanya karyawan departemen Finance (read-only).
  if (!isFinanceDept(employee.departemen)) {
    redirect("/employee");
  }

  const resolvedParams = (await searchParams) ?? {};
  const month = parsePositiveInt(resolvedParams.month);
  const year = parsePositiveInt(resolvedParams.year);
  const periodInput = month && year ? { month, year } : undefined;

  const data = await loadFinanceRecapData(periodInput);

  return (
    <EmployeeShell
      title="Finance"
      description="Rekap keuangan per unit & departemen. Hanya untuk dilihat (read-only)."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/finance"
      employeeRole={employee.jabatan}
      employeeDepartment={employee.departemen}
    >
      <FinanceRecap data={data} editable={false} />
    </EmployeeShell>
  );
}
