import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import {
  deleteEmployee,
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_DIVISIONS,
  EMPLOYEE_PLACEMENTS,
  EMPLOYEE_ROLES,
  EMPLOYEE_SUB_DIVISIONS,
  EMPLOYEE_UNITS,
  EMPLOYEE_WORK_STATUSES,
  getEmployeeById,
  updateEmployee,
} from "@/lib/employees";
import { saveUploadedFile } from "@/lib/uploads";

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
  const email = normalizeText(body.email)?.toLowerCase() ?? null;
  const unit = normalizeText(body.unit);
  const role = normalizeText(body.role);
  const subDivision = normalizeText(body.subDivision);
  const placement = normalizeText(body.placement);
  const division = normalizeText(body.division);
  const department = normalizeText(body.department);
  const gender: "laki-laki" | "perempuan" | null =
    body.gender === "laki-laki" || body.gender === "perempuan" ? body.gender : null;
  const employmentStatus = body.employmentStatus;
  const workStatus = body.workStatus;
  const dataStatus = body.dataStatus;
  const firstJoinDate = normalizeText(body.firstJoinDate);

  if (!nip || !name || !email || !role || !division || !department || !firstJoinDate) {
    return {
      error:
        "Nama, NIP, email, jabatan, divisi, departemen, dan tanggal pertama masuk wajib diisi.",
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

  if (!EMPLOYEE_WORK_STATUSES.includes(String(workStatus) as (typeof EMPLOYEE_WORK_STATUSES)[number])) {
    return { error: "Status kerja tidak valid." };
  }

  if (!EMPLOYEE_WORK_STATUSES.includes(String(employmentStatus) as (typeof EMPLOYEE_WORK_STATUSES)[number])) {
    return { error: "Status kepegawaian tidak valid." };
  }

  if (!["aktif", "nonaktif"].includes(String(dataStatus))) {
    return { error: "Status data tidak valid." };
  }

  return {
    payload: {
      name,
      nip,
      email,
      password: normalizeText(body.password),
      unit,
      role,
      subDivision,
      placement,
      division,
      department,
      recapGroup: normalizeText(body.recapGroup),
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
      employmentStatus: employmentStatus as "training" | "tetap" | "kontrak" | "freelance",
      workStatus: workStatus as "training" | "tetap" | "kontrak" | "freelance",
      dataStatus: dataStatus as "aktif" | "nonaktif",
      firstJoinDate,
      contractDate: normalizeText(body.contractDate),
      contractEndDate: normalizeText(body.contractEndDate),
      annualRaise: Number(body.annualRaise ?? 0) || 0,
      userActive: body.userActive === "false" ? false : true,
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

    const formData = await request.formData();
    const ktpFile = formData.get("ktpFile");
    const body = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    const result = validatePayload(body);

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    const employee = await updateEmployee(id, {
      ...result.payload,
      ktpPhoto:
        ktpFile instanceof File && ktpFile.size > 0
          ? await saveUploadedFile(ktpFile, "ktp")
          : result.payload.ktpPhoto,
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

