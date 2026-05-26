import AdminPayslipDistribution from "@/components/AdminPayslipDistribution";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayslipDistribution, listPendingPayrollsForDistribution } from "@/lib/hris";
import { getActivePayrollPeriod } from "@/lib/payroll-admin";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminPayslipDistributionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedMonth = parsePositiveInt(resolvedSearchParams.month);
  const requestedYear = parsePositiveInt(resolvedSearchParams.year);
  const active = getActivePayrollPeriod();
  const month = requestedMonth ?? active.month;
  const year = requestedYear ?? active.year;
  const period = { month, year };

  const [pendingRows, logRows] = await Promise.all([
    listPendingPayrollsForDistribution(period),
    listPayslipDistribution(period),
  ]);

  return (
    <AdminShell
      title="Distribusi Slip Gaji"
      description="Pilih karyawan yang akan menerima slip gaji, lalu klik Distribusi Slip Gaji untuk mengirim ke akun mereka."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payslip-distribution"
    >
      <AdminPayslipDistribution
        periodMonth={month}
        periodYear={year}
        pending={pendingRows.map((row) => ({
          payrollId: row.payroll_id,
          employeeId: row.karyawan_id,
          name: row.nama,
          role: row.jabatan,
          division: row.divisi,
          periodLabel: row.periode_label,
        }))}
        logs={logRows.map((row) => ({
          id: row.id,
          nomorSlip: row.nomor_slip,
          name: row.nama,
          distributedBy: row.didistribusikan_oleh_nama,
          distributedAt: row.tanggal_distribusi,
          slipStatus: row.status_distribusi,
          isRead: row.status_baca === 1,
        }))}
      />
    </AdminShell>
  );
}
