import AdminBonusSummaryManager from "@/components/AdminBonusSummaryManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayrollPeriods } from "@/lib/payroll-admin";
import { getBonusSummarySheet } from "@/lib/bonus-summary";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminBonusSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolved = (await searchParams) ?? {};
  const month = parsePositiveInt(resolved.month);
  const year = parsePositiveInt(resolved.year);
  const period = month && year ? { month, year } : undefined;

  const [sheet, periodOptions] = await Promise.all([
    getBonusSummarySheet(period),
    listPayrollPeriods(),
  ]);

  return (
    <AdminShell
      title="Summary Bonus"
      description="Rekap bonus Personal, Team, dan Company per periode. Input omzet (AVA Sportivo / Ayres / Gabungan), lalu nilai syarat & centang distribusi HR. Nominal mengikuti rumus (menyusul)."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/bonus-summary"
    >
      <AdminBonusSummaryManager initialSheet={sheet} periodOptions={periodOptions} />
    </AdminShell>
  );
}
