import EmployeeBusinessTripManager from "@/components/EmployeeBusinessTripManager";
import EmployeeShell from "@/components/EmployeeShell";
import { getJakartaDate } from "@/lib/attendance";
import { requireEmployeeSession } from "@/lib/auth";
import { listEmployeeBusinessTrips } from "@/lib/business-trips";
import { getEmployeeByUserId } from "@/lib/hris";

export default async function EmployeeBusinessTripsPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const rows = await listEmployeeBusinessTrips(employee.id);

  return (
    <EmployeeShell
      title="Perjalanan Dinas"
      description="Ajukan perjalanan dinas dengan rentang tanggal dan lampiran surat untuk approval admin."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} | ${employee.jabatan}`}
      currentPath="/employee/business-trips"
      employeeRole={employee.jabatan}
    >
      <EmployeeBusinessTripManager initialRows={rows} defaultDate={getJakartaDate()} />
    </EmployeeShell>
  );
}
