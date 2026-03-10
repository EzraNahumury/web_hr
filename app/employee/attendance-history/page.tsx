import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeAttendanceHistory, getEmployeeByUserId } from "@/lib/hris";

export default async function EmployeeAttendanceHistoryPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  const rows = await getEmployeeAttendanceHistory(employee.id);

  return (
    <EmployeeShell
      title="Riwayat Absensi"
      description="Riwayat check-in, check-out, dan status absensi dibaca dari tabel absensi."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/attendance-history"
    >
      <div className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Jam Masuk</th>
              <th className="px-6 py-4">Jam Pulang</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Terlambat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.tanggal}-${row.jam_masuk}`} className="border-b border-[#f1e5de]">
                <td className="px-6 py-4">{row.tanggal}</td>
                <td className="px-6 py-4">{row.jam_masuk || "-"}</td>
                <td className="px-6 py-4">{row.jam_pulang || "-"}</td>
                <td className="px-6 py-4">{row.status_absensi}</td>
                <td className="px-6 py-4">{row.terlambat_menit ? `${row.terlambat_menit} menit` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EmployeeShell>
  );
}
