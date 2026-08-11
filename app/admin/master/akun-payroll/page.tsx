import AdminShell from "@/components/AdminShell";
import AdminPayrollEditors from "@/components/AdminPayrollEditors";
import { requireAdminSession } from "@/lib/auth";
import { listAdmins } from "@/lib/admins";
import { getPayrollEditorEmails } from "@/lib/payroll-editors";

export const dynamic = "force-dynamic";

export default async function AdminMasterPayrollEditorsPage() {
  const admin = await requireAdminSession();
  const [admins, editors] = await Promise.all([listAdmins(), getPayrollEditorEmails()]);

  const adminOptions = admins
    .filter((a) => a.role === "admin")
    .map((a) => ({ id: a.id, name: a.name, email: a.email }));

  return (
    <AdminShell
      title="Master Akun Payroll"
      description="Atur akun admin mana saja yang berhak menulis (edit/simpan/hapus) di Summary Payroll — tanpa mengubah kode."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/master/akun-payroll"
    >
      <AdminPayrollEditors admins={adminOptions} initialEditors={editors} />
    </AdminShell>
  );
}
