import AdminBonusSlipDistribution from "@/components/AdminBonusSlipDistribution";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  listBonusSlipDistribution,
  listPendingBonusSlips,
} from "@/lib/bonus-slip";

const BONUS_LABEL: Record<string, string> = {
  sales: "Sales",
  spv: "SPV",
  manager: "Manager",
  cs: "CS",
  host_live: "Host Live",
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function AdminBonusSlipDistributionPage() {
  const admin = await requireAdminSession();
  const [pendingRows, logRows] = await Promise.all([
    listPendingBonusSlips(),
    listBonusSlipDistribution(),
  ]);

  return (
    <AdminShell
      title="Distribusi Slip Bonus"
      description="Pilih karyawan yang akan menerima slip bonus, lalu klik Distribusi Slip Bonus untuk mengirim ke akun mereka."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/bonus-slip-distribution"
    >
      <AdminBonusSlipDistribution
        pending={pendingRows.map((row) => ({
          payrollBonusId: row.payroll_bonus_id,
          employeeId: row.karyawan_id,
          name: row.nama,
          role: row.jabatan,
          division: row.divisi,
          periodLabel: row.periode_label,
          bonusTypeLabel: BONUS_LABEL[row.bonus_type] ?? row.bonus_type,
          amount: toNumber(row.nominal_bonus),
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
