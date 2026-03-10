import AdminShell from "@/components/AdminShell";
import AdminOvertimeApprovals from "@/components/AdminOvertimeApprovals";
import { requireAdminSession } from "@/lib/auth";
import { listOvertimeRecords } from "@/lib/hris";

export default async function AdminOvertimePage() {
  const admin = await requireAdminSession();
  const rows = await listOvertimeRecords();

  return (
    <AdminShell
      title="Manajemen Lembur"
      description="Admin melihat semua pengajuan lembur dari karyawan lalu memberi keputusan approve atau reject."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/overtime"
    >
      <AdminOvertimeApprovals rows={rows} />
    </AdminShell>
  );
}
