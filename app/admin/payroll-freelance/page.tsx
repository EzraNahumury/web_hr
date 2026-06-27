import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { getFreelanceSheet } from "@/lib/payroll-freelance";
import AdminPayrollFreelanceManager from "@/components/AdminPayrollFreelanceManager";

export default async function AdminPayrollFreelancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolved = (await searchParams) ?? {};

  const month = typeof resolved.month === "string" ? Number(resolved.month) || undefined : undefined;
  const year = typeof resolved.year === "string" ? Number(resolved.year) || undefined : undefined;

  const sheet = await getFreelanceSheet({ month, year });

  return (
    <AdminShell
      title="Summary Payroll Freelance"
      description="Rekap payroll karyawan freelance berdasarkan tipe: jam, pengerjaan, harian, dan custom pengerjaan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payroll-freelance"
    >
      <AdminPayrollFreelanceManager initialSheet={sheet} />
    </AdminShell>
  );
}
