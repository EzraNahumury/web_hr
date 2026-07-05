import Link from "next/link";

import AdminShell from "@/components/AdminShell";
import AttendanceApprovalManager from "@/components/AttendanceApprovalManager";
import { requireAdminSession } from "@/lib/auth";
import { listAttendanceApprovalsForAdmin } from "@/lib/attendance-approval";

export const dynamic = "force-dynamic";

export default async function AdminAttendanceApprovalsPage() {
  const admin = await requireAdminSession();
  const rows = await listAttendanceApprovalsForAdmin();

  return (
    <AdminShell
      title="Approval Absensi"
      description="Approve / reject pengajuan telat & pulang awal yang ditujukan ke Admin."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/attendance-approvals"
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-[#8f1d22] px-4 py-2 text-sm font-semibold text-white">
          Approval Admin
        </span>
        <Link
          href="/admin/attendance-approvals/history"
          className="inline-flex items-center rounded-full border border-[#ead7ce] bg-white px-4 py-2 text-sm font-semibold text-[#8f1d22] transition hover:bg-[#fff2ec]"
        >
          History Approval
        </Link>
      </div>
      <AttendanceApprovalManager rows={rows} endpoint="/api/admin/attendance-approvals" />
    </AdminShell>
  );
}
