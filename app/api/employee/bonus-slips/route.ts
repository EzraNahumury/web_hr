import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import {
  getEmployeeBonusSlipForPeriod,
  listEmployeeDistributedBonusPeriods,
} from "@/lib/bonus-slip";
import { jsonNoStore } from "@/lib/api-json";

export const dynamic = "force-dynamic";

// GET /api/employee/bonus-slips
//   - tanpa query    -> { periods: [{month, year}] }
//   - ?month=&year=  -> { slip: BonusSlipDataItem | null } untuk periode tsb
export async function GET(request: Request) {
  const session = await getCurrentEmployeeSession();
  if (!session) return jsonNoStore({ message: "Unauthorized." }, 401);

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return jsonNoStore({ message: "Data karyawan tidak ditemukan." }, 404);

  const { searchParams } = new URL(request.url);
  const monthRaw = searchParams.get("month");
  const yearRaw = searchParams.get("year");

  if (monthRaw && yearRaw) {
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      return jsonNoStore({ message: "Periode tidak valid." }, 400);
    }
    const slip = await getEmployeeBonusSlipForPeriod(employee.id, month, year);
    return jsonNoStore({ slip });
  }

  const periods = await listEmployeeDistributedBonusPeriods(employee.id);
  return jsonNoStore({ periods });
}
