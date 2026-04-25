import SpvShell from "@/components/SpvShell";
import SpvJadwalManager from "@/components/SpvJadwalManager";
import { requireSpvSession } from "@/lib/auth";
import {
  getJadwalForMonth,
  listTokoGudangKaryawan,
} from "@/lib/jadwal-karyawan";

export const dynamic = "force-dynamic";

function getDefaultPeriod() {
  const now = new Date();
  const jakarta = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return { year: jakarta.getFullYear(), month: jakarta.getMonth() + 1 };
}

export default async function SpvJadwalPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const spv = await requireSpvSession();
  const params = (await searchParams) ?? {};

  const def = getDefaultPeriod();
  const yearRaw = Number(params.year);
  const monthRaw = Number(params.month);
  const year = Number.isInteger(yearRaw) && yearRaw >= 2024 && yearRaw <= 2100 ? yearRaw : def.year;
  const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : def.month;

  const [karyawanList, jadwalList] = await Promise.all([
    listTokoGudangKaryawan(),
    getJadwalForMonth(year, month),
  ]);

  return (
    <SpvShell
      title="Setup Jadwal Karyawan"
      description="Atur shift dan hari libur untuk karyawan Toko & Gudang per bulan. Klik tiap cell untuk pilih shift, lalu Simpan."
      spvName={spv.fullName}
      spvEmail={spv.email}
    >
      <SpvJadwalManager
        initialYear={year}
        initialMonth={month}
        karyawanList={karyawanList}
        initialJadwal={jadwalList}
      />
    </SpvShell>
  );
}
