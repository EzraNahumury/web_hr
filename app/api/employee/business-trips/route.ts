import { NextResponse } from "next/server";

import { getCurrentEmployeeSession } from "@/lib/auth";
import { createEmployeeBusinessTrip } from "@/lib/business-trips";
import { getEmployeeByUserId } from "@/lib/hris";
import { saveUploadedFile } from "@/lib/uploads";

function parseSqlDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export async function POST(request: Request) {
  const session = await getCurrentEmployeeSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) {
    return NextResponse.json({ message: "Data karyawan tidak ditemukan." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Payload tidak valid." }, { status: 400 });
  }

  const startDate = parseSqlDate(formData.get("startDate"));
  const endDate = parseSqlDate(formData.get("endDate"));
  const note =
    typeof formData.get("note") === "string" && String(formData.get("note")).trim()
      ? String(formData.get("note")).trim()
      : null;
  const letter = formData.get("letter");

  if (!startDate || !endDate) {
    return NextResponse.json({ message: "Tanggal mulai dan selesai wajib valid." }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ message: "Tanggal selesai harus >= tanggal mulai." }, { status: 400 });
  }
  if (!(letter instanceof File) || letter.size <= 0) {
    return NextResponse.json({ message: "Surat perjalanan dinas wajib diupload." }, { status: 400 });
  }

  try {
    const letterPath = await saveUploadedFile(letter, "business-trips");
    const businessTrip = await createEmployeeBusinessTrip({
      employeeId: employee.id,
      startDate,
      endDate,
      letterPath,
      note,
    });

    return NextResponse.json(
      {
        message: "Pengajuan perjalanan dinas berhasil dikirim.",
        businessTrip,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create business trip error", error);
    return NextResponse.json({ message: "Gagal mengirim pengajuan perjalanan dinas." }, { status: 500 });
  }
}
