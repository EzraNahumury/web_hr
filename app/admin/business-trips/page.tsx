import AdminBusinessTripApprovals from "@/components/AdminBusinessTripApprovals";
import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listAdminBusinessTrips } from "@/lib/business-trips";

export default async function AdminBusinessTripsPage() {
  const admin = await requireAdminSession();
  const rows = await listAdminBusinessTrips();

  return (
    <AdminShell
      title="Approval Perjalanan Dinas"
      description="Review pengajuan perjalanan dinas dari karyawan, lalu approve atau reject. Jika approve, absensi otomatis hadir dari tanggal mulai sampai tanggal selesai."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/business-trips"
    >
      <AdminBusinessTripApprovals initialRows={rows} />
    </AdminShell>
  );
}
