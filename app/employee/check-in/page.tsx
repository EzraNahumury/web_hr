import EmployeeAttendanceCapture from "@/components/EmployeeAttendanceCapture";
import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeTodayAttendance } from "@/lib/hris";

const SCHEDULED_PLACEMENTS = ["Toko", "Gudang", "JNE"];
const SCHEDULED_SUBDIVISIONS = ["media", "hostlive", "advertiser"];

export default async function EmployeeCheckInPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const todayAttendance = await getEmployeeTodayAttendance(employee.id);

  // Karyawan tanpa jadwal shift (penjahit, office, dll) hanya punya pilihan
  // Full Hari atau Setengah Hari. Karyawan ber-jadwal ikut shift dari Set Jadwal.
  const penempatan = (employee.penempatan ?? "").trim();
  const subDivLower = (employee.sub_divisi ?? "").trim().toLowerCase();
  const isScheduled =
    SCHEDULED_PLACEMENTS.includes(penempatan) || SCHEDULED_SUBDIVISIONS.includes(subDivLower);

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
        allowHalfDay={!isScheduled}
      />
    </EmployeeShell>
  );
}
