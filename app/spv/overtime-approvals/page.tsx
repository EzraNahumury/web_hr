import SpvShell from "@/components/SpvShell";
import OvertimeApproverManager from "@/components/OvertimeApproverManager";
import { requireSpvSession } from "@/lib/auth";
import { listOvertimeForApprover } from "@/lib/overtime";

export const dynamic = "force-dynamic";

export default async function SpvOvertimeApprovalsPage() {
  const spv = await requireSpvSession();
  const rows = await listOvertimeForApprover(spv.id);

  return (
    <SpvShell
      title="Approval Lembur"
      description="Review pengajuan lembur dari karyawan yang ditujukan ke Anda lalu approve atau reject."
      spvName={spv.fullName}
      spvEmail={spv.email}
      currentPath="/spv/overtime-approvals"
    >
      <OvertimeApproverManager rows={rows} endpoint="/api/spv/overtime-approvals" />
    </SpvShell>
  );
}
