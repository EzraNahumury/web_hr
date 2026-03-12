import AdminLoansManager from "@/components/AdminLoansManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listAdminLoans } from "@/lib/loans";

export default async function AdminLoansPage() {
  const admin = await requireAdminSession();
  const rows = await listAdminLoans();

  return (
    <AdminShell
      title="Pinjaman Karyawan"
      description="Admin memproses approval pinjaman, melihat jadwal bulan cicilan otomatis, dan memastikan potongan pinjaman masuk ke payroll sesuai periode cicilan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/loans"
    >
      <AdminLoansManager initialRows={rows} />
    </AdminShell>
  );
}
