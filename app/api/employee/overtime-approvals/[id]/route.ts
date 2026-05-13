import { NextRequest, NextResponse } from "next/server";

import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { processApprovalForAssignedApprover } from "@/lib/overtime-approval";
import { canSetSchedule } from "@/lib/scheduler-roles";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getCurrentEmployeeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee || !canSetSchedule(employee.jabatan)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  return processApprovalForAssignedApprover(request, Number(id), session.userId);
}
