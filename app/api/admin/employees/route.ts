import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import {
  EMPLOYEE_COST_ALLOCATIONS,
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_DIVISIONS,
  EMPLOYEE_PLACEMENTS,
  EMPLOYEE_ROLES,
  EMPLOYEE_SUB_DIVISIONS,
  EMPLOYEE_UNITS,
  EMPLOYEE_WORK_STATUSES,
  EmployeePayload,
  insertEmployee,
  listEmployees,
  getEmployeeLookups,
  getEmployeeStats,
} from "@/lib/employees";
import { saveUploadedFile } from "@/lib/uploads";

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
  const unit = normalizeText(body.unit);
  const role = normalizeText(body.role);
  const subDivision = normalizeText(body.subDivision);
  const placement = normalizeText(body.placement);
  const division = normalizeText(body.division);
  const department = normalizeText(body.department);
  const costAllocation = normalizeText(body.costAllocation);
  const gender: EmployeePayload["gender"] =
    body.gender === "laki-laki" || body.gender === "perempuan" ? body.gender : null;
  const employmentStatus = body.employmentStatus;
  const workStatus = body.workStatus;
  const dataStatus = body.dataStatus;
  const firstJoinDate = normalizeText(body.firstJoinDate);

  if (!nip || !name || !email || !password || !role || !division || !department || !firstJoinDate) {
    return {
      error:
        "Nama, NIP, email, password, jabatan, divisi, departemen, dan tanggal pertama masuk wajib diisi.",
    };
  }

  if (unit && !EMPLOYEE_UNITS.includes(unit as (typeof EMPLOYEE_UNITS)[number])) {
    return { error: "Unit tidak valid." };
  }

  if (!EMPLOYEE_ROLES.includes(role as (typeof EMPLOYEE_ROLES)[number])) {
    return { error: "Jabatan tidak valid." };
  }

  if (!EMPLOYEE_DEPARTMENTS.includes(department as (typeof EMPLOYEE_DEPARTMENTS)[number])) {
    return { error: "Departemen tidak valid." };
  }

  if (!EMPLOYEE_DIVISIONS.includes(division as (typeof EMPLOYEE_DIVISIONS)[number])) {
    return { error: "Divisi tidak valid." };
  }

  if (
    subDivision &&
    !EMPLOYEE_SUB_DIVISIONS.includes(subDivision as (typeof EMPLOYEE_SUB_DIVISIONS)[number])
  ) {
    return { error: "Sub divisi tidak valid." };
  }

  if (
    placement &&
    !EMPLOYEE_PLACEMENTS.includes(placement as (typeof EMPLOYEE_PLACEMENTS)[number])
  ) {
    return { error: "Penempatan tidak valid." };
  }

  if (
    costAllocation &&
    !EMPLOYEE_COST_ALLOCATIONS.includes(costAllocation as (typeof EMPLOYEE_COST_ALLOCATIONS)[number])
  ) {
    return { error: "Pembebanan tidak valid." };
  }

  if (!EMPLOYEE_WORK_STATUSES.includes(String(workStatus) as (typeof EMPLOYEE_WORK_STATUSES)[number])) {
    return { error: "Status kerja tidak valid." };
  }

  if (!EMPLOYEE_WORK_STATUSES.includes(String(employmentStatus) as (typeof EMPLOYEE_WORK_STATUSES)[number])) {
    return { error: "Status kepegawaian tidak valid." };
  }

  if (!["aktif", "nonaktif"].includes(String(dataStatus))) {
    return { error: "Status data tidak valid." };
  }

  const payload: EmployeePayload = {
    name,
    nip,
    email,
    password,
    unit,
    role,
    subDivision,
    placement,
    division,
    department,
    recapGroup: normalizeText(body.recapGroup),
    costAllocation,
    bank: normalizeText(body.bank),
    accountNumber: normalizeText(body.accountNumber),
    gender,
    birthPlace: normalizeText(body.birthPlace),
    birthDate: normalizeText(body.birthDate),
    nik: normalizeText(body.nik),
    religion: normalizeText(body.religion),
    addressKtp: normalizeText(body.addressKtp),
    addressCurrent: normalizeText(body.addressCurrent),
    phoneNumber: normalizeText(body.phoneNumber),
    ktpPhoto: normalizeText(body.ktpPhoto),
    employmentStatus: employmentStatus as EmployeePayload["employmentStatus"],
    workStatus: workStatus as EmployeePayload["workStatus"],
    dataStatus: dataStatus as EmployeePayload["dataStatus"],
    firstJoinDate,
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
    const formData = await request.formData();
    const ktpFile = formData.get("ktpFile");
    const body = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    const result = validatePayload(body);

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    const employee = await insertEmployee({
      ...result.payload,
      ktpPhoto:
        ktpFile instanceof File && ktpFile.size > 0
          ? await saveUploadedFile(ktpFile, "ktp")
          : null,
      userActive: body.userActive === "true",
    });

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
