import AdminReimbursementsManager from "@/components/AdminReimbursementsManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listAdminReimbursements } from "@/lib/reimbursements";

export default async function AdminReimbursementsPage() {
  const admin = await requireAdminSession();
  const rows = await listAdminReimbursements();

  return (
    <AdminShell
      title="Approval Reimburse"
      description="Review nota perjalanan dinas dari karyawan, lalu approve atau reject pengajuan reimburse."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/reimbursements"
    >
      <AdminReimbursementsManager initialRows={rows} />
    </AdminShell>
  );
}
