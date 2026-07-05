import EmployeeAttendanceCapture from "@/components/EmployeeAttendanceCapture";
import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getJakartaDate } from "@/lib/attendance";
import { getEmployeeByUserId, getEmployeeTodayAttendance } from "@/lib/hris";
import { getScheduledShiftForDate } from "@/lib/jadwal-karyawan";
import { listEligibleApprovers } from "@/lib/overtime";

export default async function EmployeeCheckOutPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const todayAttendance = await getEmployeeTodayAttendance(employee.id);
  const scheduledShift = await getScheduledShiftForDate(employee.id, getJakartaDate());
  const isPenjahit = (employee.sub_divisi ?? "").trim().toLowerCase() === "penjahit";
  // Freelance (jam/pengerjaan/harian/custom) dibayar per jam atau per pcs, jadi boleh pulang
  // kapan pun tanpa terkena aturan pulang awal.
  const isFreelance = (employee.jabatan ?? "").trim().toLowerCase() === "freelance";
  // Approval pulang awal: daftar atasan tujuan (alur sama seperti lembur).
  const approvers = (await listEligibleApprovers(employee.jabatan)).map((a) => ({
    userId: a.userId,
    name: a.name,
    role: a.role,
  }));

  return (
    <EmployeeShell
      title="Presensi Pulang"
      description="Saat halaman dibuka, sistem langsung meminta izin lokasi dan kamera depan untuk selfie presensi pulang."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/check-out"
      employeeRole={employee.jabatan}
    >
      <EmployeeAttendanceCapture
        mode="check-out"
        employeeName={employee.nama}
        employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
        todayAttendance={todayAttendance}
        scheduledShift={
          scheduledShift && scheduledShift !== "libur"
            ? scheduledShift
            : isPenjahit
              ? "pagi"
              : null
        }
        skipEarlyLeaveCheck={isFreelance}
        approvers={approvers}
      />
    </EmployeeShell>
  );
}
