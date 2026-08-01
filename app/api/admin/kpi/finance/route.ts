import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  upsertKpiFinanceHariKerja,
  upsertKpiFinanceInputs,
  upsertKpiFinanceOmzet,
  type KpiFinanceInputRow,
} from "@/lib/kpi-finance";

function parsePositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseNonNegNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      employeeId?: unknown;
      month?: unknown;
      year?: unknown;
      hariKerja?: unknown;
      placementKey?: unknown;
      omzetTarget?: unknown;
      omzetRealisasi?: unknown;
      rows?: unknown;
    };

    const employeeId = parsePositiveInt(body.employeeId);
    const month = parsePositiveInt(body.month);
    const year = parsePositiveInt(body.year);

    if (!employeeId) return NextResponse.json({ message: "Karyawan wajib dipilih." }, { status: 400 });
    if (!month || month > 12 || !year) return NextResponse.json({ message: "Periode tidak valid." }, { status: 400 });

    const rawRows = Array.isArray(body.rows) ? body.rows : [];
    const rows: KpiFinanceInputRow[] = rawRows
      .map((r) => {
        const item = r as Record<string, unknown>;
        const key = typeof item.key === "string" ? item.key : "";
        if (!key) return null;
        const perhitunganNum = Number(item.perhitungan);
        const override =
          item.hasilOverride === "terpenuhi" || item.hasilOverride === "tidak"
            ? (item.hasilOverride as "terpenuhi" | "tidak")
            : null;
        return {
          key,
          aktualData: typeof item.aktualData === "string" ? item.aktualData.slice(0, 255) : "",
          perhitungan: Number.isFinite(perhitunganNum) ? perhitunganNum : 0,
          hasilOverride: override,
        } satisfies KpiFinanceInputRow;
      })
      .filter((r): r is KpiFinanceInputRow => r !== null);

    const hariKerja = parsePositiveInt(body.hariKerja);
    if (hariKerja) await upsertKpiFinanceHariKerja(month, year, hariKerja);

    // Omzet (per penempatan) — target editable + realisasi.
    const placementKey = typeof body.placementKey === "string" ? body.placementKey.slice(0, 32) : "";
    if (placementKey) {
      await upsertKpiFinanceOmzet(
        placementKey,
        month,
        year,
        parseNonNegNumber(body.omzetTarget),
        parseNonNegNumber(body.omzetRealisasi),
      );
    }

    await upsertKpiFinanceInputs(employeeId, month, year, rows);

    return NextResponse.json({ message: "Penilaian KPI Finance berhasil disimpan." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan penilaian KPI Finance.";
    console.error("Save KPI Finance error", error);
    const status = message.toLowerCase().includes("valid") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
