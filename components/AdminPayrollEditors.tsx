"use client";

import { useState, useTransition } from "react";

type AdminOption = { id: number; name: string; email: string };

type Props = {
  admins: AdminOption[];
  initialEditors: string[];
};

export default function AdminPayrollEditors({ admins, initialEditors }: Props) {
  const [editors, setEditors] = useState<string[]>(
    initialEditors.map((e) => e.trim().toLowerCase()),
  );
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggle(email: string, currentlyEditor: boolean) {
    const normalized = email.trim().toLowerCase();
    setMessage(null);
    setPendingEmail(normalized);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/payroll-editors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: currentlyEditor ? "remove" : "add", email: normalized }),
        });
        const data = (await res.json()) as { message?: string; editors?: string[] };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal." });
          return;
        }
        if (data.editors) setEditors(data.editors.map((e) => e.trim().toLowerCase()));
        setMessage({ type: "success", text: data.message ?? "Tersimpan." });
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      } finally {
        setPendingEmail(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            message.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[#ead7ce] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-semibold text-[#241716]">Hak Tulis Payroll</h2>
        <p className="mt-1 text-sm text-[#7a6059]">
          Aktifkan akun admin yang boleh mengedit, menyimpan, menghapus, dan input omzet di Summary
          Payroll. Admin lain tetap bisa melihat (read-only). Minimal 1 akun harus aktif.
        </p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#ead7ce] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-[#efe0d8] bg-[#fff8f4] px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9e7467]">
            Akun Admin ({admins.length}) &middot; Aktif ({editors.length})
          </h3>
        </div>
        {admins.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#8a6f68]">Belum ada akun admin.</p>
        ) : (
          <ul className="divide-y divide-[#f1e5de]">
            {admins.map((a) => {
              const normalized = a.email.trim().toLowerCase();
              const isEditor = editors.includes(normalized);
              const isBusy = pendingEmail === normalized;
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#241716]">{a.name}</p>
                    <p className="truncate text-xs text-[#8a6f68]">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold ${
                        isEditor ? "text-[#17603b]" : "text-[#b49a90]"
                      }`}
                    >
                      {isEditor ? "Bisa edit" : "Read-only"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(a.email, isEditor)}
                      disabled={isBusy}
                      aria-pressed={isEditor}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                        isEditor ? "bg-[#0d7f86]" : "bg-[#d9c7bf]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          isEditor ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-[#9e7467]">
        Catatan: daftar akun di atas diambil dari menu Kelola Admin. Untuk menambah akun admin baru,
        buat dulu akunnya di sana.
      </p>
    </div>
  );
}
