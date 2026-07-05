import SpvShell from "@/components/SpvShell";
import AttendanceApprovalManager from "@/components/AttendanceApprovalManager";
import { requireSpvSession } from "@/lib/auth";
import { listAttendanceApprovalsForApprover } from "@/lib/attendance-approval";

export const dynamic = "force-dynamic";

export default async function SpvAttendanceApprovalsPage() {
  const spv = await requireSpvSession();
  const rows = await listAttendanceApprovalsForApprover(spv.id);

  return (
    <SpvShell
      title="Approval Absensi"
      description="Review pengajuan telat / pulang awal dari karyawan yang ditujukan ke Anda, lalu approve atau reject."
      spvName={spv.fullName}
      spvEmail={spv.email}
      currentPath="/spv/attendance-approvals"
    >
      <AttendanceApprovalManager rows={rows} endpoint="/api/spv/attendance-approvals" />
    </SpvShell>
  );
}
