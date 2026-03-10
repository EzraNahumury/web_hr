import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  deleteContractDeduction,
  getContractDeductionPlanByEmployeeId,
  updateContractDeduction,
  type ContractDeductionPayload,
} from "@/lib/contract-deductions";

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validatePayload(body: Record<string, unknown>) {
  const employeeId = parsePositiveInt(body.employeeId);
  const nominalDeduction = Number(body.nominalDeduction);

  if (!employeeId || !Number.isFinite(nominalDeduction) || nominalDeduction < 0) {
    return { error: "Karyawan dan nominal potongan wajib valid." };
  }

  const payload: ContractDeductionPayload = {
    employeeId,
    nominalDeduction,
    description: normalizeText(body.description),
  };

  return { payload };
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const params = await context.params;
  const id = parseId(params.id);

  if (!id) {
    return NextResponse.json({ message: "ID potongan kontrak tidak valid." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = validatePayload(body);

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    if (result.payload.employeeId !== id) {
      return NextResponse.json(
        { message: "ID karyawan pada route dan payload harus sama." },
        { status: 400 },
      );
    }

    const current = await getContractDeductionPlanByEmployeeId(id);

    if (!current) {
      return NextResponse.json(
        { message: "Data potongan kontrak tidak ditemukan." },
        { status: 404 },
      );
    }

    const row = await updateContractDeduction(id, result.payload);

    return NextResponse.json({
      message: "Potongan kontrak berhasil diperbarui.",
      row,
    });
  } catch (error) {
    console.error("Update contract deduction error", error);

    return NextResponse.json(
      { message: "Gagal memperbarui potongan kontrak." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const params = await context.params;
  const id = parseId(params.id);

  if (!id) {
    return NextResponse.json({ message: "ID potongan kontrak tidak valid." }, { status: 400 });
  }

  try {
    const current = await getContractDeductionPlanByEmployeeId(id);

    if (!current) {
      return NextResponse.json(
        { message: "Data potongan kontrak tidak ditemukan." },
        { status: 404 },
      );
    }

    const deleted = await deleteContractDeduction(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Data potongan kontrak tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Potongan kontrak berhasil dihapus.",
    });
  } catch (error) {
    console.error("Delete contract deduction error", error);

    return NextResponse.json(
      { message: "Gagal menghapus potongan kontrak." },
      { status: 500 },
    );
  }
}
