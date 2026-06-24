"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Berapa jumlah karyawan aktif saat ini?",
  "Siapa saja yang paling sering terlambat bulan ini?",
  "Total gaji bersih payroll periode terakhir berapa?",
  "Daftar karyawan yang masih punya pinjaman berjalan.",
];

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}

// Render markdown sederhana: bold, list, baris baru.
function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    const html = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return (
      <p
        key={idx}
        className={line.trim() === "" ? "h-2" : "leading-relaxed"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export default function HrAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/hr-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const raw = await response.text();
      let result: { reply?: string; message?: string };
      try {
        result = JSON.parse(raw) as { reply?: string; message?: string };
      } catch {
        // Respons bukan JSON (mis. halaman HTML 504 dari proxy saat timeout).
        throw new Error(
          response.status === 504 || response.status === 502
            ? "Permintaan terlalu lama diproses (timeout). Coba pertanyaan yang lebih spesifik atau ulangi lagi."
            : "Server sedang sibuk. Coba ulangi sebentar lagi.",
        );
      }
      if (!response.ok || !result.reply) {
        throw new Error(result.message || "Gagal mendapatkan jawaban.");
      }
      setMessages((current) => [...current, { role: "assistant", content: result.reply! }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    send(input);
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col overflow-hidden rounded-[28px] border border-[#ead9d6] bg-white shadow-[0_18px_50px_rgba(96,45,34,0.08)]">
      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#8f1d22_0%,#c65d4a_100%)] text-white shadow-[0_14px_30px_rgba(143,29,34,0.28)]">
              <BotIcon />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#241716]">HR Agent</h2>
              <p className="mt-2 text-sm leading-6 text-[#7a6059]">
                Tanya apa saja soal data karyawan, absensi, lembur, pinjaman, dan payroll.
                Jawaban diambil langsung dari database.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-2xl border border-[#ead7ce] bg-[#fff8f4] px-4 py-3 text-left text-sm text-[#5a443d] transition hover:border-[#c8716d] hover:bg-white hover:text-[#8f1d22]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8f1d22_0%,#c65d4a_100%)] text-white">
                  <BotIcon />
                </div>
              ) : null}
              <div
                className={
                  msg.role === "user"
                    ? "max-w-[78%] rounded-3xl rounded-br-lg bg-[#8f1d22] px-4 py-3 text-sm text-white"
                    : "max-w-[78%] rounded-3xl rounded-bl-lg border border-[#eee0da] bg-[#fffaf7] px-4 py-3 text-sm text-[#2d1b18]"
                }
              >
                {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
              </div>
            </div>
          ))
        )}

        {isLoading ? (
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8f1d22_0%,#c65d4a_100%)] text-white">
              <BotIcon />
            </div>
            <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg border border-[#eee0da] bg-[#fffaf7] px-4 py-4">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#c8716d] [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#c8716d] [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#c8716d]" />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-t border-[#f2c4c4] bg-[#fff4f4] px-6 py-3 text-sm text-[#b13232]">{error}</div>
      ) : null}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-[#eddad1] bg-[#fffdfc] p-4 sm:px-6">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Tanyakan sesuatu ke HR Agent..."
            disabled={isLoading}
            className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-sm text-[#2d1b18] outline-none transition focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#8f1d22] text-white shadow-[0_8px_20px_rgba(143,29,34,0.2)] transition hover:bg-[#a12228] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Kirim"
          >
            <SendIcon />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-[#a3837b]">
          HR Agent menjawab dari data database. Periksa kembali untuk keputusan penting.
        </p>
      </form>
    </div>
  );
}
