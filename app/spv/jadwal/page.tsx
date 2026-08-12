import SpvShell from "@/components/SpvShell";
import SpvJadwalManager from "@/components/SpvJadwalManager";
import { requireSpvSession } from "@/lib/auth";
import {
  getJadwalForRange,
  listTokoGudangKaryawan,
} from "@/lib/jadwal-karyawan";
import { getActivePayrollPeriod, getPayrollDateRange } from "@/lib/payroll-admin";
import { getShiftOptionsByKaryawan } from "@/lib/shift-groups";

export const dynamic = "force-dynamic";

// Default = periode payroll AKTIF (tgl >25 sudah pindah ke bulan berikut), sama dengan
// periode tujuan distribusi Master Set Jadwal, supaya perubahan master langsung terlihat.
function getDefaultPeriod() {
  return getActivePayrollPeriod();
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

  const range = getPayrollDateRange(month, year);
  const [karyawanList, jadwalList] = await Promise.all([
    listTokoGudangKaryawan(),
    getJadwalForRange(range.startSql, range.endSql),
  ]);
  const optionsByKaryawan = await getShiftOptionsByKaryawan(
    karyawanList.map((k) => ({ id: k.id, penempatan: k.penempatan })),
  );

  return (
    <SpvShell
      title="Setup Jadwal Karyawan"
      description="Atur shift dan hari libur untuk karyawan Toko & Gudang per bulan. Klik tiap cell untuk pilih shift, lalu Simpan."
      spvName={spv.fullName}
      spvEmail={spv.email}
      currentPath="/spv/jadwal"
    >
      <SpvJadwalManager
        initialYear={year}
        initialMonth={month}
        karyawanList={karyawanList}
        initialJadwal={jadwalList}
        optionsByKaryawan={optionsByKaryawan}
      />
    </SpvShell>
  );
}
