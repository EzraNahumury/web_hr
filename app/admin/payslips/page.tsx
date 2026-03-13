import AdminPayslipBuilder from "@/components/AdminPayslipBuilder";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayrollPeriods } from "@/lib/payroll-admin";
import { getAdminPayrollSummarySheet } from "@/lib/payroll-summary";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminPayslipsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const adminPromise = requireAdminSession();
  const periodOptions = await listPayrollPeriods();
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedMonth = parsePositiveInt(resolvedSearchParams.month);
  const requestedYear = parsePositiveInt(resolvedSearchParams.year);
  const selectedEmployeeId = parsePositiveInt(resolvedSearchParams.employee);

  const loadSheet = async () => {
    if (requestedMonth && requestedYear) {
      return getAdminPayrollSummarySheet({ month: requestedMonth, year: requestedYear });
    }

    for (const option of periodOptions) {
      const sheet = await getAdminPayrollSummarySheet({ month: option.month, year: option.year });
      if (sheet) {
        return sheet;
      }
    }

    return null;
  };

  const [admin, sheet] = await Promise.all([adminPromise, loadSheet()]);

  return (
    <AdminShell
      title="Slip Gaji"
      description="Pilih karyawan untuk menampilkan slip gaji normal atau sales dari hasil hitung payroll aktif."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payslips"
    >
      {sheet ? (
        <AdminPayslipBuilder
          periodLabel={sheet.periodLabel}
          rangeLabel={sheet.rangeLabel}
          rows={sheet.rows}
          selectedEmployeeId={selectedEmployeeId}
        />
      ) : (
        <div className="rounded-[32px] border border-[#ead7ce] bg-white px-6 py-10 text-sm text-[#7a6059]">
          Belum ada payroll yang tersimpan, jadi slip gaji belum bisa dibuat untuk periode yang dipilih.
        </div>
      )}
    </AdminShell>
  );
}
