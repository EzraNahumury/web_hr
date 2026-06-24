import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import { chatWithHrAgent, type HrAgentMessage } from "@/lib/hr-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  const rawMessages = Array.isArray(body?.messages) ? body!.messages : [];

  const history: HrAgentMessage[] = rawMessages
    .filter(
      (m): m is HrAgentMessage =>
        !!m &&
        typeof m === "object" &&
        (("role" in m && (m.role === "user" || m.role === "assistant")) as boolean) &&
        "content" in m &&
        typeof (m as { content: unknown }).content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-20);

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ message: "Pesan tidak valid." }, { status: 400 });
  }

  try {
    const reply = await chatWithHrAgent(history);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses permintaan HR Agent.";
    console.error("HR Agent error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
