import AdminShell from "@/components/AdminShell";
import HrAgentChat from "@/components/HrAgentChat";
import { requireAdminSession } from "@/lib/auth";

export default async function AdminHrAgentPage() {
  const admin = await requireAdminSession();

  return (
    <AdminShell
      title="HR Agent"
      description="Asisten AI yang menjawab pertanyaan berdasarkan data karyawan, absensi, lembur, pinjaman, dan payroll di database."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/hr-agent"
    >
      <HrAgentChat />
    </AdminShell>
  );
}
