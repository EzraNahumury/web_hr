"use client";

import { useState, useTransition } from "react";

import { describeAttendanceEffect } from "@/lib/attendance-code-effects";

type Item = {
  id: number;
  code: string;
  label: string;
  status: string;
  sort: number;
};

type StatusOption = { value: string; label: string };

type Props = {
  initialItems: Item[];
  statusOptions: StatusOption[];
};

export default function AdminAttendanceCodes({ initialItems, statusOptions }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newStatus, setNewStatus] = useState(statusOptions[0]?.value ?? "hadir");
  const [drafts, setDrafts] = useState<Record<number, { label: string; status: string }>>({});
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function post(body: Record<string, unknown>, busy: number | "new", onOk?: () => void) {
    setMessage(null);
    setBusyId(busy);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/attendance-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { message?: string; items?: Item[] };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal." });
          return;
        }
        if (data.items) setItems(data.items);
        setMessage({ type: "success", text: data.message ?? "Tersimpan." });
        onOk?.();
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleAdd() {
    const code = newCode.trim().toUpperCase();
    const label = newLabel.trim();
    if (!code || !label) {
      setMessage({ type: "error", text: "Kode dan label wajib diisi." });
      return;
    }
    if (items.some((it) => it.code.toUpperCase() === code)) {
      setMessage({ type: "error", text: "Kode sudah ada." });
      return;
    }
    post({ action: "add", code, label, status: newStatus }, "new", () => {
      setNewCode("");
      setNewLabel("");
      setNewStatus(statusOptions[0]?.value ?? "hadir");
    });
  }

  function draftFor(it: Item) {
    return drafts[it.id] ?? { label: it.label, status: it.status };
  }

  function setDraft(id: number, patch: Partial<{ label: string; status: string }>) {
    setDrafts((d) => ({
      ...d,
      [id]: { ...(d[id] ?? items.find((i) => i.id === id)!), ...patch },
    }));
  }

  function handleSave(it: Item) {
    const d = draftFor(it);
    if (!d.label.trim()) {
      setMessage({ type: "error", text: "Label tidak boleh kosong." });
      return;
    }
    post({ action: "update", id: it.id, label: d.label.trim(), status: d.status }, it.id, () => {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[it.id];
        return next;
      });
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
        <h2 className="text-lg font-semibold text-[#241716]">Tambah Kode Absensi</h2>
        <p className="mt-1 text-sm text-[#7a6059]">
          Setiap kode wajib dipetakan ke satu kategori payroll agar perhitungan gaji tetap benar.
          Kode baru langsung muncul di dropdown &ldquo;Ubah Kode&rdquo; pada lembar absensi.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr_220px_auto]">
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            placeholder="Kode (mis. WFH)"
            maxLength={8}
            className="h-11 rounded-2xl border border-[#e2cfc7] bg-white px-4 text-sm font-semibold uppercase text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_3px_rgba(201,127,91,0.14)]"
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (mis. Work From Home)"
            className="h-11 rounded-2xl border border-[#e2cfc7] bg-white px-4 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_3px_rgba(201,127,91,0.14)]"
          />
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="h-11 rounded-2xl border border-[#e2cfc7] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]"
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busyId === "new"}
            className="h-11 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(143,29,34,0.22)] transition hover:bg-[#7a181d] disabled:opacity-50"
          >
            {busyId === "new" ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#ead7ce] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-[#efe0d8] bg-[#fff8f4] px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9e7467]">
            Daftar Kode Absensi ({items.length})
          </h3>
        </div>
        {items.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#8a6f68]">Belum ada kode.</p>
        ) : (
          <ul className="divide-y divide-[#f1e5de]">
            {items.map((it) => {
              const d = draftFor(it);
              const dirty = d.label !== it.label || d.status !== it.status;
              const busy = busyId === it.id;
              return (
                <li key={it.id} className="grid items-center gap-3 px-6 py-3 sm:grid-cols-[90px_1fr_220px_auto]">
                  <span className="inline-flex h-8 w-fit items-center rounded-lg bg-[#f3e7e0] px-3 text-sm font-bold text-[#8f1d22]">
                    {it.code}
                  </span>
                  <input
                    value={d.label}
                    onChange={(e) => setDraft(it.id, { label: e.target.value })}
                    className="h-10 rounded-xl border border-[#e8d5cc] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]"
                  />
                  <select
                    value={d.status}
                    onChange={(e) => setDraft(it.id, { status: e.target.value })}
                    className="h-10 rounded-xl border border-[#e8d5cc] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]"
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(it)}
                      disabled={busy || !dirty}
                      className="rounded-full bg-[#0d7f86] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0b6b71] disabled:opacity-40"
                    >
                      {busy ? "..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => post({ action: "delete", id: it.id }, it.id)}
                      disabled={busy}
                      className="rounded-full border border-[#f1c0c0] px-3 py-1.5 text-xs font-semibold text-[#b94040] transition hover:bg-[#fff2f0] disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                  <p className="text-xs text-[#9e7467] sm:col-span-4">
                    Efek gaji: <span className="font-semibold">{describeAttendanceEffect(it.code, d.status)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="rounded-2xl border border-[#f0dfd7] bg-[#fffaf6] px-5 py-4 text-xs leading-relaxed text-[#8a6f68]">
        <p className="font-semibold text-[#8f1d22]">Catatan penting</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Mengubah label aman — payroll membaca <strong>kode</strong> &amp; kategori, bukan label.</li>
          <li>Baris &ldquo;Efek gaji&rdquo; = perlakuan payroll sebenarnya untuk kode tersebut.</li>
          <li>
            Kategori <strong>Libur</strong> hanya <strong>DIBAYAR</strong> untuk kode{" "}
            <strong>LN, LP, C</strong>. Kode <strong>L</strong> &amp; <strong>&ldquo;-&rdquo;</strong>{" "}
            TIDAK dibayar (tanpa gaji pokok maupun uang makan).
          </li>
          <li>
            Perilaku khusus melekat pada kode: <strong>T</strong> (potongan telat Rp20.000/hari),{" "}
            <strong>PA</strong> (tanpa uang makan), <strong>H</strong> (½ hari). Kode baru mengikuti
            kategorinya (mis. &ldquo;hadir&rdquo; = seperti O; &ldquo;libur&rdquo; selain LN/LP/C = tidak dibayar).
          </li>
          <li>Menghapus kode hanya menghilangkan opsi dari dropdown; data absensi lama tidak berubah.</li>
        </ul>
      </div>
    </div>
  );
}
