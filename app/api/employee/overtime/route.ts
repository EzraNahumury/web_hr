import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { saveUploadedFile } from "@/lib/uploads";
import { ensureOvertimeSchema, shouldRouteToAdmin } from "@/lib/overtime";

function toDateTimeString(date: string, time: string) {
  return `${date} ${time}:00`;
}

export async function POST(request: NextRequest) {
  await ensureOvertimeSchema();
  const formData = await request.formData().catch(() => null);

  const karyawanId = Number(formData?.get("karyawanId"));
  const tanggal = typeof formData?.get("tanggal") === "string" ? String(formData.get("tanggal")) : "";
  const jamMulai =
    typeof formData?.get("jamMulai") === "string" ? String(formData.get("jamMulai")) : "";
  const jamSelesai =
    typeof formData?.get("jamSelesai") === "string" ? String(formData.get("jamSelesai")) : "";
  const buktiFile = formData?.get("buktiLembur");
  const catatanKaryawan =
    typeof formData?.get("catatanKaryawan") === "string"
      ? String(formData.get("catatanKaryawan")).trim() || null
      : null;
  const approverRaw = formData?.get("assignedApproverUserId");
  const isBroadcastToAdmins = approverRaw === "admin";
  const assignedApproverUserId =
    approverRaw && approverRaw !== "" && !isBroadcastToAdmins ? Number(approverRaw) : null;

  const jenisPekerjaan =
    typeof formData?.get("jenisPekerjaan") === "string"
      ? String(formData.get("jenisPekerjaan")).trim() || null
      : null;
  const deadlineRaw = formData?.get("deadline");
  const deadline =
    typeof deadlineRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw) ? deadlineRaw : null;
  const namaOrder =
    typeof formData?.get("namaOrder") === "string"
      ? String(formData.get("namaOrder")).trim() || null
      : null;
  const parsePositiveInt = (value: FormDataEntryValue | null | undefined) => {
    if (typeof value !== "string" || value.trim() === "") return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };
  const jumlahQty = parsePositiveInt(formData?.get("jumlahQty"));
  const targetSebelumLembur = parsePositiveInt(formData?.get("targetSebelumLembur"));
  const targetSetelahLembur = parsePositiveInt(formData?.get("targetSetelahLembur"));

  if (!Number.isInteger(karyawanId) || karyawanId <= 0) {
    return NextResponse.json({ error: "Karyawan tidak valid." }, { status: 400 });
  }

  if (!tanggal || !jamMulai || !jamSelesai) {
    return NextResponse.json({ error: "Tanggal dan jam lembur wajib diisi." }, { status: 400 });
  }

  const start = new Date(`${tanggal}T${jamMulai}:00`);
  const end = new Date(`${tanggal}T${jamSelesai}:00`);
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  if (!Number.isFinite(diffHours) || diffHours <= 0) {
    return NextResponse.json(
      { error: "Jam selesai harus lebih besar dari jam mulai." },
      { status: 400 },
    );
  }

  const [employeeRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, jabatan, divisi FROM karyawan WHERE id = ? LIMIT 1",
    [karyawanId],
  );

  if (!employeeRows[0]) {
    return NextResponse.json({ error: "Data karyawan tidak ditemukan." }, { status: 404 });
  }

  const submitterRole = (employeeRows[0].jabatan ?? "") as string;
  const submitterDivisi = ((employeeRows[0].divisi ?? "") as string).trim().toLowerCase();
  const isProduksi = submitterDivisi === "produksi";
  const routesToAllAdmins = shouldRouteToAdmin(submitterRole) || isBroadcastToAdmins;

  if (!jenisPekerjaan) {
    return NextResponse.json({ error: "Jenis pekerjaan wajib diisi." }, { status: 400 });
  }
  if (!deadline) {
    return NextResponse.json({ error: "Deadline wajib diisi (format YYYY-MM-DD)." }, { status: 400 });
  }
  if (isProduksi) {
    if (!namaOrder) {
      return NextResponse.json({ error: "Nama order wajib diisi untuk divisi Produksi." }, { status: 400 });
    }
    if (jumlahQty === null) {
      return NextResponse.json({ error: "Jumlah QTY wajib diisi untuk divisi Produksi." }, { status: 400 });
    }
    if (targetSebelumLembur === null) {
      return NextResponse.json({ error: "Target sebelum lembur wajib diisi untuk divisi Produksi." }, { status: 400 });
    }
    if (targetSetelahLembur === null) {
      return NextResponse.json({ error: "Target setelah lembur wajib diisi untuk divisi Produksi." }, { status: 400 });
    }
  }

  let finalApproverId: number | null = null;
  let approvalFlow: "single" | "double" = "single";

  if (routesToAllAdmins) {
    // Broadcast ke semua admin: assigned_approver_user_id = NULL, single approval
    finalApproverId = null;
    approvalFlow = "single";
  } else {
    if (!Number.isInteger(assignedApproverUserId) || (assignedApproverUserId ?? 0) <= 0) {
      return NextResponse.json(
        { error: "Pilih atasan (SPV/Manager/Admin) yang akan menerima pengajuan lembur." },
        { status: 400 },
      );
    }
    // Validate approver + dapatkan role-nya (untuk tentukan approval_flow)
    const [approverRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          u.id,
          u.role AS user_role,
          LOWER(COALESCE(k.jabatan, '')) AS karyawan_jabatan
        FROM users u
        LEFT JOIN karyawan k ON k.user_id = u.id
        WHERE u.id = ?
          AND u.status_aktif = 1
          AND (
            u.role = 'admin'
            OR u.role = 'spv'
            OR (k.status_data = 'aktif' AND LOWER(COALESCE(k.jabatan, '')) IN ('manager', 'supervisor'))
          )
        LIMIT 1
      `,
      [assignedApproverUserId],
    );
    if (!approverRows[0]) {
      return NextResponse.json(
        { error: "Atasan yang dipilih tidak valid." },
        { status: 400 },
      );
    }
    finalApproverId = assignedApproverUserId;
    // Admin user → single approve (langsung admin). Non-admin (SPV/Manager/Supervisor) → double approve (atasan + admin).
    const approverIsAdmin = (approverRows[0].user_role ?? "") === "admin";
    approvalFlow = approverIsAdmin ? "single" : "double";
  }

  const buktiLembur =
    buktiFile instanceof File && buktiFile.size > 0
      ? await saveUploadedFile(buktiFile, "overtime")
      : null;

  const initialFirstApprovalStatus = approvalFlow === "double" ? "pending" : null;

  await pool.query<ResultSetHeader>(
    `
      INSERT INTO lembur (
        karyawan_id,
        tanggal,
        jam_mulai,
        jam_selesai,
        total_jam,
        bukti_lembur,
        status_approval,
        approved_by,
        catatan_atasan,
        assigned_approver_user_id,
        catatan_karyawan,
        jenis_pekerjaan,
        deadline,
        nama_order,
        jumlah_qty,
        target_sebelum_lembur,
        target_setelah_lembur,
        approval_flow,
        first_approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      karyawanId,
      tanggal,
      toDateTimeString(tanggal, jamMulai),
      toDateTimeString(tanggal, jamSelesai),
      diffHours.toFixed(2),
      buktiLembur,
      finalApproverId,
      catatanKaryawan,
      jenisPekerjaan,
      deadline,
      isProduksi ? namaOrder : null,
      isProduksi ? jumlahQty : null,
      isProduksi ? targetSebelumLembur : null,
      isProduksi ? targetSetelahLembur : null,
      approvalFlow,
      initialFirstApprovalStatus,
    ],
  );

  return NextResponse.json({ success: true });
}
