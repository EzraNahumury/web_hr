import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  addMasterLookup,
  deleteMasterLookup,
  isMasterCategory,
  listMasterLookup,
} from "@/lib/master-lookup";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      category?: unknown;
      value?: unknown;
      id?: unknown;
    };

    const category = body.category;
    if (!isMasterCategory(category)) {
      return NextResponse.json({ message: "Kategori tidak valid." }, { status: 400 });
    }

    if (body.action === "add") {
      const value = typeof body.value === "string" ? body.value : "";
      await addMasterLookup(category, value);
    } else if (body.action === "delete") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ message: "Item tidak valid." }, { status: 400 });
      }
      await deleteMasterLookup(category, id);
    } else {
      return NextResponse.json({ message: "Aksi tidak dikenal." }, { status: 400 });
    }

    const items = await listMasterLookup(category);
    return NextResponse.json({ message: "Master berhasil diperbarui.", items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan master.";
    console.error("Master lookup error", error);
    const status = message.toLowerCase().includes("kosong") || message.toLowerCase().includes("panjang") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
