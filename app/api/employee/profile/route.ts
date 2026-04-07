import { NextResponse } from "next/server";
import { getCurrentEmployeeSession } from "@/lib/auth";
import {
  EMPLOYEE_RELIGIONS,
  getEmployeeProfileByUserId,
  updateEmployeeProfile,
} from "@/lib/employees";
import { saveUploadedFile } from "@/lib/uploads";

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function GET() {
  const session = await getCurrentEmployeeSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const employee = await getEmployeeProfileByUserId(session.userId);
  if (!employee) {
    return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

export async function PUT(request: Request) {
  const session = await getCurrentEmployeeSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    const ktpFile = formData.get("ktpFile");

    const name = normalizeText(body.name);
    if (!name) {
      return NextResponse.json({ message: "Nama wajib diisi." }, { status: 400 });
    }

    const gender: "laki-laki" | "perempuan" | null =
      body.gender === "laki-laki" || body.gender === "perempuan" ? body.gender : null;

    const religion = normalizeText(body.religion);
    if (religion && !EMPLOYEE_RELIGIONS.includes(religion as (typeof EMPLOYEE_RELIGIONS)[number])) {
      return NextResponse.json({ message: "Agama tidak valid." }, { status: 400 });
    }

    let ktpPhotoPath = normalizeText(body.ktpPhotoLink);
    if (ktpFile instanceof File && ktpFile.size > 0) {
      ktpPhotoPath = await saveUploadedFile(ktpFile, "ktp");
    }

    await updateEmployeeProfile(session.userId, {
      name,
      gender,
      birthPlace: normalizeText(body.birthPlace),
      birthDate: normalizeText(body.birthDate),
      nik: normalizeText(body.nik),
      religion,
      phoneNumber: normalizeText(body.phoneNumber),
      addressKtp: normalizeText(body.addressKtp),
      addressCurrent: normalizeText(body.addressCurrent),
      ktpPhotoLink: ktpPhotoPath,
      bank: normalizeText(body.bank),
      accountNumber: normalizeText(body.accountNumber),
    });

    return NextResponse.json({ message: "Data diri berhasil diperbarui." });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json({ message: "NIK sudah terdaftar." }, { status: 409 });
    }

    console.error("Update profile error", error);
    return NextResponse.json({ message: "Gagal memperbarui data." }, { status: 500 });
  }
}
