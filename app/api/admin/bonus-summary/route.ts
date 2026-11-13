import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  getBonusSummarySheet,
  setBonusDistribution,
  setBonusDistributionByGroup,
  upsertBonusOmzet,
} from "@/lib/bonus-summary";

export const dynamic = "force-dynamic";

function parsePositiveInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toMoney(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function GET(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const month = parsePositiveInt(url.searchParams.get("month"));
  const year = parsePositiveInt(url.searchParams.get("year"));
  const sheet = await getBonusSummarySheet(
    month && year ? { month, year } : undefined,
  );
  return NextResponse.json(sheet);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    month?: unknown;
    year?: unknown;
    omzet?: { avaSportivo?: unknown; ayres?: unknown; gabungan?: unknown };
    karyawanId?: unknown;
    division?: unknown;
    field?: unknown;
    value?: unknown;
  };

  const month = parsePositiveInt(body.month);
  const year = parsePositiveInt(body.year);
  if (!month || month > 12 || !year) {
    return NextResponse.json({ message: "Periode tidak valid." }, { status: 400 });
  }
  const period = { month, year };

  try {
    if (body.action === "set_omzet") {
      await upsertBonusOmzet(period, {
        avaSportivo: toMoney(body.omzet?.avaSportivo),
        ayres: toMoney(body.omzet?.ayres),
        gabungan: toMoney(body.omzet?.gabungan),
      });
    } else if (body.action === "set_distribution") {
      const id = parsePositiveInt(body.karyawanId);
      const field = body.field === "company" ? "company" : "team";
      if (!id) return NextResponse.json({ message: "Karyawan tidak valid." }, { status: 400 });
      await setBonusDistribution(period, id, field, body.value === true);
    } else if (body.action === "set_group_distribution") {
      const group = typeof body.division === "string" ? body.division : "";
      const field = body.field === "company" ? "company" : "team";
      if (!group) return NextResponse.json({ message: "Golongan bonus tidak valid." }, { status: 400 });
      await setBonusDistributionByGroup(period, group, field, body.value === true);
    } else {
      return NextResponse.json({ message: "Aksi tidak dikenal." }, { status: 400 });
    }

    const sheet = await getBonusSummarySheet(period);
    return NextResponse.json({ message: "Tersimpan.", sheet });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan.";
    console.error("Bonus summary error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
