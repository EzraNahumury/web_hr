import SpvShell from "@/components/SpvShell";
import JadwalAksesManager from "@/components/JadwalAksesManager";
import { requireSpvSession } from "@/lib/auth";
import { listJadwalEditors, listKaryawanForAccess } from "@/lib/jadwal-karyawan";

export const dynamic = "force-dynamic";

export default async function SpvJadwalPerizinanPage() {
  const spv = await requireSpvSession();
  const [allKaryawan, granted] = await Promise.all([listKaryawanForAccess(), listJadwalEditors()]);

  return (
    <SpvShell
      title="Perizinan Akses Set Jadwal"
      description="Beri akses karyawan tertentu agar bisa mengisi & update Bagan / Master Set Jadwal dari akunnya."
      spvName={spv.fullName}
      spvEmail={spv.email}
      currentPath="/spv/jadwal/perizinan"
    >
      <JadwalAksesManager allKaryawan={allKaryawan} initialGranted={granted} />
    </SpvShell>
  );
}
