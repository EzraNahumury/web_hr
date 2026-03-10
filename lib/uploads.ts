import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function saveUploadedFile(file: File, folder: string) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const originalName = sanitizeFileName(file.name || "upload.bin");
  const fileName = `${Date.now()}-${originalName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  const filePath = path.join(uploadDir, fileName);
  const relativePath = `/uploads/${folder}/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, buffer);

  return relativePath;
}
