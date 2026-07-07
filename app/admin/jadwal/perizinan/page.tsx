import Link from "next/link";

import AdminShell from "@/components/AdminShell";
import JadwalAksesManager from "@/components/JadwalAksesManager";
import { requireAdminSession } from "@/lib/auth";
import { listJadwalEditors, listKaryawanForAccess } from "@/lib/jadwal-karyawan";

export const dynamic = "force-dynamic";

export default async function AdminJadwalPerizinanPage() {
  const admin = await requireAdminSession();
  const [allKaryawan, granted] = await Promise.all([listKaryawanForAccess(), listJadwalEditors()]);

  return (
    <AdminShell
      title="Perizinan Akses Set Jadwal"
      description="Beri akses karyawan tertentu agar bisa mengisi & update Bagan / Master Set Jadwal dari akunnya."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/jadwal/perizinan"
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin/jadwal" className="inline-flex items-center rounded-full border border-[#ead7ce] bg-white px-4 py-2 text-sm font-semibold text-[#8f1d22] transition hover:bg-[#fff2ec]">
          Bagan Set Jadwal
        </Link>
        <Link href="/admin/jadwal/master" className="inline-flex items-center rounded-full border border-[#ead7ce] bg-white px-4 py-2 text-sm font-semibold text-[#8f1d22] transition hover:bg-[#fff2ec]">
          Master Set Jadwal
        </Link>
        <span className="inline-flex items-center rounded-full bg-[#8f1d22] px-4 py-2 text-sm font-semibold text-white">Perizinan Akses</span>
      </div>
      <JadwalAksesManager allKaryawan={allKaryawan} initialGranted={granted} />
    </AdminShell>
  );
}
