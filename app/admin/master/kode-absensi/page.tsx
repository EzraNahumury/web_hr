import AdminShell from "@/components/AdminShell";
import AdminAttendanceCodes from "@/components/AdminAttendanceCodes";
import { requireAdminSession } from "@/lib/auth";
import {
  ATTENDANCE_STATUS_CATEGORIES,
  ATTENDANCE_STATUS_LABELS,
  listAttendanceCodes,
} from "@/lib/attendance-codes";

export const dynamic = "force-dynamic";

export default async function AdminMasterAttendanceCodePage() {
  const admin = await requireAdminSession();
  const items = await listAttendanceCodes();

  const statusOptions = ATTENDANCE_STATUS_CATEGORIES.map((value) => ({
    value,
    label: ATTENDANCE_STATUS_LABELS[value],
  }));

  return (
    <AdminShell
      title="Master Kode Absensi"
      description="Tambah, ubah, atau hapus kode absensi pada dropdown lembar absensi — setiap kode dipetakan ke kategori payroll agar perhitungan gaji tetap benar."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/master/kode-absensi"
    >
      <AdminAttendanceCodes initialItems={items} statusOptions={statusOptions} />
    </AdminShell>
  );
}
