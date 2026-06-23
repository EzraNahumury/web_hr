import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

const ADMIN_SESSION_COOKIE = "web_hr_admin_session";
const EMPLOYEE_SESSION_COOKIE = "web_hr_employee_session";
const SPV_SESSION_COOKIE = "web_hr_spv_session";

export type AdminSession = {
  id: number;
  email: string;
  fullName: string;
};

export type EmployeeSession = {
  id: number;
  userId: number;
  email: string;
  fullName: string;
};

export type SpvSession = {
  id: number;
  email: string;
  fullName: string;
};

// Peringatan sekali saat modul dimuat bila secret belum di-set di production.
// Tidak throw (agar tidak mematikan web yang sedang berjalan), tapi wajib ditindaklanjuti
// karena dengan auth token mobile, secret default yang bocor bisa dipakai memalsukan sesi.
if (process.env.NODE_ENV === "production" && !process.env.APP_SESSION_SECRET) {
  console.warn(
    "[auth] APP_SESSION_SECRET belum di-set di production — memakai default yang TIDAK AMAN. Segera set env var ini di server.",
  );
}

function getSessionSecret() {
  return process.env.APP_SESSION_SECRET ?? "dev-web-hr-session-secret";
}

function encode(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

// `expiresInMs` opsional: bila di-set (dipakai token mobile), payload diberi klaim `exp`
// dan readSignedSession akan menolak token yang sudah lewat. Cookie web TIDAK memakai ini,
// jadi payload-nya tanpa `exp` → perilaku web tidak berubah (masa berlaku diatur cookie maxAge).
export function createSignedSession(payload: object, opts?: { expiresInMs?: number }) {
  const finalPayload =
    opts?.expiresInMs && opts.expiresInMs > 0
      ? { ...payload, exp: Date.now() + opts.expiresInMs }
      : payload;
  const encodedPayload = encode(finalPayload);
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readSignedSession<T>(value?: string | null) {
  if (!value) {
    return null;
  }

  const [encodedPayload, providedSignature] = value.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as T & { exp?: number };
    // Tolak bila ada klaim exp dan sudah kedaluwarsa (hanya berlaku untuk token mobile).
    if (typeof parsed.exp === "number" && Date.now() > parsed.exp) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return readSignedSession<AdminSession>(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminSession() {
  const session = await getCurrentAdminSession();

  if (!session) {
    redirect("/");
  }

  return session;
}

export async function setAdminSessionCookie(payload: AdminSession) {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, createSignedSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getCurrentEmployeeSession() {
  // Web: cookie httpOnly (dicek lebih dulu — perilaku web tidak berubah)
  const cookieStore = await cookies();
  const fromCookie = readSignedSession<EmployeeSession>(
    cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value,
  );
  if (fromCookie) return fromCookie;

  // Mobile: Authorization: Bearer <token>  (token = signed-session yang sama dengan cookie)
  const headerStore = await headers();
  const authHeader =
    headerStore.get("authorization") ?? headerStore.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return readSignedSession<EmployeeSession>(authHeader.slice(7).trim());
  }

  return null;
}

export async function requireEmployeeSession() {
  const session = await getCurrentEmployeeSession();

  if (!session) {
    redirect("/");
  }

  const [rows] = await pool.query<(RowDataPacket & { status_data: string | null })[]>(
    `SELECT status_data FROM karyawan WHERE user_id = ? LIMIT 1`,
    [session.userId],
  );

  if (rows[0]?.status_data === "nonaktif") {
    const cookieStore = await cookies();
    cookieStore.delete(EMPLOYEE_SESSION_COOKIE);
    redirect("/");
  }

  return session;
}

export async function setEmployeeSessionCookie(payload: EmployeeSession) {
  const cookieStore = await cookies();

  cookieStore.set(EMPLOYEE_SESSION_COOKIE, createSignedSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getCurrentSpvSession() {
  const cookieStore = await cookies();
  return readSignedSession<SpvSession>(cookieStore.get(SPV_SESSION_COOKIE)?.value);
}

export async function requireSpvSession() {
  const session = await getCurrentSpvSession();

  if (!session) {
    redirect("/");
  }

  return session;
}

export async function setSpvSessionCookie(payload: SpvSession) {
  const cookieStore = await cookies();

  cookieStore.set(SPV_SESSION_COOKIE, createSignedSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAllSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  cookieStore.delete(EMPLOYEE_SESSION_COOKIE);
  cookieStore.delete(SPV_SESSION_COOKIE);
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function clearSpvSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SPV_SESSION_COOKIE);
}

// Whitelist email admin yang punya hak EDIT di halaman Summary Payroll & turunannya.
// Admin lain tetap bisa MELIHAT (read-only), tapi tidak bisa simpan/edit/hapus/input omzet.
const PAYROLL_EDITOR_EMAILS: ReadonlyArray<string> = [
  "avafamily17@gmail.com",
];

export function isPayrollEditor(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return PAYROLL_EDITOR_EMAILS.includes(normalized);
}

// Whitelist email admin yang boleh APPROVE/REJECT pengajuan lembur.
// Admin lain tetap bisa MELIHAT (read-only), tapi tidak bisa approve/reject/edit status.
const OVERTIME_APPROVER_EMAILS: ReadonlyArray<string> = [
  "aryaceo@gmail.com",
];

export function isOvertimeApprover(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return OVERTIME_APPROVER_EMAILS.includes(normalized);
}
