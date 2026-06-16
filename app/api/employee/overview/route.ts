import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeOverview } from "@/lib/hris";
import { jsonNoStore } from "@/lib/api-json";

export const dynamic = "force-dynamic";

// GET /api/employee/overview — ringkasan dashboard karyawan.
export async function GET() {
  const session = await getCurrentEmployeeSession();
  if (!session) return jsonNoStore({ message: "Unauthorized." }, 401);

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return jsonNoStore({ message: "Data karyawan tidak ditemukan." }, 404);

  const overview = await getEmployeeOverview(employee.id);
  return jsonNoStore({
    overview,
    employee: {
      id: employee.id,
      nama: employee.nama,
      no_karyawan: employee.no_karyawan,
      jabatan: employee.jabatan,
      divisi: employee.divisi,
      departemen: employee.departemen,
    },
  });
}
