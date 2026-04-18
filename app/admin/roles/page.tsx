import AdminRolesManager from "@/components/AdminRolesManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listAdmins } from "@/lib/admins";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const admin = await requireAdminSession();
  const rows = await listAdmins();

  return (
    <AdminShell
      title="Role Admin"
      description="Kelola akun admin yang dapat mengakses HR Payroll System."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/roles"
    >
      <AdminRolesManager initialRows={rows} currentAdminId={admin.id} />
    </AdminShell>
  );
}
