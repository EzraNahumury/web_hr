import { NextResponse } from "next/server";

import { getCurrentEmployeeSession } from "@/lib/auth";
import { getJakartaDate, getJakartaDateTime } from "@/lib/attendance";
import {
  createVisitReport,
  ensureVisitReportSchema,
  getEmployeeRoleByUserId,
  listVisitReportsForEmployee,
  saveVisitReportPhoto,
} from "@/lib/visit-reports";
import { isSalesFieldRole } from "@/lib/sales-roles";

export async function POST(request: Request) {
  try {
    const session = await getCurrentEmployeeSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await ensureVisitReportSchema();

    const employee = await getEmployeeRoleByUserId(session.userId);

    if (!employee) {
      return NextResponse.json(
        { message: "Data karyawan tidak ditemukan." },
        { status: 404 },
      );
    }

    if (!isSalesFieldRole(employee.role)) {
      return NextResponse.json(
        { message: "Laporan kunjungan hanya untuk jabatan sales." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const namaToko =
      typeof formData.get("namaToko") === "string"
        ? String(formData.get("namaToko")).trim()
        : "";
    const photoDataUrl =
      typeof formData.get("photoDataUrl") === "string"
        ? String(formData.get("photoDataUrl"))
        : "";
    const latitudeRaw = formData.get("latitude");
    const longitudeRaw = formData.get("longitude");
    const latitude = latitudeRaw !== null ? Number(latitudeRaw) : NaN;
    const longitude = longitudeRaw !== null ? Number(longitudeRaw) : NaN;

    if (!namaToko) {
      return NextResponse.json(
        { message: "Nama toko wajib diisi." },
        { status: 400 },
      );
    }

    if (!photoDataUrl) {
      return NextResponse.json(
        { message: "Foto kunjungan wajib diupload." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { message: "Lokasi GPS wajib dikirim." },
        { status: 400 },
      );
    }

    const fotoPath = await saveVisitReportPhoto(photoDataUrl, employee.employeeId);
    const tanggal = getJakartaDate();
    const waktuSubmit = getJakartaDateTime();

    await createVisitReport({
      employeeId: employee.employeeId,
      tanggal,
      waktuSubmit,
      namaToko,
      fotoPath,
      latitude,
      longitude,
    });

    return NextResponse.json({
      message: "Laporan kunjungan berhasil disimpan.",
    });
  } catch (error) {
    console.error("Employee visit-report POST error", error);
    return NextResponse.json(
      { message: "Gagal menyimpan laporan kunjungan." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getCurrentEmployeeSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await ensureVisitReportSchema();

    const employee = await getEmployeeRoleByUserId(session.userId);

    if (!employee) {
      return NextResponse.json(
        { message: "Data karyawan tidak ditemukan." },
        { status: 404 },
      );
    }

    if (!isSalesFieldRole(employee.role)) {
      return NextResponse.json({ reports: [] });
    }

    const tanggal = getJakartaDate();
    const reports = await listVisitReportsForEmployee(employee.employeeId, tanggal);

    return NextResponse.json({ reports, tanggal });
  } catch (error) {
    console.error("Employee visit-report GET error", error);
    return NextResponse.json(
      { message: "Gagal mengambil laporan kunjungan." },
      { status: 500 },
    );
  }
}
