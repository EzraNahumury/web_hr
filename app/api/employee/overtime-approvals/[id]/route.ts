import { NextRequest, NextResponse } from "next/server";

import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { processApprovalForAssignedApprover } from "@/lib/overtime-approval";
import { canApproveRequests } from "@/lib/approval-access";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getCurrentEmployeeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee || !(await canApproveRequests(employee.jabatan))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  return processApprovalForAssignedApprover(request, Number(id), session.userId);
}
