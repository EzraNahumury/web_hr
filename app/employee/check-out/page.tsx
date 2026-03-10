import EmployeeAttendanceCapture from "@/components/EmployeeAttendanceCapture";
import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeTodayAttendance } from "@/lib/hris";

export default async function EmployeeCheckOutPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const todayAttendance = await getEmployeeTodayAttendance(employee.id);

  return (
    <EmployeeShell
      title="Presensi Pulang"
      description="Saat halaman dibuka, sistem langsung meminta izin lokasi dan kamera depan untuk selfie presensi pulang."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/check-out"
    >
      <EmployeeAttendanceCapture
        mode="check-out"
        employeeName={employee.nama}
        employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
        todayAttendance={todayAttendance}
      />
    </EmployeeShell>
  );
}
