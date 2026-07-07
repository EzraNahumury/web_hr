import { redirect } from "next/navigation";

import EmployeeShell from "@/components/EmployeeShell";
import JadwalMasterManager from "@/components/JadwalMasterManager";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { getJadwalMasterAll, isUserJadwalEditor, listTokoGudangKaryawan } from "@/lib/jadwal-karyawan";
import { canSetSchedule, isJadwalWhitelisted } from "@/lib/scheduler-roles";

export const dynamic = "force-dynamic";

export default async function EmployeeJadwalMasterPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }
  if (
    !canSetSchedule(employee.jabatan) &&
    !isJadwalWhitelisted(employee.nama) &&
    !(await isUserJadwalEditor(session.userId))
  ) {
    redirect("/employee");
  }

  const [karyawanList, master] = await Promise.all([listTokoGudangKaryawan(), getJadwalMasterAll()]);

  return (
    <EmployeeShell
      title="Master Set Jadwal"
      description="Atur pola jadwal mingguan (Senin–Minggu) sekali. Lalu distribusikan ke Bagan Set Jadwal 1 bulan."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/jadwal/master"
      employeeRole={employee.jabatan}
    >
      <JadwalMasterManager karyawanList={karyawanList} initialMaster={master} />
    </EmployeeShell>
  );
}
