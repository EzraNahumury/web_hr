import AdminContractReturnsManager from "@/components/AdminContractReturnsManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listContractReturns } from "@/lib/contract-returns";

export default async function AdminContractReturnsPage() {
  const admin = await requireAdminSession();
  const rows = await listContractReturns();

  return (
    <AdminShell
      title="Pengembalian Kontrak"
      description="Pengembalian deposit potongan kontrak (5 bulan pertama). Karyawan tanpa potongan dianggap sudah lunas dan dapat pengembalian penuh."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/contract-returns"
    >
      <AdminContractReturnsManager initialRows={rows} />
    </AdminShell>
  );
}
