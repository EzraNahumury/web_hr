import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import {
  EmployeePayload,
  insertEmployee,
  listEmployees,
  getEmployeeLookups,
  getEmployeeStats,
} from "@/lib/employees";

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validatePayload(body: Record<string, unknown>) {
  const nip = normalizeText(body.nip);
  const name = normalizeText(body.name);
  const email = normalizeText(body.email)?.toLowerCase() ?? null;
  const password = normalizeText(body.password);
  const role = normalizeText(body.role);
  const division = normalizeText(body.division);
  const department = normalizeText(body.department);
  const workStatus = body.workStatus;

  if (!nip || !name || !email || !password || !role || !division || !department) {
    return {
      error:
        "Nama, NIP, email, password, jabatan, divisi, dan departemen wajib diisi.",
    };
  }

  if (!["tetap", "kontrak", "freelance", "magang", "resign"].includes(String(workStatus))) {
    return { error: "Status kerja tidak valid." };
  }

  const payload: EmployeePayload = {
    name,
    nip,
    email,
    password,
    role,
    division,
    department,
    recapGroup: normalizeText(body.recapGroup),
    bank: "BCA",
    accountNumber: normalizeText(body.accountNumber),
    workStatus: workStatus as EmployeePayload["workStatus"],
    contractDate: normalizeText(body.contractDate),
    contractEndDate: normalizeText(body.contractEndDate),
    annualRaise: Number(body.annualRaise ?? 0) || 0,
    userActive: body.userActive === false ? false : true,
  };

  return { payload };
}

function isDuplicateEntryError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

export async function GET() {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const [employees, lookups, stats] = await Promise.all([
    listEmployees(),
    getEmployeeLookups(),
    getEmployeeStats(),
  ]);

  return NextResponse.json({
    employees,
    lookups,
    stats,
  });
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

    const employee = await insertEmployee(result.payload);

    return NextResponse.json(
      {
        message: "Data karyawan berhasil ditambahkan.",
        employee,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return NextResponse.json(
        { message: "Kode karyawan atau email sudah digunakan." },
        { status: 409 },
      );
    }

    console.error("Create employee error", error);

    return NextResponse.json(
      { message: "Gagal menambahkan data karyawan." },
      { status: 500 },
    );
  }
}
