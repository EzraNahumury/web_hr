import { redirect } from "next/navigation";

import EmployeeShell from "@/components/EmployeeShell";
import SpvJadwalManager from "@/components/SpvJadwalManager";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import {
  getJadwalForRange,
  isUserJadwalEditor,
  listTokoGudangKaryawan,
} from "@/lib/jadwal-karyawan";
import { getPayrollDateRange } from "@/lib/payroll-admin";
import { canSetSchedule, isJadwalWhitelisted } from "@/lib/scheduler-roles";

export const dynamic = "force-dynamic";

function getDefaultPeriod() {
  const now = new Date();
  const jakarta = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return { year: jakarta.getFullYear(), month: jakarta.getMonth() + 1 };
}

export default async function EmployeeJadwalPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
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

  const params = (await searchParams) ?? {};
  const def = getDefaultPeriod();
  const yearRaw = Number(params.year);
  const monthRaw = Number(params.month);
  const year = Number.isInteger(yearRaw) && yearRaw >= 2024 && yearRaw <= 2100 ? yearRaw : def.year;
  const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : def.month;

  const range = getPayrollDateRange(month, year);
  const [karyawanList, jadwalList] = await Promise.all([
    listTokoGudangKaryawan(),
    getJadwalForRange(range.startSql, range.endSql),
  ]);

  return (
    <EmployeeShell
      title="Setup Jadwal Karyawan"
      description="Atur shift dan hari libur untuk karyawan Toko & Gudang per bulan. Klik tiap cell untuk pilih shift, lalu Simpan."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} - ${employee.jabatan}`}
      currentPath="/employee/jadwal"
      employeeRole={employee.jabatan}
    >
      <SpvJadwalManager
        initialYear={year}
        initialMonth={month}
        karyawanList={karyawanList}
        initialJadwal={jadwalList}
      />
    </EmployeeShell>
  );
}
