"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { KaryawanAksesOption } from "@/lib/jadwal-karyawan";

type Props = {
  allKaryawan: KaryawanAksesOption[];
  initialGranted: KaryawanAksesOption[];
};

export default function JadwalAksesManager({ allKaryawan, initialGranted }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const grantedIds = useMemo(() => new Set(initialGranted.map((g) => g.id)), [initialGranted]);
  const options = useMemo(
    () => allKaryawan.filter((k) => !grantedIds.has(k.id)),
    [allKaryawan, grantedIds],
  );

  async function submit(karyawanId: number, granted: boolean) {
    setBusyId(karyawanId);
    setFeedback(null);
    try {
      const res = await fetch("/api/spv/jadwal-akses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karyawanId, granted }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setFeedback({ type: "error", text: data.message || "Gagal memproses." });
        return;
      }
      setFeedback({ type: "success", text: data.message || "Tersimpan." });
      setSelected("");
      router.refresh();
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-[#ead7ce] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Perizinan Akses</p>
        <p className="mt-1 text-sm text-[#7a6059]">
          Pilih karyawan untuk diberi akses. Karyawan yang diizinkan akan melihat menu{" "}
          <b>Bagan Set Jadwal</b> &amp; <b>Master Set Jadwal</b> di akunnya, sehingga bisa mengisi &amp; update jadwal.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[240px]">
            <span className="block text-[13px] font-semibold text-[#3c2824]">Nama Karyawan</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#e8d5cc] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]"
            >
              <option value="">Pilih karyawan…</option>
              {options.map((k) => (
                <option key={k.id} value={String(k.id)}>
                  {k.nama}
                  {k.jabatan ? ` — ${k.jabatan}` : ""}
                  {k.penempatan ? ` (${k.penempatan})` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!selected || busyId !== null}
            onClick={() => submit(Number(selected), true)}
            className="h-11 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white transition hover:bg-[#a12228] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Beri Akses
          </button>
        </div>
        {feedback ? (
          <p className={`mt-3 text-sm ${feedback.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
            {feedback.text}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#ead7ce] bg-white">
        <div className="border-b border-[#f1e0da] px-6 py-3">
          <p className="text-sm font-semibold text-[#241716]">
            Karyawan dengan Akses ({initialGranted.length})
          </p>
        </div>
        {initialGranted.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#8a6f68]">Belum ada karyawan yang diberi akses.</p>
        ) : (
          <ul className="divide-y divide-[#f4ebe6]">
            {initialGranted.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div>
                  <div className="font-semibold text-[#241716]">{k.nama}</div>
                  <div className="text-xs text-[#8a6f68]">
                    {k.jabatan || "-"}
                    {k.penempatan ? ` · ${k.penempatan}` : ""}
                    {k.noKaryawan ? ` · ${k.noKaryawan}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => submit(k.id, false)}
                  className="h-9 rounded-lg border border-[#e6bcbc] px-4 text-xs font-semibold text-[#b92f2f] transition hover:bg-[#fff2f2] disabled:opacity-50"
                >
                  Cabut
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
