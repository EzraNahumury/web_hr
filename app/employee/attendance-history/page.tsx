import EmployeeShell from "@/components/EmployeeShell";
import EmployeeAttendancePeriodPicker from "@/components/EmployeeAttendancePeriodPicker";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeAttendanceHistory, getEmployeeByUserId } from "@/lib/hris";
import {
  getActivePayrollPeriod,
  getPayrollDateRange,
  formatPayrollPeriodLabel,
} from "@/lib/payroll-admin";

function parsePositiveInt(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function EmployeeAttendanceHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return <main className="p-10">Data karyawan tidak ditemukan.</main>;

  const resolved = (await searchParams) ?? {};
  const active = getActivePayrollPeriod();
  const month = parsePositiveInt(resolved.month) ?? active.month;
  const year = parsePositiveInt(resolved.year) ?? active.year;
  const range = getPayrollDateRange(month, year);
  const monthValue = `${year}-${String(month).padStart(2, "0")}`;
  const periodLabel = formatPayrollPeriodLabel(month, year);

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
  const rangeLabel = `${fmt(range.start)} – ${fmt(range.end)}`;

  const rows = await getEmployeeAttendanceHistory(employee.id, range);

  return (
    <EmployeeShell
      title="Riwayat Absensi"
      description="Riwayat check-in, check-out, dan status absensi per periode payroll (26 bulan sebelumnya s/d 25 bulan terpilih)."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/attendance-history"
      employeeRole={employee.jabatan}
      employeeDepartment={employee.departemen}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#241716]">Periode {periodLabel}</p>
          <p className="text-xs text-[#9e7467]">{rangeLabel}</p>
        </div>
        <EmployeeAttendancePeriodPicker value={monthValue} />
      </div>

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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#9e7467]">
                  Belum ada absensi pada periode ini.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.tanggal}-${row.jam_masuk}`} className="border-b border-[#f1e5de]">
                  <td className="px-6 py-4">{row.tanggal}</td>
                  <td className="px-6 py-4">{row.jam_masuk || "-"}</td>
                  <td className="px-6 py-4">{row.jam_pulang || "-"}</td>
                  <td className="px-6 py-4">{row.status_absensi}</td>
                  <td className="px-6 py-4">{row.terlambat_menit ? `${row.terlambat_menit} menit` : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </EmployeeShell>
  );
}
