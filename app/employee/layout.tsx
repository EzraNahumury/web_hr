import { EmployeeJadwalAccessProvider } from "@/components/EmployeeJadwalAccessContext";
import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { isUserJadwalEditor } from "@/lib/jadwal-karyawan";
import { canSetSchedule, isJadwalWhitelisted } from "@/lib/scheduler-roles";
import { canApproveRequests } from "@/lib/approval-access";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  let canEditJadwal = false;
  let canApprove = false;
  const session = await getCurrentEmployeeSession();
  if (session) {
    const profile = await getEmployeeByUserId(session.userId);
    if (profile) {
      canEditJadwal =
        canSetSchedule(profile.jabatan) ||
        isJadwalWhitelisted(profile.nama) ||
        (await isUserJadwalEditor(session.userId));
      canApprove = await canApproveRequests(profile.jabatan);
    }
  }
  return (
    <EmployeeJadwalAccessProvider value={{ canEditJadwal, canApprove }}>
      {children}
    </EmployeeJadwalAccessProvider>
  );
}
