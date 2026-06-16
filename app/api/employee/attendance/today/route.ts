import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId, getEmployeeTodayAttendance } from "@/lib/hris";
import { jsonNoStore } from "@/lib/api-json";

export const dynamic = "force-dynamic";

// GET /api/employee/attendance/today — status presensi hari ini (mobile + web).
export async function GET() {
  const session = await getCurrentEmployeeSession();
  if (!session) return jsonNoStore({ message: "Unauthorized." }, 401);

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return jsonNoStore({ message: "Data karyawan tidak ditemukan." }, 404);

  const attendance = await getEmployeeTodayAttendance(employee.id);
  return jsonNoStore({ attendance });
}
