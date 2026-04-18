import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function getUploadRoot() {
  const override = process.env.UPLOAD_DIR;
  if (override && override.trim().length > 0) {
    return path.resolve(override);
  }
  return path.join(process.cwd(), "public", "uploads");
}

export function resolveUploadPath(relativePath: string) {
  const trimmed = relativePath.replace(/^\/+/, "").replace(/^uploads\//, "");
  const resolved = path.join(getUploadRoot(), trimmed);
  const root = getUploadRoot();
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }
  return resolved;
}

export async function saveUploadedFile(file: File, folder: string) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const originalName = sanitizeFileName(file.name || "upload.bin");
  const fileName = `${Date.now()}-${originalName}`;
  const uploadDir = path.join(getUploadRoot(), folder);
  const filePath = path.join(uploadDir, fileName);
  const relativePath = `/uploads/${folder}/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, buffer);

  return relativePath;
}

export async function saveBufferToUploads(buffer: Buffer, folder: string, fileName: string) {
  const uploadDir = path.join(getUploadRoot(), folder);
  const filePath = path.join(uploadDir, fileName);
  const relativePath = `/uploads/${folder}/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, buffer);

  return relativePath;
}
