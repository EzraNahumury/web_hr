"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ShiftItem = {
  code: string;
  label: string;
  startMin: number;
  checkoutStartMin: number;
  toleranceMin: number;
  isLibur: boolean;
  isSelectable: boolean;
  isSystem: boolean;
};

type Props = { initialShifts: ShiftItem[] };

function toTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function AdminShiftDefs({ initialShifts }: Props) {
  const router = useRouter();
  const [shifts, setShifts] = useState<ShiftItem[]>(initialShifts);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // form tambah
  const [label, setLabel] = useState("");
  const [masuk, setMasuk] = useState("08:00");
  const [pulang, setPulang] = useState("16:00");
  const [tol, setTol] = useState(5);

  // edit inline: code -> draft
  const [drafts, setDrafts] = useState<Record<string, { label: string; masuk: string; pulang: string; tol: number }>>({});

  function post(body: Record<string, unknown>, onOk?: () => void) {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/shift-defs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { message?: string; shifts?: ShiftItem[] };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal." });
          return;
        }
        if (data.shifts) setShifts(data.shifts);
        setMessage({ type: "success", text: data.message ?? "Tersimpan." });
        onOk?.();
        router.refresh(); // segarkan daftar shift di picker grup
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  function handleAdd() {
    if (!label.trim()) {
      setMessage({ type: "error", text: "Nama shift wajib diisi." });
      return;
    }
    if (toMin(pulang) <= toMin(masuk)) {
      setMessage({ type: "error", text: "Jam pulang harus setelah jam masuk." });
      return;
    }
    post(
      { action: "create", label: label.trim(), masukMin: toMin(masuk), pulangMin: toMin(pulang), toleranceMin: tol },
      () => {
        setLabel("");
        setMasuk("08:00");
        setPulang("16:00");
        setTol(5);
      },
    );
  }

  function draftOf(s: ShiftItem) {
    return (
      drafts[s.code] ?? {
        label: s.label,
        masuk: toTime(s.startMin),
        pulang: toTime(s.checkoutStartMin),
        tol: s.toleranceMin,
      }
    );
  }
  function setDraft(code: string, patch: Partial<{ label: string; masuk: string; pulang: string; tol: number }>) {
    setDrafts((d) => {
      const cur = d[code] ?? { label: "", masuk: "", pulang: "", tol: 5 };
      return { ...d, [code]: { ...cur, ...patch } };
    });
  }
  function saveEdit(s: ShiftItem) {
    const dr = draftOf(s);
    if (!dr.label.trim()) {
      setMessage({ type: "error", text: "Nama shift tidak boleh kosong." });
      return;
    }
    if (toMin(dr.pulang) <= toMin(dr.masuk)) {
      setMessage({ type: "error", text: "Jam pulang harus setelah jam masuk." });
      return;
    }
    post(
      { action: "update", code: s.code, label: dr.label.trim(), masukMin: toMin(dr.masuk), pulangMin: toMin(dr.pulang), toleranceMin: dr.tol },
      () =>
        setDrafts((d) => {
          const next = { ...d };
          delete next[s.code];
          return next;
        }),
    );
  }

  const custom = shifts.filter((s) => !s.isSystem);
  const builtin = shifts.filter((s) => s.isSystem);

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            message.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-[24px] border border-[#ead7ce] bg-white p-6 shadow-[0_10px_30px_rgba(96,45,34,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Daftar Shift</p>
        <p className="mt-1 text-sm text-[#7a6059]">
          Buat shift baru dengan jam sendiri. Jam masuk dipakai untuk hitung telat; jam pulang =
          batas pulang awal (PA). Shift bawaan terkunci (jam-nya inti sistem).
        </p>

        {/* Tambah shift custom */}
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6059]">Nama shift</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="mis. Sore (15:00 - 23:00)"
              className="mt-1 h-11 w-full rounded-2xl border border-[#e2cfc7] bg-white px-4 text-sm text-[#241716] outline-none focus:border-[#c97f5b]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6059]">Masuk</span>
            <input type="time" value={masuk} onChange={(e) => setMasuk(e.target.value)} className="mt-1 h-11 rounded-2xl border border-[#e2cfc7] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6059]">Pulang</span>
            <input type="time" value={pulang} onChange={(e) => setPulang(e.target.value)} className="mt-1 h-11 rounded-2xl border border-[#e2cfc7] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6059]">Toleransi</span>
            <input type="number" min={0} max={120} value={tol} onChange={(e) => setTol(Number(e.target.value))} className="mt-1 h-11 w-24 rounded-2xl border border-[#e2cfc7] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]" />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="h-11 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white transition hover:bg-[#a12228] disabled:opacity-50"
          >
            + Shift
          </button>
        </div>

        {/* Shift custom (editable) */}
        {custom.length > 0 ? (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9e7467]">Shift Custom</p>
            {custom.map((s) => {
              const dr = draftOf(s);
              const dirty =
                dr.label !== s.label ||
                toMin(dr.masuk) !== s.startMin ||
                toMin(dr.pulang) !== s.checkoutStartMin ||
                dr.tol !== s.toleranceMin;
              return (
                <div key={s.code} className="grid items-end gap-2 rounded-2xl border border-[#ead7ce] bg-[#fffaf8] p-3 sm:grid-cols-[1fr_auto_auto_auto_auto_auto]">
                  <input value={dr.label} onChange={(e) => setDraft(s.code, { label: e.target.value })} className="h-10 rounded-xl border border-[#e8d5cc] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]" />
                  <input type="time" value={dr.masuk} onChange={(e) => setDraft(s.code, { masuk: e.target.value })} className="h-10 rounded-xl border border-[#e8d5cc] bg-white px-2 text-sm text-[#241716] outline-none focus:border-[#c97f5b]" />
                  <input type="time" value={dr.pulang} onChange={(e) => setDraft(s.code, { pulang: e.target.value })} className="h-10 rounded-xl border border-[#e8d5cc] bg-white px-2 text-sm text-[#241716] outline-none focus:border-[#c97f5b]" />
                  <input type="number" min={0} max={120} value={dr.tol} onChange={(e) => setDraft(s.code, { tol: Number(e.target.value) })} className="h-10 w-20 rounded-xl border border-[#e8d5cc] bg-white px-2 text-sm text-[#241716] outline-none focus:border-[#c97f5b]" />
                  <button type="button" onClick={() => saveEdit(s)} disabled={isPending || !dirty} className="h-10 rounded-full bg-[#0d7f86] px-4 text-xs font-semibold text-white transition hover:bg-[#0b6b71] disabled:opacity-40">
                    Simpan
                  </button>
                  <button type="button" onClick={() => post({ action: "delete", code: s.code })} disabled={isPending} className="h-10 rounded-full border border-[#f1c0c0] px-3 text-xs font-semibold text-[#b94040] transition hover:bg-[#fff2f0] disabled:opacity-50">
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Shift bawaan (terkunci) */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9e7467]">Shift Bawaan (terkunci)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {builtin.map((s) => (
              <span key={s.code} className="rounded-full border border-[#e2cfc7] bg-white px-3 py-1.5 text-xs text-[#7a6059]">
                {s.label}
                {!s.isLibur ? (
                  <span className="ml-1 text-[#b08b91]">
                    · {toTime(s.startMin)}–{toTime(s.checkoutStartMin)}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
