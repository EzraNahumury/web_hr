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

  let sheet;
  try {
    sheet = await getFreelanceSheet({ month, year });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AdminPayrollFreelancePage] getFreelanceSheet error:", err);
    return (
      <AdminShell
        title="Summary Payroll Freelance"
        description=""
        adminName={admin.fullName}
        adminEmail={admin.email}
        currentPath="/admin/payroll-freelance"
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-700">Terjadi kesalahan saat memuat data.</p>
          <p className="mt-1 text-sm text-red-600 font-mono">{msg}</p>
          <p className="mt-2 text-xs text-red-500">Cek server log untuk detail lengkap.</p>
        </div>
      </AdminShell>
    );
  }

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
