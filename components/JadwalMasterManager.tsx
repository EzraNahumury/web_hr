"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { JadwalMasterItem, JadwalShift, TokoGudangKaryawan } from "@/lib/jadwal-karyawan";
import { getShiftOptionsFor, SHIFT_COLOR, type ShiftOption } from "@/lib/jadwal-shift-options";

type Props = {
  karyawanList: TokoGudangKaryawan[];
  initialMaster: JadwalMasterItem[];
  basePath?: string; // untuk endpoint API (default /api/spv/jadwal-master)
};

const HARI: { hari: number; label: string; short: string }[] = [
  { hari: 1, label: "Senin", short: "Sen" },
  { hari: 2, label: "Selasa", short: "Sel" },
  { hari: 3, label: "Rabu", short: "Rab" },
  { hari: 4, label: "Kamis", short: "Kam" },
  { hari: 5, label: "Jumat", short: "Jum" },
  { hari: 6, label: "Sabtu", short: "Sab" },
  { hari: 7, label: "Minggu", short: "Min" },
];

function buildMap(rows: JadwalMasterItem[]) {
  const m = new Map<string, JadwalShift>();
  for (const r of rows) m.set(`${r.karyawanId}|${r.hari}`, r.shift);
  return m;
}

export default function JadwalMasterManager({ karyawanList, initialMaster }: Props) {
  const router = useRouter();
  const [masterMap, setMasterMap] = useState<Map<string, JadwalShift>>(() => buildMap(initialMaster));
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return karyawanList;
    return karyawanList.filter((k) =>
      [k.nama, k.noKaryawan ?? "", k.penempatan, k.subDivisi ?? "", k.jabatan ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [karyawanList, search]);

  function setCell(karyawanId: number, hari: number, value: ShiftOption) {
    setMasterMap((prev) => {
      const next = new Map(prev);
      const key = `${karyawanId}|${hari}`;
      if (value === "") next.delete(key);
      else next.set(key, value);
      return next;
    });
    setDirty(true);
  }

  function fillRow(karyawanId: number, value: ShiftOption) {
    setMasterMap((prev) => {
      const next = new Map(prev);
      for (const d of HARI) {
        const key = `${karyawanId}|${d.hari}`;
        if (value === "") next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
    setDirty(true);
  }

  const filledCount = masterMap.size;

  async function handleSave() {
    setIsSaving(true);
    setToast(null);
    try {
      const initialMap = buildMap(initialMaster);
      const entries: { karyawanId: number; hari: number; shift: JadwalShift }[] = [];
      const removeKeys: { karyawanId: number; hari: number }[] = [];
      const seen = new Set<string>();

      for (const [key, shift] of masterMap.entries()) {
        seen.add(key);
        const [kId, h] = key.split("|");
        if (initialMap.get(key) !== shift) {
          entries.push({ karyawanId: Number(kId), hari: Number(h), shift });
        }
      }
      for (const key of initialMap.keys()) {
        if (!seen.has(key)) {
          const [kId, h] = key.split("|");
          removeKeys.push({ karyawanId: Number(kId), hari: Number(h) });
        }
      }

      const res = await fetch("/api/spv/jadwal-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, removeKeys }),
      });
      const data = (await res.json()) as { message?: string; distributed?: number };
      if (!res.ok) {
        setToast({ type: "error", message: data.message || "Gagal menyimpan master jadwal." });
        return;
      }
      setToast({
        type: "success",
        message: `Master tersimpan & otomatis diterapkan ke Bagan periode berjalan${
          typeof data.distributed === "number" ? ` (${data.distributed} sel terisi)` : ""
        }. Cek Bagan Set Jadwal untuk edit/tukar shift bila perlu.`,
      });
      setDirty(false);
      router.refresh();
    } catch {
      setToast({ type: "error", message: "Terjadi kesalahan jaringan." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#ead7ce] bg-white px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Master Jadwal Mingguan</p>
          <p className="mt-1 text-sm text-[#7a6059]">
            Set 1 pola mingguan (Senin–Minggu). Nanti didistribusikan ke bagan 1 bulan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#faf3ef] px-4 py-2 text-sm text-[#7a6059]">
            Karyawan: <b className="text-[#241716]">{karyawanList.length}</b> · Terisi:{" "}
            <b className="text-[#0d7f86]">{filledCount}</b>
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !dirty}
            className="h-11 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(143,29,34,0.25)] transition hover:bg-[#a12228] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan Master"}
          </button>
        </div>
      </div>

      {toast ? (
        <div
          className={
            toast.type === "success"
              ? "rounded-2xl border border-[#bbe7d6] bg-[#f0fbf6] px-5 py-3 text-sm text-[#136c4c]"
              : "rounded-2xl border border-[#f0c4c4] bg-[#fff4f4] px-5 py-3 text-sm text-[#b13232]"
          }
        >
          {toast.message}
        </div>
      ) : null}

      <div className="rounded-[24px] border border-[#ead7ce] bg-white px-4 py-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIP, penempatan…"
          className="h-11 w-full rounded-xl border border-[#ead7ce] bg-[#fffaf8] px-4 text-sm text-[#2d1b18] outline-none focus:border-[#8f1d22]"
        />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#ead7ce] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#fff3ed] text-xs uppercase tracking-[0.12em] text-[#8f1d22]">
                <th className="sticky left-0 z-10 min-w-[210px] bg-[#fff3ed] px-4 py-3 text-left">Karyawan</th>
                <th className="min-w-[150px] px-3 py-3 text-left">Quick Fill</th>
                {HARI.map((d) => (
                  <th key={d.hari} className="min-w-[120px] px-2 py-3 text-center">
                    {d.short}
                    <div className="text-[10px] font-normal normal-case text-[#b08b91]">{d.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#8a6f68]">
                    Tidak ada karyawan Toko/Gudang/JNE/Media aktif.
                  </td>
                </tr>
              ) : (
                filtered.map((k) => {
                  const options = getShiftOptionsFor(k.penempatan);
                  return (
                    <tr key={k.id} className="border-b border-[#f4ebe6]">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2">
                        <div className="font-semibold text-[#241716]">{k.nama}</div>
                        <div className="text-[11px] text-[#8a6f68]">
                          {k.penempatan}
                          {k.subDivisi ? ` · ${k.subDivisi}` : ""}
                          {k.jabatan ? ` · ${k.jabatan}` : ""}
                        </div>
                        <div className="text-[11px] text-[#b08b91]">{k.noKaryawan}</div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            fillRow(k.id, e.target.value as ShiftOption);
                            e.currentTarget.value = "";
                          }}
                          className="h-9 w-full rounded-lg border border-[#e8d5cc] bg-white px-2 text-xs text-[#241716] outline-none focus:border-[#c97f5b]"
                        >
                          <option value="">Isi semua…</option>
                          {options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      {HARI.map((d) => {
                        const value = masterMap.get(`${k.id}|${d.hari}`) ?? "";
                        return (
                          <td key={d.hari} className="px-1 py-2">
                            <select
                              value={value}
                              onChange={(e) => setCell(k.id, d.hari, e.target.value as ShiftOption)}
                              className={`h-9 w-full rounded-lg border px-1.5 text-xs outline-none focus:border-[#c97f5b] ${
                                value ? SHIFT_COLOR[value as JadwalShift] : "border-[#e8d5cc] bg-white text-[#241716]"
                              }`}
                            >
                              {options.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
