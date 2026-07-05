import { NextRequest, NextResponse } from "next/server";

import { getCurrentSpvSession } from "@/lib/auth";
import { processAttendanceApproval } from "@/lib/attendance-approval";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getCurrentSpvSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { statusApproval?: unknown; catatanAtasan?: unknown }
    | null;
  const decision = body?.statusApproval === "approved" ? "approved" : body?.statusApproval === "rejected" ? "rejected" : null;
  if (!decision) {
    return NextResponse.json({ error: "Status approval tidak valid." }, { status: 400 });
  }
  const catatanAtasan =
    typeof body?.catatanAtasan === "string" && body.catatanAtasan.trim() ? body.catatanAtasan.trim() : null;

  const result = await processAttendanceApproval({
    absensiId: Number(id),
    approverUserId: session.id,
    isAdmin: false,
    decision,
    catatanAtasan,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ success: true });
}
