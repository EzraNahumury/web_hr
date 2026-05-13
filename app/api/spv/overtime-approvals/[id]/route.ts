import { NextRequest, NextResponse } from "next/server";

import { getCurrentSpvSession } from "@/lib/auth";
import { processApprovalForAssignedApprover } from "@/lib/overtime-approval";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getCurrentSpvSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  return processApprovalForAssignedApprover(request, Number(id), session.id);
}
