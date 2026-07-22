import AdminItemLoansManager from "@/components/AdminItemLoansManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listEmployees } from "@/lib/employees";
import { listItemLoans } from "@/lib/item-loans";

export const dynamic = "force-dynamic";

export default async function AdminItemLoansPage() {
  const admin = await requireAdminSession();
  const [rows, employees] = await Promise.all([listItemLoans(), listEmployees()]);

  const employeeOptions = employees
    .filter((e) => e.dataStatus !== "nonaktif")
    .map((e) => ({ id: e.id, name: e.name, nip: e.nip || "-" }));

  return (
    <AdminShell
      title="Peminjaman Barang"
      description="Catat peminjaman barang/aset perusahaan oleh karyawan. Data juga tampil di Detail Karyawan masing-masing."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/item-loans"
    >
      <AdminItemLoansManager initialRows={rows} employees={employeeOptions} />
    </AdminShell>
  );
}
