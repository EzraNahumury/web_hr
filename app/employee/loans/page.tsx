import EmployeeLoansManager from "@/components/EmployeeLoansManager";
import EmployeeShell from "@/components/EmployeeShell";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { listEmployeeLoans } from "@/lib/loans";

function getJakartaTodaySqlDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export default async function EmployeeLoansPage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  const rows = await listEmployeeLoans(employee.id);

  return (
    <EmployeeShell
      title="Pinjaman Karyawan"
      description="Ajukan pinjaman, pantau approval admin, dan lihat jadwal potongan pinjaman yang otomatis terhubung ke payroll summary."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} | ${employee.jabatan}`}
      currentPath="/employee/loans"
    >
      <EmployeeLoansManager
        employeeName={employee.nama}
        initialRows={rows}
        defaultRequestDate={getJakartaTodaySqlDate()}
      />
    </EmployeeShell>
  );
}
