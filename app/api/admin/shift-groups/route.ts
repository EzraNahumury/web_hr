import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  createShiftGroup,
  deleteShiftGroup,
  getMembershipConflicts,
  isShiftTargetType,
  listShiftGroups,
  updateShiftGroup,
  type ShiftTargetType,
} from "@/lib/shift-groups";

export const dynamic = "force-dynamic";

type GroupBody = {
  name?: unknown;
  targetType?: unknown;
  targetValue?: unknown;
  shiftCodes?: unknown;
  memberIds?: unknown;
};

function parseGroup(body: GroupBody) {
  const name = typeof body.name === "string" ? body.name : "";
  const targetType = isShiftTargetType(body.targetType) ? (body.targetType as ShiftTargetType) : null;
  const targetValue = typeof body.targetValue === "string" ? body.targetValue : null;
  const shiftCodes = Array.isArray(body.shiftCodes)
    ? body.shiftCodes.filter((c): c is string => typeof c === "string")
    : [];
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (!targetType) throw new Error("Tipe target tidak valid.");
  return { name, targetType, targetValue, shiftCodes, memberIds };
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;

    if (action === "conflicts") {
      const excludeGroupId =
        body.id === null || body.id === undefined ? null : Number(body.id) || null;
      const candidateIds = Array.isArray(body.candidateIds)
        ? body.candidateIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
        : [];
      const conflicts = await getMembershipConflicts(excludeGroupId, candidateIds);
      return NextResponse.json({ conflicts });
    }

    if (action === "create") {
      await createShiftGroup(parseGroup(body as GroupBody));
    } else if (action === "update") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ message: "Grup tidak valid." }, { status: 400 });
      }
      await updateShiftGroup(id, parseGroup(body as GroupBody));
    } else if (action === "delete") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ message: "Grup tidak valid." }, { status: 400 });
      }
      await deleteShiftGroup(id);
    } else {
      return NextResponse.json({ message: "Aksi tidak dikenal." }, { status: 400 });
    }

    const groups = await listShiftGroups();
    return NextResponse.json({ message: "Grup shift berhasil diperbarui.", groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan grup shift.";
    console.error("Shift group error", error);
    const lower = message.toLowerCase();
    const status =
      lower.includes("kosong") ||
      lower.includes("panjang") ||
      lower.includes("tidak valid") ||
      lower.includes("wajib") ||
      lower.includes("minimal") ||
      lower.includes("tidak ditemukan")
        ? 400
        : 500;
    return NextResponse.json({ message }, { status });
  }
}
