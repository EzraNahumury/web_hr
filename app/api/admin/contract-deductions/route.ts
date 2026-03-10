import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  insertContractDeduction,
  listContractDeductionEmployees,
  listContractDeductionPlans,
  type ContractDeductionPayload,
} from "@/lib/contract-deductions";

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

export async function GET() {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const [rows, employees] = await Promise.all([
    listContractDeductionPlans(),
    listContractDeductionEmployees(),
  ]);

  return NextResponse.json({ rows, employees });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = validatePayload(body);

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    const row = await insertContractDeduction(result.payload);

    return NextResponse.json(
      {
        message: "Potongan kontrak berhasil ditambahkan.",
        row,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create contract deduction error", error);

    return NextResponse.json(
      { message: "Gagal menambahkan potongan kontrak." },
      { status: 500 },
    );
  }
}
