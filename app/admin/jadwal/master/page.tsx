import AdminShell from "@/components/AdminShell";
import JadwalMasterManager from "@/components/JadwalMasterManager";
import { requireAdminSession } from "@/lib/auth";
import { getJadwalMasterAll, listTokoGudangKaryawan } from "@/lib/jadwal-karyawan";
import { getActivePayrollPeriod, getPayrollDateRange } from "@/lib/payroll-admin";

export const dynamic = "force-dynamic";

export default async function AdminJadwalMasterPage() {
  const admin = await requireAdminSession();
  const [karyawanList, master] = await Promise.all([listTokoGudangKaryawan(), getJadwalMasterAll()]);
  const active = getActivePayrollPeriod();
  const period = getPayrollDateRange(active.month, active.year);

  return (
    <AdminShell
      title="Master Set Jadwal"
      description="Atur pola jadwal mingguan (Senin–Minggu) sekali. Lalu distribusikan ke Bagan Set Jadwal 1 bulan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/jadwal/master"
    >
      <JadwalMasterManager
        karyawanList={karyawanList}
        initialMaster={master}
        periodStart={period.startSql}
        periodEnd={period.endSql}
      />
    </AdminShell>
  );
}
