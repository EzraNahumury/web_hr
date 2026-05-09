import AdminPayslipDistribution from "@/components/AdminPayslipDistribution";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayslipDistribution, listPendingPayrollsForDistribution } from "@/lib/hris";

export default async function AdminPayslipDistributionPage() {
  const admin = await requireAdminSession();
  const [pendingRows, logRows] = await Promise.all([
    listPendingPayrollsForDistribution(),
    listPayslipDistribution(),
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
