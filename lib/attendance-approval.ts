import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { ensureAttendanceShiftSupport } from "@/lib/attendance";

export type AttendanceApprovalItem = {
  id: number;
  karyawanId: number;
  nama: string;
  nip: string | null;
  jabatan: string | null;
  divisi: string | null;
  department: string | null;
  tanggal: string; // 'DD Mon YYYY'
  tanggalIso: string;
  jamMasuk: string | null;
  jamPulang: string | null;
  jenis: string | null; // telat | pulang_awal | telat_pulang_awal
  lateMinutes: number;
  status: "pending" | "approved" | "rejected";
  keterangan: string | null; // alasan karyawan
  catatanAtasan: string | null;
  assignedApproverUserId: number | null;
  assignedApproverName: string | null;
  approverName: string | null;
  approvedAt: string | null;
  fotoMasuk: string | null;
};

type ApprovalRow = RowDataPacket & {
  id: number;
  karyawan_id: number;
  nama: string;
  nip: string | null;
  jabatan: string | null;
  divisi: string | null;
  departemen: string | null;
  tanggal: string;
  tanggal_iso: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  approval_jenis: string | null;
  terlambat_menit: number;
  approval_status: "pending" | "approved" | "rejected";
  keterangan: string | null;
  catatan_atasan: string | null;
  assigned_approver_user_id: number | null;
  assigned_approver_name: string | null;
  approver_name: string | null;
  approved_at: string | null;
  foto_masuk: string | null;
};

const listQuery = `
  SELECT
    a.id,
    a.karyawan_id,
    k.nama,
    k.no_karyawan AS nip,
    k.jabatan,
    k.divisi,
    k.departemen,
    DATE_FORMAT(a.tanggal, '%d %b %Y') AS tanggal,
    DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS tanggal_iso,
    DATE_FORMAT(a.jam_masuk, '%H:%i') AS jam_masuk,
    DATE_FORMAT(a.jam_pulang, '%H:%i') AS jam_pulang,
    a.approval_jenis,
    a.terlambat_menit,
    a.approval_status,
    a.keterangan,
    a.catatan_atasan,
    a.assigned_approver_user_id,
    assigned.nama AS assigned_approver_name,
    approver.nama AS approver_name,
    DATE_FORMAT(a.approved_at, '%d %b %Y %H:%i') AS approved_at,
    a.foto_masuk
  FROM absensi a
  INNER JOIN karyawan k ON k.id = a.karyawan_id
  LEFT JOIN users assigned ON assigned.id = a.assigned_approver_user_id
  LEFT JOIN users approver ON approver.id = a.approver_user_id
  WHERE a.butuh_approval = 1
`;

function mapRow(row: ApprovalRow): AttendanceApprovalItem {
  return {
    id: row.id,
    karyawanId: row.karyawan_id,
    nama: row.nama,
    nip: row.nip,
    jabatan: row.jabatan,
    divisi: row.divisi,
    department: row.departemen,
    tanggal: row.tanggal,
    tanggalIso: row.tanggal_iso,
    jamMasuk: row.jam_masuk,
    jamPulang: row.jam_pulang,
    jenis: row.approval_jenis,
    lateMinutes: Number(row.terlambat_menit) || 0,
    status: row.approval_status ?? "pending",
    keterangan: row.keterangan,
    catatanAtasan: row.catatan_atasan,
    assignedApproverUserId: row.assigned_approver_user_id,
    assignedApproverName: row.assigned_approver_name,
    approverName: row.approver_name,
    approvedAt: row.approved_at,
    fotoMasuk: row.foto_masuk,
  };
}

// Pengajuan approval absensi yang DITUJUKAN ke approver tertentu (SPV/Supervisor/Manager akun karyawan).
export async function listAttendanceApprovalsForApprover(approverUserId: number) {
  await ensureAttendanceShiftSupport();
  const [rows] = await pool.query<ApprovalRow[]>(
    `${listQuery} AND a.assigned_approver_user_id = ? ORDER BY a.tanggal DESC, a.id DESC`,
    [approverUserId],
  );
  return rows.map(mapRow);
}

// Pengajuan approval absensi yang ditujukan ke Admin (assigned_approver_user_id NULL = broadcast admin,
// ATAU assigned ke user admin tertentu).
export async function listAttendanceApprovalsForAdmin() {
  await ensureAttendanceShiftSupport();
  const [rows] = await pool.query<ApprovalRow[]>(
    `${listQuery}
       AND (
         a.assigned_approver_user_id IS NULL
         OR a.assigned_approver_user_id IN (SELECT id FROM users WHERE role = 'admin')
       )
     ORDER BY a.tanggal DESC, a.id DESC`,
  );
  return rows.map(mapRow);
}

// Semua record approval absensi (history).
export async function listAllAttendanceApprovals() {
  await ensureAttendanceShiftSupport();
  const [rows] = await pool.query<ApprovalRow[]>(
    `${listQuery} ORDER BY a.tanggal DESC, a.id DESC`,
  );
  return rows.map(mapRow);
}

// Pengajuan approval absensi milik karyawan (untuk lihat status sendiri).
export async function listAttendanceApprovalsForEmployee(employeeId: number) {
  await ensureAttendanceShiftSupport();
  const [rows] = await pool.query<ApprovalRow[]>(
    `${listQuery} AND a.karyawan_id = ? ORDER BY a.tanggal DESC, a.id DESC`,
    [employeeId],
  );
  return rows.map(mapRow);
}

type ProcessResult = { ok: true } | { ok: false; status: number; message: string };

// Proses approve/reject oleh approver (atasan/admin). isAdmin=true melewati cek assigned.
export async function processAttendanceApproval(params: {
  absensiId: number;
  approverUserId: number;
  isAdmin: boolean;
  decision: "approved" | "rejected";
  catatanAtasan: string | null;
}): Promise<ProcessResult> {
  const { absensiId, approverUserId, isAdmin, decision, catatanAtasan } = params;
  if (!Number.isInteger(absensiId) || absensiId <= 0) {
    return { ok: false, status: 400, message: "ID absensi tidak valid." };
  }
  if (decision !== "approved" && decision !== "rejected") {
    return { ok: false, status: 400, message: "Keputusan approval tidak valid." };
  }

  await ensureAttendanceShiftSupport();

  const [rows] = await pool.query<
    (RowDataPacket & {
      id: number;
      butuh_approval: number;
      approval_status: string | null;
      assigned_approver_user_id: number | null;
    })[]
  >(
    `SELECT id, butuh_approval, approval_status, assigned_approver_user_id
       FROM absensi WHERE id = ? LIMIT 1`,
    [absensiId],
  );
  const record = rows[0];
  if (!record || record.butuh_approval !== 1) {
    return { ok: false, status: 404, message: "Data approval absensi tidak ditemukan." };
  }

  if (!isAdmin && record.assigned_approver_user_id !== approverUserId) {
    return { ok: false, status: 403, message: "Pengajuan ini tidak ditujukan ke Anda." };
  }
  // Admin hanya boleh proses yg broadcast (NULL) atau ditujukan ke admin.
  if (isAdmin && record.assigned_approver_user_id !== null) {
    const [adminCheck] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM users WHERE id = ? AND role = 'admin' LIMIT 1`,
      [record.assigned_approver_user_id],
    );
    if (adminCheck.length === 0) {
      return { ok: false, status: 403, message: "Pengajuan ini ditujukan ke atasan lain." };
    }
  }

  if (record.approval_status !== "pending") {
    return { ok: false, status: 409, message: "Approval absensi ini sudah final." };
  }

  await pool.query<ResultSetHeader>(
    `UPDATE absensi
       SET approval_status = ?, approver_user_id = ?, approved_at = NOW(), catatan_atasan = ?
     WHERE id = ?`,
    [decision, approverUserId, catatanAtasan, absensiId],
  );

  return { ok: true };
}
