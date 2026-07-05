import EmployeeAttendanceCapture from "@/components/EmployeeAttendanceCapture";
import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeTodayAttendance } from "@/lib/hris";
import { listEligibleApprovers } from "@/lib/overtime";

export default async function EmployeeCheckInPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const todayAttendance = await getEmployeeTodayAttendance(employee.id);
  // Setengah hari dihapus per 5 Juli 2026 -> tidak ada opsi setengah hari lagi.
  // Approval telat: daftar atasan tujuan (alur sama seperti lembur).
  const approvers = (await listEligibleApprovers(employee.jabatan)).map((a) => ({
    userId: a.userId,
    name: a.name,
    role: a.role,
  }));

  return (
    <EmployeeShell
      title="Presensi Masuk"
      description="Saat halaman dibuka, sistem langsung meminta izin lokasi dan kamera depan untuk selfie presensi masuk."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/check-in"
      employeeRole={employee.jabatan}
    >
      <EmployeeAttendanceCapture
        mode="check-in"
        employeeName={employee.nama}
        employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
        todayAttendance={todayAttendance}
        allowHalfDay={false}
        approvers={approvers}
      />
    </EmployeeShell>
  );
}
