import AdminShell from "@/components/AdminShell";
import AdminShiftGroups from "@/components/AdminShiftGroups";
import AdminShiftDefs from "@/components/AdminShiftDefs";
import { requireAdminSession } from "@/lib/auth";
import { EMPLOYEE_PLACEMENTS } from "@/lib/employees";
import { getMasterLookupOptions } from "@/lib/master-lookup";
import { getShiftGroupRoster, listShiftGroups } from "@/lib/shift-groups";
import { getSelectableShifts, listShiftDefs } from "@/lib/shift-defs";

export const dynamic = "force-dynamic";

export default async function AdminMasterSetJadwalPage() {
  const admin = await requireAdminSession();
  const [groups, roster, master, selectableShifts, shiftDefs] = await Promise.all([
    listShiftGroups(),
    getShiftGroupRoster(),
    getMasterLookupOptions(),
    getSelectableShifts(),
    listShiftDefs(),
  ]);

  return (
    <AdminShell
      title="Master Set Jadwal (Grup Shift)"
      description="Atur dropdown shift per grup karyawan (jabatan/departemen/penempatan/custom) & buat shift baru dengan jam sendiri — tanpa mengubah kode. Karyawan yang tampil = yang dicentang 'Ikut Set Jadwal' di Data Karyawan."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/master/set-jadwal"
    >
      <div className="space-y-6">
        <AdminShiftDefs
          initialShifts={shiftDefs.map((d) => ({
            code: d.code,
            label: d.label,
            startMin: d.startMin,
            checkoutStartMin: d.checkoutStartMin,
            toleranceMin: d.toleranceMin,
            isLibur: d.isLibur,
            isSelectable: d.isSelectable,
            isSystem: d.isSystem,
          }))}
        />
        <AdminShiftGroups
          initialGroups={groups}
          roster={roster}
          selectableShifts={selectableShifts}
          jabatanOptions={master.roles.map((o) => o.value)}
          departemenOptions={master.departments.map((o) => o.value)}
          penempatanOptions={[...EMPLOYEE_PLACEMENTS]}
        />
      </div>
    </AdminShell>
  );
}
