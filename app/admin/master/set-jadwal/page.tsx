import AdminShell from "@/components/AdminShell";
import AdminShiftGroups from "@/components/AdminShiftGroups";
import { requireAdminSession } from "@/lib/auth";
import { EMPLOYEE_PLACEMENTS } from "@/lib/employees";
import { getMasterLookupOptions } from "@/lib/master-lookup";
import { getShiftGroupRoster, listShiftGroups, SELECTABLE_SHIFTS } from "@/lib/shift-groups";

export const dynamic = "force-dynamic";

export default async function AdminMasterSetJadwalPage() {
  const admin = await requireAdminSession();
  const [groups, roster, master] = await Promise.all([
    listShiftGroups(),
    getShiftGroupRoster(),
    getMasterLookupOptions(),
  ]);

  return (
    <AdminShell
      title="Master Set Jadwal (Grup Shift)"
      description="Atur dropdown shift per grup karyawan (berdasarkan jabatan, departemen, penempatan, atau custom) tanpa mengubah kode. Karyawan yang tampil = yang dicentang 'Ikut Set Jadwal' di Data Karyawan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/master/set-jadwal"
    >
      <AdminShiftGroups
        initialGroups={groups}
        roster={roster}
        selectableShifts={SELECTABLE_SHIFTS}
        jabatanOptions={master.roles.map((o) => o.value)}
        departemenOptions={master.departments.map((o) => o.value)}
        penempatanOptions={[...EMPLOYEE_PLACEMENTS]}
      />
    </AdminShell>
  );
}
