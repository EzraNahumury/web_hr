import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { upsertKpiRndInputs, type KpiRndInputRow } from "@/lib/kpi-rnd";

function parsePositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
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
      rows?: unknown;
    };

    const employeeId = parsePositiveInt(body.employeeId);
    const month = parsePositiveInt(body.month);
    const year = parsePositiveInt(body.year);

    if (!employeeId) {
      return NextResponse.json({ message: "Karyawan wajib dipilih." }, { status: 400 });
    }
    if (!month || month > 12 || !year) {
      return NextResponse.json({ message: "Periode tidak valid." }, { status: 400 });
    }

    const rawRows = Array.isArray(body.rows) ? body.rows : [];
    const rows: KpiRndInputRow[] = rawRows
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
        } satisfies KpiRndInputRow;
      })
      .filter((r): r is KpiRndInputRow => r !== null);

    await upsertKpiRndInputs(employeeId, month, year, rows);

    return NextResponse.json({ message: "Penilaian KPI berhasil disimpan." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan penilaian KPI.";
    console.error("Save KPI RnD error", error);
    const status = message.toLowerCase().includes("valid") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
