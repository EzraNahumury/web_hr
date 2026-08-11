"use client";

import { useState, useTransition } from "react";

type Item = { id: number; value: string };

type Props = {
  category: string;
  categoryLabel: string;
  initialItems: Item[];
};

export default function AdminMasterLookup({ category, categoryLabel, initialItems }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [newValue, setNewValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function post(body: Record<string, unknown>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/master", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, ...body }),
        });
        const data = (await res.json()) as { message?: string; items?: Item[] };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal." });
          return;
        }
        if (data.items) setItems(data.items);
        setMessage({ type: "success", text: data.message ?? "Tersimpan." });
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  function handleAdd() {
    const v = newValue.trim();
    if (!v) {
      setMessage({ type: "error", text: "Isi nilai dulu." });
      return;
    }
    if (items.some((it) => it.value.toLowerCase() === v.toLowerCase())) {
      setMessage({ type: "error", text: "Nilai sudah ada." });
      return;
    }
    post({ action: "add", value: v });
    setNewValue("");
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
        <h2 className="text-lg font-semibold text-[#241716]">Tambah {categoryLabel}</h2>
        <p className="mt-1 text-sm text-[#7a6059]">
          Nilai baru akan langsung muncul di dropdown {categoryLabel} pada form Data Karyawan.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={`Nama ${categoryLabel} baru...`}
            className="h-11 min-w-[240px] flex-1 rounded-2xl border border-[#e2cfc7] bg-white px-4 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_3px_rgba(201,127,91,0.14)]"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="h-11 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(143,29,34,0.22)] transition hover:bg-[#7a181d] disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#ead7ce] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-[#efe0d8] bg-[#fff8f4] px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9e7467]">
            Daftar {categoryLabel} ({items.length})
          </h3>
        </div>
        {items.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#8a6f68]">Belum ada data.</p>
        ) : (
          <ul className="divide-y divide-[#f1e5de]">
            {items.map((it, i) => (
              <li key={it.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <span className="text-sm text-[#241716]">
                  <span className="mr-3 text-[#b49a90]">{i + 1}.</span>
                  {it.value}
                </span>
                <button
                  type="button"
                  onClick={() => post({ action: "delete", id: it.id })}
                  disabled={isPending}
                  className="rounded-full border border-[#f1c0c0] px-3 py-1.5 text-xs font-semibold text-[#b94040] transition hover:bg-[#fff2f0] disabled:opacity-50"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-[#9e7467]">
        Catatan: menghapus nilai di sini hanya menghapus opsi dari dropdown. Karyawan yang sudah
        memakai nilai tersebut tidak berubah datanya.
      </p>
    </div>
  );
}
