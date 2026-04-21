import { NextResponse } from "next/server";

import { getCurrentEmployeeSession } from "@/lib/auth";
import { getEmployeeByUserId } from "@/lib/hris";
import { createEmployeeReimbursement } from "@/lib/reimbursements";
import { saveUploadedFile } from "@/lib/uploads";

function parseSqlDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export async function POST(request: Request) {
  const session = await getCurrentEmployeeSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const employee = await getEmployeeByUserId(session.userId);
  if (!employee) return NextResponse.json({ message: "Data karyawan tidak ditemukan." }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Payload tidak valid." }, { status: 400 });

  const requestDate = parseSqlDate(formData.get("requestDate"));
  const expenseDate = parseSqlDate(formData.get("expenseDate"));
  const category = typeof formData.get("category") === "string" ? String(formData.get("category")).trim() : "";
  const description = typeof formData.get("description") === "string" && String(formData.get("description")).trim() ? String(formData.get("description")).trim() : null;
  const amount = Number(formData.get("amount"));
  const receipt = formData.get("receipt");

  if (!requestDate || !expenseDate || !category || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ message: "Tanggal, kategori, dan nominal reimburse wajib valid." }, { status: 400 });
  }

  if (!(receipt instanceof File) || receipt.size <= 0) {
    return NextResponse.json({ message: "Nota wajib diupload." }, { status: 400 });
  }

  try {
    const receiptPath = await saveUploadedFile(receipt, "reimbursements");
    const reimbursement = await createEmployeeReimbursement({
      employeeId: employee.id,
      requestDate,
      expenseDate,
      category,
      description,
      amount,
      receiptPath,
    });

    return NextResponse.json({ message: "Pengajuan reimburse berhasil dikirim.", reimbursement }, { status: 201 });
  } catch (error) {
    console.error("Create reimbursement error", error);
    return NextResponse.json({ message: "Gagal mengirim pengajuan reimburse." }, { status: 500 });
  }
}
