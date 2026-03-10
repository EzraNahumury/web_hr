import AdminContractDeductionsManager from "@/components/AdminContractDeductionsManager";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import {
  listContractDeductionEmployees,
  listContractDeductionPlans,
} from "@/lib/contract-deductions";

export default async function AdminContractDeductionsPage() {
  const admin = await requireAdminSession();
  const [rows, employees] = await Promise.all([
    listContractDeductionPlans(),
    listContractDeductionEmployees(),
  ]);

  return (
    <AdminShell
      title="Potongan Kontrak"
      description="Potongan kontrak berlaku Rp200.000 per bulan untuk 5 bulan pertama sejak tanggal kontrak karyawan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/contract-deductions"
    >
      <AdminContractDeductionsManager
        initialRows={rows}
        employeeOptions={employees}
      />
    </AdminShell>
  );
}
