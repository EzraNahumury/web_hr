import AdminShell from "@/components/AdminShell";
import AdminOvertimeApprovals from "@/components/AdminOvertimeApprovals";
import { isOvertimeApprover, requireAdminSession } from "@/lib/auth";
import { listOvertimeRecords } from "@/lib/hris";

export default async function AdminOvertimePage() {
  const admin = await requireAdminSession();
  const rows = await listOvertimeRecords();
  const canApprove = isOvertimeApprover(admin.email);

  return (
    <AdminShell
      title="Manajemen Lembur"
      description={
        canApprove
          ? "Admin melihat semua pengajuan lembur dari karyawan lalu memberi keputusan approve atau reject."
          : "Anda dapat melihat pengajuan lembur. Approve/reject hanya bisa dilakukan oleh admin yang berwenang."
      }
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/overtime"
    >
      <AdminOvertimeApprovals rows={rows} canApprove={canApprove} />
    </AdminShell>
  );
}
