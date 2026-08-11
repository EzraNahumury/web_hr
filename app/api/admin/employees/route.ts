import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import {
  EMPLOYEE_COST_ALLOCATIONS,
  EMPLOYEE_PLACEMENTS,
  EMPLOYEE_RELIGIONS,
  EMPLOYEE_WORK_STATUSES,
  EmployeePayload,
  insertEmployee,
  listEmployees,
  getEmployeeLookups,
  getEmployeeStats,
} from "@/lib/employees";
import { getMasterLookupOptions } from "@/lib/master-lookup";

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function validatePayload(body: Record<string, unknown>) {
  const nip = normalizeText(body.nip);
  const name = normalizeText(body.name);
  const unit = normalizeText(body.unit);
  const role = normalizeText(body.role);
  const subDivision = normalizeText(body.subDivision);
  const placement = normalizeText(body.placement);
  const extraPlacements = Array.isArray(body.extraPlacements)
    ? (body.extraPlacements as unknown[]).map((v) => normalizeText(v)).filter((v): v is string => v !== null)
    : [];
  const division = normalizeText(body.division);
  const department = normalizeText(body.department);
  const costAllocation = normalizeText(body.costAllocation) ?? "tidak keduanya";
  const gender: EmployeePayload["gender"] =
    body.gender === "laki-laki" || body.gender === "perempuan" ? body.gender : null;
  const employmentStatus = body.employmentStatus;
  const dataStatus = body.dataStatus;
  const firstJoinDate = normalizeText(body.firstJoinDate);

  if (!name) {
    return { error: "Nama wajib diisi." };
  }

  // Validasi 5 kategori ini terhadap Master (DB), bukan konstanta — agar nilai baru
  // yang ditambahkan admin lewat menu Master ikut diterima.
  const master = await getMasterLookupOptions();
  const has = (opts: { value: string }[], v: string) => opts.some((o) => o.value === v);
  if (unit && !has(master.units, unit)) {
    return { error: "Unit tidak valid." };
  }
  if (role && !has(master.roles, role)) {
    return { error: "Jabatan tidak valid." };
  }
  if (department && !has(master.departments, department)) {
    return { error: "Departemen tidak valid." };
  }
  if (division && !has(master.divisions, division)) {
    return { error: "Divisi tidak valid." };
  }
  if (subDivision && !has(master.subDivisions, subDivision)) {
    return { error: "Sub divisi tidak valid." };
  }

  if (
    placement &&
    !EMPLOYEE_PLACEMENTS.includes(placement as (typeof EMPLOYEE_PLACEMENTS)[number])
  ) {
    return { error: "Penempatan tidak valid." };
  }

  for (const ep of extraPlacements) {
    if (!EMPLOYEE_PLACEMENTS.includes(ep as (typeof EMPLOYEE_PLACEMENTS)[number])) {
      return { error: `Penempatan tambahan "${ep}" tidak valid.` };
    }
  }

  if (
    costAllocation &&
    !EMPLOYEE_COST_ALLOCATIONS.includes(costAllocation as (typeof EMPLOYEE_COST_ALLOCATIONS)[number])
  ) {
    return { error: "Pembebanan tidak valid." };
  }

  const religion = normalizeText(body.religion);
  if (religion && !EMPLOYEE_RELIGIONS.includes(religion as (typeof EMPLOYEE_RELIGIONS)[number])) {
    return { error: "Agama tidak valid." };
  }

  if (employmentStatus && !EMPLOYEE_WORK_STATUSES.includes(String(employmentStatus) as (typeof EMPLOYEE_WORK_STATUSES)[number])) {
    return { error: "Status kepegawaian tidak valid." };
  }

  if (dataStatus && !["aktif", "nonaktif"].includes(String(dataStatus))) {
    return { error: "Status data tidak valid." };
  }

  const payload: EmployeePayload = {
    name,
    nip: nip ?? "",
    email: "",
    password: null,
    unit,
    role: role ?? "",
    subDivision,
    placement,
    extraPlacements,
    division: division ?? "",
    department: department ?? "",
    recapGroup: null,
    costAllocation,
    bank: normalizeText(body.bank),
    accountNumber: normalizeText(body.accountNumber),
    gender,
    birthPlace: normalizeText(body.birthPlace),
    birthDate: normalizeText(body.birthDate),
    nik: normalizeText(body.nik),
    religion,
    addressKtp: normalizeText(body.addressKtp),
    addressCurrent: normalizeText(body.addressCurrent),
    phoneNumber: normalizeText(body.phoneNumber),
    ktpPhoto: normalizeText(body.ktpPhoto),
    employmentStatus: (employmentStatus as EmployeePayload["employmentStatus"]) ?? "kontrak",
    workStatus: (body.workStatus as EmployeePayload["workStatus"]) ?? (employmentStatus as EmployeePayload["workStatus"]) ?? "kontrak",
    dataStatus: (dataStatus as EmployeePayload["dataStatus"]) ?? "aktif",
    firstJoinDate: firstJoinDate ?? new Date().toISOString().split("T")[0],
    contractDate: normalizeText(body.contractDate),
    contractEndDate: normalizeText(body.contractEndDate),
    annualRaise: Number(body.annualRaise ?? 0) || 0,
    userActive: body.userActive === false ? false : true,
    penjahitPayrollType:
      body.penjahitPayrollType === "mingguan" || body.penjahitPayrollType === "bulanan"
        ? (body.penjahitPayrollType as "mingguan" | "bulanan")
        : null,
    csType: (["selling", "order", "grosir", "marketplace"] as const).includes(
      body.csType as "selling" | "order" | "grosir" | "marketplace",
    )
      ? (body.csType as "selling" | "order" | "grosir" | "marketplace")
      : null,
    freelanceTipePayroll: (["jam", "pengerjaan", "custom_pengerjaan", "harian"] as const).includes(
      body.freelanceTipePayroll as "jam" | "pengerjaan" | "custom_pengerjaan" | "harian",
    )
      ? (body.freelanceTipePayroll as "jam" | "pengerjaan" | "custom_pengerjaan" | "harian")
      : null,
    isShift: body.isShift === true,
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
    const result = await validatePayload(body);

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
