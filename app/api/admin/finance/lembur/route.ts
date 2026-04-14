import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { upsertFinanceLemburTambahan } from "@/lib/hris";

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseAmount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const month = parsePositiveInt(body.month);
    const year = parsePositiveInt(body.year);
    if (!month || !year || month > 12) {
      return NextResponse.json({ message: "Periode tidak valid." }, { status: 400 });
    }

    const rawEntries = Array.isArray(body.entries) ? body.entries : [];
    const entries: { unit: string; nominal: number; catatan?: string | null }[] = [];

    for (const item of rawEntries) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ message: "Format entri tidak valid." }, { status: 400 });
      }
      const record = item as Record<string, unknown>;
      const unit = typeof record.unit === "string" ? record.unit.trim() : "";
      const nominal = parseAmount(record.nominal);
      if (!unit) {
        return NextResponse.json({ message: "Unit lembur custom wajib diisi." }, { status: 400 });
      }
      if (nominal === null) {
        return NextResponse.json(
          { message: `Nominal lembur untuk ${unit} harus angka valid dan tidak negatif.` },
          { status: 400 },
        );
      }
      const catatan = typeof record.catatan === "string" ? record.catatan.trim() : null;
      entries.push({ unit, nominal, catatan: catatan || null });
    }

    if (!entries.length) {
      return NextResponse.json({ message: "Tidak ada entri lembur untuk disimpan." }, { status: 400 });
    }

    await upsertFinanceLemburTambahan({ month, year }, entries);

    return NextResponse.json({
      message: `Lembur tambahan finance untuk periode ${month}/${year} berhasil disimpan.`,
    });
  } catch (error) {
    console.error("Save finance lembur error", error);
    const message = error instanceof Error ? error.message : "Gagal menyimpan lembur tambahan.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
