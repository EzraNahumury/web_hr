import { getApprovalJabatanSet } from "@/lib/master-lookup";
import { canSetSchedule } from "@/lib/scheduler-roles";

// Boleh approve lembur & absensi: SPV/Manager (canSetSchedule) ATAU jabatan yang ditandai
// "bisa approve" di Master Jabatan (mis. Leader). Dipakai di route processing approval,
// halaman daftar approval, dan menu karyawan.
export async function canApproveRequests(role: string | null | undefined): Promise<boolean> {
  if (canSetSchedule(role)) return true;
  const set = await getApprovalJabatanSet();
  return set.has((role ?? "").trim().toLowerCase());
}
