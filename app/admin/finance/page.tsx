import AdminShell from "@/components/AdminShell";
import FinanceRecap from "@/components/FinanceRecap";
import { requireAdminSession } from "@/lib/auth";
import { loadFinanceRecapData } from "@/lib/finance-recap";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolvedParams = (await searchParams) ?? {};
  const requestedMonth = parsePositiveInt(resolvedParams.month);
  const requestedYear = parsePositiveInt(resolvedParams.year);
  const periodInput =
    requestedMonth && requestedYear ? { month: requestedMonth, year: requestedYear } : undefined;

  const data = await loadFinanceRecapData(periodInput);
  const periodLabel = data.activePeriod
    ? `${MONTHS_ID[data.activePeriod.month - 1]} ${data.activePeriod.year}`
    : null;

  return (
    <AdminShell
      title="Perhitungan untuk Finance"
      description={
        periodLabel
          ? `Pembagian rekapan per unit dan departemen untuk periode ${periodLabel}.`
          : "Pembagian rekapan per unit dan departemen dari tabel payroll."
      }
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/finance"
    >
      <FinanceRecap data={data} editable />
    </AdminShell>
  );
}
