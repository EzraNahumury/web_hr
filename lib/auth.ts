import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "web_hr_admin_session";

type AdminSession = {
  id: number;
  email: string;
  fullName: string;
};

function getSessionSecret() {
  return process.env.APP_SESSION_SECRET ?? "dev-web-hr-session-secret";
}

function encode(payload: AdminSession) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createSignedSession(payload: AdminSession) {
  const encodedPayload = encode(payload);
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readSignedSession(value?: string | null) {
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
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSession;
  } catch {
    return null;
  }
}

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return readSignedSession(cookieStore.get(SESSION_COOKIE)?.value);
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

  cookieStore.set(SESSION_COOKIE, createSignedSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
