import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_SESSION_COOKIE = "web_hr_admin_session";
const EMPLOYEE_SESSION_COOKIE = "web_hr_employee_session";

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

export function createSignedSession(payload: object) {
  const encodedPayload = encode(payload);
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
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as T;
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
  const cookieStore = await cookies();
  return readSignedSession<EmployeeSession>(cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value);
}

export async function requireEmployeeSession() {
  const session = await getCurrentEmployeeSession();

  if (!session) {
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

export async function clearAllSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  cookieStore.delete(EMPLOYEE_SESSION_COOKIE);
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
