import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import {
  deleteEmployee,
  EMPLOYEE_COST_ALLOCATIONS,
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_DIVISIONS,
  EMPLOYEE_PLACEMENTS,
  EMPLOYEE_RELIGIONS,
  EMPLOYEE_ROLES,
  EMPLOYEE_SUB_DIVISIONS,
  EMPLOYEE_UNITS,
  EMPLOYEE_WORK_STATUSES,
  getEmployeeById,
  updateEmployee,
} from "@/lib/employees";

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validatePayload(body: Record<string, unknown>) {
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
  const costAllocation = normalizeText(body.costAllocation);
  const gender: "laki-laki" | "perempuan" | null =
    body.gender === "laki-laki" || body.gender === "perempuan" ? body.gender : null;
  const employmentStatus = body.employmentStatus;
  const dataStatus = body.dataStatus;
  const firstJoinDate = normalizeText(body.firstJoinDate);

  if (!name) {
    return { error: "Nama wajib diisi." };
  }

  if (unit && !EMPLOYEE_UNITS.includes(unit as (typeof EMPLOYEE_UNITS)[number])) {
    return { error: "Unit tidak valid." };
  }

  if (role && !EMPLOYEE_ROLES.includes(role as (typeof EMPLOYEE_ROLES)[number])) {
    return { error: "Jabatan tidak valid." };
  }

  if (department && !EMPLOYEE_DEPARTMENTS.includes(department as (typeof EMPLOYEE_DEPARTMENTS)[number])) {
    return { error: "Departemen tidak valid." };
  }

  if (division && !EMPLOYEE_DIVISIONS.includes(division as (typeof EMPLOYEE_DIVISIONS)[number])) {
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

  return {
    payload: {
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
      employmentStatus: (employmentStatus as "training" | "tetap" | "kontrak" | "freelance") ?? "kontrak",
      workStatus: (body.workStatus as "training" | "tetap" | "kontrak" | "freelance") ?? (employmentStatus as "training" | "tetap" | "kontrak" | "freelance") ?? "kontrak",
      dataStatus: (dataStatus as "aktif" | "nonaktif") ?? "aktif",
      firstJoinDate: firstJoinDate ?? new Date().toISOString().split("T")[0],
      contractDate: normalizeText(body.contractDate),
      contractEndDate: normalizeText(body.contractEndDate),
      annualRaise: Number(body.annualRaise ?? 0) || 0,
      userActive: body.userActive === false ? false : true,
      penjahitPayrollType:
        body.penjahitPayrollType === "mingguan" || body.penjahitPayrollType === "bulanan"
          ? (body.penjahitPayrollType as "mingguan" | "bulanan")
          : null,
    },
  };
}

function isDuplicateEntryError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
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
    return NextResponse.json({ message: "ID karyawan tidak valid." }, { status: 400 });
  }

  try {
    const current = await getEmployeeById(id);

    if (!current) {
      return NextResponse.json(
        { message: "Data karyawan tidak ditemukan." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const result = validatePayload(body);

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    const employee = await updateEmployee(id, {
      ...result.payload,
      email: current.email,
      ktpPhoto: result.payload.ktpPhoto ?? current.ktpPhoto,
    });

    return NextResponse.json({
      message: "Data karyawan berhasil diperbarui.",
      employee,
    });
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return NextResponse.json(
        { message: "Kode karyawan atau email sudah digunakan." },
        { status: 409 },
      );
    }

    console.error("Update employee error", error);

    return NextResponse.json(
      { message: "Gagal memperbarui data karyawan." },
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
    return NextResponse.json({ message: "ID karyawan tidak valid." }, { status: 400 });
  }

  try {
    const deleted = await deleteEmployee(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Data karyawan tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Data karyawan berhasil dihapus.",
    });
  } catch (error) {
    console.error("Delete employee error", error);

    return NextResponse.json(
      { message: "Data karyawan gagal dihapus. Pastikan belum dipakai di modul lain." },
      { status: 500 },
    );
  }
}
