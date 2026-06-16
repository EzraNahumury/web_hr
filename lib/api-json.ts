import { NextResponse } from "next/server";

/**
 * Balas JSON dengan header anti-cache.
 * Dipakai untuk endpoint auth/data pribadi mobile supaya CDN/proxy (hcdn Hostinger)
 * tidak menyimpan atau menyajikan ulang respons milik karyawan ke karyawan lain.
 */
export function jsonNoStore(data: unknown, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}
