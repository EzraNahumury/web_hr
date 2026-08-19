// Kompres/resize gambar di sisi CLIENT sebelum upload, supaya body request tidak melebihi
// batas proxy/server (mis. nginx client_max_body_size default 1MB) yang memicu "Failed to fetch".
// Aman: bukan gambar (PDF dll) atau file yang sudah kecil dikembalikan apa adanya; bila
// kompresi gagal / tak membantu, file asli dipakai.

export async function compressImageFile(
  file: File,
  opts?: { maxDim?: number; quality?: number; skipUnderBytes?: number },
): Promise<File> {
  const maxDim = opts?.maxDim ?? 1600;
  const quality = opts?.quality ?? 0.7;
  const skipUnder = opts?.skipUnderBytes ?? 700 * 1024; // <700KB tak perlu dikompres

  if (typeof document === "undefined") return file; // hanya di browser
  if (!file.type.startsWith("image/")) return file; // PDF/lainnya: biarkan
  if (file.size <= skipUnder) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file; // tak membantu → pakai asli

    const newName = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
