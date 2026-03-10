import EmployeeShell from "@/components/EmployeeShell";
import { getEmployeeByEmail } from "@/lib/hris";

export default async function EmployeeCheckOutPage() {
  const employee = await getEmployeeByEmail("rina.saputri@company.local");
  if (!employee) return <main className="p-10">Data karyawan tidak ditemukan.</main>;

  return (
    <EmployeeShell
      title="Presensi Pulang"
      description="Halaman checkout sudah memakai data karyawan dari database. Tahap berikutnya tinggal sambungkan submit checkout ke tabel absensi."
      employeeName={employee.nama}
      employeeMeta={`${employee.no_karyawan} • ${employee.jabatan}`}
      currentPath="/employee/check-out"
    >
      <div className="rounded-[32px] border border-[#ead7ce] bg-white p-6">
        <p className="text-sm text-[#7a6059]">Nama: {employee.nama}</p>
        <p className="mt-2 text-sm text-[#7a6059]">NIP: {employee.no_karyawan}</p>
        <button className="mt-6 rounded-2xl bg-[#8f1d22] px-5 py-3 text-sm font-semibold text-white">
          Proses Checkout
        </button>
      </div>
    </EmployeeShell>
  );
}
