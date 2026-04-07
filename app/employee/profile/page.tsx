import EmployeeShell from "@/components/EmployeeShell";
import EmployeeProfileForm from "@/components/EmployeeProfileForm";
import { requireEmployeeSession } from "@/lib/auth";
import { getEmployeeProfileByUserId } from "@/lib/employees";

export default async function EmployeeProfilePage() {
  const session = await requireEmployeeSession();
  const employee = await getEmployeeProfileByUserId(session.userId);

  if (!employee) {
    return <main className="p-10">Data karyawan tidak ditemukan.</main>;
  }

  return (
    <EmployeeShell
      title="Profil Pribadi"
      description="Lengkapi dan kelola data pribadi Anda seperti nama, NIK, tempat lahir, alamat, agama, dan nomor telepon."
      employeeName={employee.name}
      employeeMeta={`${employee.nip || "Belum ada NIP"} • ${employee.role || "Belum ada jabatan"}`}
      currentPath="/employee/profile"
    >
      <EmployeeProfileForm initial={employee} />
    </EmployeeShell>
  );
}
