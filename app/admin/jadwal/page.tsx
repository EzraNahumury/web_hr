import AdminShell from "@/components/AdminShell";
import SpvJadwalManager from "@/components/SpvJadwalManager";
import { requireAdminSession } from "@/lib/auth";
import {
  getJadwalForRange,
  listTokoGudangKaryawan,
} from "@/lib/jadwal-karyawan";
import { getPayrollDateRange } from "@/lib/payroll-admin";

export const dynamic = "force-dynamic";

function getDefaultPeriod() {
  const now = new Date();
  const jakarta = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return { year: jakarta.getFullYear(), month: jakarta.getMonth() + 1 };
}

export default async function AdminJadwalPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const admin = await requireAdminSession();
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
    <AdminShell
      title="Setup Jadwal Karyawan"
      description="Atur shift dan hari libur untuk karyawan Toko, Gudang, dan Media per periode payroll."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/jadwal"
    >
      <SpvJadwalManager
        initialYear={year}
        initialMonth={month}
        karyawanList={karyawanList}
        initialJadwal={jadwalList}
      />
    </AdminShell>
  );
}
