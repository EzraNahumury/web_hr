import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/auth";
import { deleteEmployee, getEmployeeById, updateEmployee } from "@/lib/employees";

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
  const role = normalizeText(body.role);
  const division = normalizeText(body.division);
  const department = normalizeText(body.department);
  const workStatus = body.workStatus;

  if (!nip || !name || !email || !role || !division || !department) {
    return {
      error:
        "Nama, NIP, email, jabatan, divisi, dan departemen wajib diisi.",
    };
  }

  if (!["tetap", "kontrak", "freelance", "magang", "resign"].includes(String(workStatus))) {
    return { error: "Status kerja tidak valid." };
  }

  return {
    payload: {
      name,
      nip,
      email,
      password: normalizeText(body.password),
      role,
      division,
      department,
      recapGroup: normalizeText(body.recapGroup),
      bank: "BCA",
      accountNumber: normalizeText(body.accountNumber),
      workStatus: workStatus as "tetap" | "kontrak" | "freelance" | "magang" | "resign",
      contractDate: normalizeText(body.contractDate),
      contractEndDate: normalizeText(body.contractEndDate),
      annualRaise: Number(body.annualRaise ?? 0) || 0,
      userActive: body.userActive === false ? false : true,
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

    const employee = await updateEmployee(id, result.payload);

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
