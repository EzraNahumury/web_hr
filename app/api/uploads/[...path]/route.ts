import { stat, readFile } from "node:fs/promises";
import { extname } from "node:path";
import { NextResponse } from "next/server";

import { getCurrentAdminSession, getCurrentEmployeeSession } from "@/lib/auth";
import { resolveUploadPath } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const [adminSession, employeeSession] = await Promise.all([
    getCurrentAdminSession(),
    getCurrentEmployeeSession(),
  ]);

  if (!adminSession && !employeeSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await params;
  if (!Array.isArray(segments) || segments.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const relativePath = segments.join("/");
  const absolutePath = resolveUploadPath(relativePath);

  if (!absolutePath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFile(absolutePath);
  const body = new Uint8Array(buffer);
  const contentType = MIME_TYPES[extname(absolutePath).toLowerCase()] ?? "application/octet-stream";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
