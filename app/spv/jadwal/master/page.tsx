import SpvShell from "@/components/SpvShell";
import JadwalMasterManager from "@/components/JadwalMasterManager";
import { requireSpvSession } from "@/lib/auth";
import { getJadwalMasterAll, listTokoGudangKaryawan } from "@/lib/jadwal-karyawan";
import { getActivePayrollPeriod, getPayrollDateRange } from "@/lib/payroll-admin";

export const dynamic = "force-dynamic";

export default async function SpvJadwalMasterPage() {
  const spv = await requireSpvSession();
  const [karyawanList, master] = await Promise.all([listTokoGudangKaryawan(), getJadwalMasterAll()]);
  const active = getActivePayrollPeriod();
  const period = getPayrollDateRange(active.month, active.year);

  return (
    <SpvShell
      title="Master Set Jadwal"
      description="Atur pola jadwal mingguan (Senin–Minggu) sekali. Lalu distribusikan ke Bagan Set Jadwal 1 bulan."
      spvName={spv.fullName}
      spvEmail={spv.email}
      currentPath="/spv/jadwal/master"
    >
      <JadwalMasterManager
        karyawanList={karyawanList}
        initialMaster={master}
        periodStart={period.startSql}
        periodEnd={period.endSql}
      />
    </SpvShell>
  );
}
