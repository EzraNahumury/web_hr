import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeAttendanceHistory, getEmployeeByUserId } from "@/lib/hris";
import { jsonNoStore } from "@/lib/api-json";

export const dynamic = "force-dynamic";

// GET /api/employee/attendance/history — riwayat absensi karyawan (200 terbaru).
export async function GET() {
  const session = await getCurrentEmployeeSession();
  if (!session) return jsonNoStore({ message: "Unauthorized." }, 401);

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return jsonNoStore({ message: "Data karyawan tidak ditemukan." }, 404);

  const rows = await getEmployeeAttendanceHistory(employee.id);
  return jsonNoStore({ rows: rows.slice(0, 200) });
}
