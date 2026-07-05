import Link from "next/link";

import AdminShell from "@/components/AdminShell";
import AttendanceApprovalManager from "@/components/AttendanceApprovalManager";
import { requireAdminSession } from "@/lib/auth";
import { listAllAttendanceApprovals } from "@/lib/attendance-approval";

export const dynamic = "force-dynamic";

export default async function AdminAttendanceApprovalsHistoryPage() {
  const admin = await requireAdminSession();
  const rows = await listAllAttendanceApprovals();

  return (
    <AdminShell
      title="History Approval Absensi"
      description="Seluruh record approval presensi (telat & pulang awal) dari semua atasan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/attendance-approvals/history"
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/admin/attendance-approvals"
          className="inline-flex items-center rounded-full border border-[#ead7ce] bg-white px-4 py-2 text-sm font-semibold text-[#8f1d22] transition hover:bg-[#fff2ec]"
        >
          Approval Admin
        </Link>
        <span className="inline-flex items-center rounded-full bg-[#8f1d22] px-4 py-2 text-sm font-semibold text-white">
          History Approval
        </span>
      </div>
      <AttendanceApprovalManager rows={rows} title="Belum ada record approval absensi." />
    </AdminShell>
  );
}
