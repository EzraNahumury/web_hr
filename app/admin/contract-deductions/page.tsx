import AdminContractDeductionsManager from "@/components/AdminContractDeductionsManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listContractDeductionPlans } from "@/lib/contract-deductions";

export default async function AdminContractDeductionsPage() {
  const admin = await requireAdminSession();
  const rows = await listContractDeductionPlans({ activeOnly: true });

  return (
    <AdminShell
      title="Potongan Kontrak"
      description="Rekap potongan kontrak ditampilkan otomatis selama 5 bulan pertama kontrak berdasarkan tanggal pertama masuk karyawan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/contract-deductions"
    >
      <AdminContractDeductionsManager initialRows={rows} />
    </AdminShell>
  );
}
