"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ContractReturnItem } from "@/lib/contract-returns";

type Props = {
  initialRows: ContractReturnItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateLabel(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

export default function AdminContractReturnsManager({ initialRows }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [markRow, setMarkRow] = useState<ContractReturnItem | null>(null);
  const [markNominal, setMarkNominal] = useState("");
  const [markTanggal, setMarkTanggal] = useState("");
  const [markCatatan, setMarkCatatan] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.nip.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q),
    );
  }, [initialRows, query]);

  const stats = useMemo(() => {
    const total = initialRows.length;
    const returnedCount = initialRows.filter((r) => r.returned).length;
    const totalReturnValue = initialRows.reduce((s, r) => s + r.returnAmount, 0);
    const outstandingValue = initialRows
      .filter((r) => !r.returned)
      .reduce((s, r) => s + r.returnAmount, 0);
    return { total, returnedCount, totalReturnValue, outstandingValue };
  }, [initialRows]);

  function openMark(row: ContractReturnItem) {
    setMarkRow(row);
    setMarkNominal(String(Math.round(row.returnAmount)));
    setMarkTanggal(todayJakarta());
    setMarkCatatan("");
    setMessage(null);
  }

  function submitMark() {
    if (!markRow) return;
    const nominal = Number(markNominal.replace(/[^\d]/g, "")) || 0;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/contract-returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark",
            employeeId: markRow.employeeId,
            nominal,
            tanggal: markTanggal,
            catatan: markCatatan,
          }),
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal menyimpan." });
          return;
        }
        setMessage({ type: "success", text: data.message ?? "Tersimpan." });
        setMarkRow(null);
        router.refresh();
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  function unmark(row: ContractReturnItem) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/contract-returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unmark", employeeId: row.employeeId }),
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal membatalkan." });
          return;
        }
        setMessage({ type: "success", text: data.message ?? "Dibatalkan." });
        router.refresh();
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div
          className={
            message.type === "success"
              ? "rounded-2xl border border-[#bbe7d6] bg-[#f0fbf6] px-5 py-3 text-sm text-[#136c4c]"
              : "rounded-2xl border border-[#f0c4c4] bg-[#fff4f4] px-5 py-3 text-sm text-[#b13232]"
          }
        >
          {message.text}
        </div>
      ) : null}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Karyawan", value: String(stats.total) },
          { label: "Sudah Dikembalikan", value: `${stats.returnedCount} / ${stats.total}` },
          { label: "Total Nilai Pengembalian", value: formatCurrency(stats.totalReturnValue) },
          { label: "Belum Dikembalikan", value: formatCurrency(stats.outstandingValue) },
        ].map((s) => (
          <div key={s.label} className="rounded-[24px] border border-[#ead7ce] bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16f63]">{s.label}</p>
            <p className="mt-2 text-xl font-semibold text-[#241716]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="rounded-[24px] border border-[#ead7ce] bg-white px-4 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, NIP, jabatan, departemen..."
          className="h-11 w-full rounded-xl border border-[#ead7ce] bg-[#fffaf8] px-4 text-sm text-[#2d1b18] outline-none focus:border-[#0d7f86]"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[24px] border border-[#ead7ce] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#19d7df] text-left text-xs font-semibold uppercase tracking-[0.1em] text-[#062e31]">
                <th className="border border-[#a8ebef] px-3 py-3">No</th>
                <th className="border border-[#a8ebef] px-3 py-3">Nama</th>
                <th className="border border-[#a8ebef] px-3 py-3">Jabatan</th>
                <th className="border border-[#a8ebef] px-3 py-3">Status</th>
                <th className="border border-[#a8ebef] px-3 py-3 text-right">Sudah Terpotong</th>
                <th className="border border-[#a8ebef] px-3 py-3 text-right">Sisa</th>
                <th className="border border-[#a8ebef] px-3 py-3 text-right">Nilai Pengembalian</th>
                <th className="border border-[#a8ebef] px-3 py-3">Pengembalian</th>
                <th className="border border-[#a8ebef] px-3 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-[#87a6a8]">
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.employeeId} className="text-[#3a2b27] odd:bg-white even:bg-[#fcfefe]">
                    <td className="border border-[#d7ecee] px-3 py-3 text-center">{i + 1}</td>
                    <td className="border border-[#d7ecee] px-3 py-3">
                      <div className="font-semibold uppercase text-[#241716]">{r.name}</div>
                      <div className="text-xs text-[#8a6f68]">{r.nip}</div>
                    </td>
                    <td className="border border-[#d7ecee] px-3 py-3">
                      {r.role}
                      <div className="text-xs capitalize text-[#8a6f68]">{r.employmentStatus}</div>
                    </td>
                    <td className="border border-[#d7ecee] px-3 py-3">
                      {r.status === "lunas" ? (
                        <span className="inline-flex rounded-full bg-[#e7f8ef] px-2.5 py-1 text-xs font-semibold text-[#136c4c]">
                          Lunas
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#fff1e6] px-2.5 py-1 text-xs font-semibold text-[#a8531a]">
                          Belum Lunas
                        </span>
                      )}
                    </td>
                    <td className="border border-[#d7ecee] px-3 py-3 text-right tabular-nums">{formatCurrency(r.deductedTotal)}</td>
                    <td className="border border-[#d7ecee] px-3 py-3 text-right tabular-nums">{formatCurrency(r.remaining)}</td>
                    <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold tabular-nums text-[#0d7f86]">{formatCurrency(r.returnAmount)}</td>
                    <td className="border border-[#d7ecee] px-3 py-3">
                      {r.returned ? (
                        <div>
                          <span className="inline-flex rounded-full bg-[#e7f8ef] px-2.5 py-1 text-xs font-semibold text-[#136c4c]">
                            Sudah
                          </span>
                          <div className="mt-1 text-xs text-[#8a6f68]">
                            {formatCurrency(r.returnedAmount ?? 0)} • {formatDateLabel(r.returnedDate)}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#f3ecea] px-2.5 py-1 text-xs font-semibold text-[#7a6059]">
                          Belum
                        </span>
                      )}
                    </td>
                    <td className="border border-[#d7ecee] px-3 py-3">
                      {r.returned ? (
                        <button
                          type="button"
                          onClick={() => unmark(r)}
                          disabled={isPending}
                          className="inline-flex h-9 items-center rounded-xl border border-[#c8716d] px-3 text-xs font-semibold text-[#8f1d22] hover:bg-[#fff2ec] disabled:opacity-60"
                        >
                          Batalkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openMark(r)}
                          disabled={isPending}
                          className="inline-flex h-9 items-center rounded-xl bg-[#0d7f86] px-3 text-xs font-semibold text-white hover:bg-[#0a6a70] disabled:opacity-60"
                        >
                          Tandai Dikembalikan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark modal */}
      {markRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-[#0d7f86] px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Tandai Sudah Dikembalikan</h3>
              <p className="mt-0.5 text-sm text-white/80">{markRow.name}</p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <label className="block space-y-1.5">
                <span className="block text-[13px] font-semibold text-[#466668]">Nominal Pengembalian (Rp)</span>
                <input
                  value={markNominal}
                  onChange={(e) => setMarkNominal(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  className="h-12 w-full rounded-2xl border border-[#d5e9ea] bg-white px-4 text-[#173033] outline-none focus:border-[#0d7f86] focus:shadow-[0_0_0_4px_rgba(13,127,134,0.16)]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="block text-[13px] font-semibold text-[#466668]">Tanggal Pengembalian</span>
                <input
                  type="date"
                  value={markTanggal}
                  onChange={(e) => setMarkTanggal(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#d5e9ea] bg-white px-4 text-[#173033] outline-none focus:border-[#0d7f86]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="block text-[13px] font-semibold text-[#466668]">Catatan (opsional)</span>
                <input
                  value={markCatatan}
                  onChange={(e) => setMarkCatatan(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#d5e9ea] bg-white px-4 text-[#173033] outline-none focus:border-[#0d7f86]"
                  placeholder="mis. transfer BCA"
                />
              </label>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMarkRow(null)}
                  className="h-11 flex-1 rounded-xl border border-[#ead7ce] text-sm font-semibold text-[#8f1d22] hover:bg-[#fff2ec]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitMark}
                  disabled={isPending}
                  className="h-11 flex-1 rounded-xl bg-[#0d7f86] text-sm font-semibold text-white hover:bg-[#0a6a70] disabled:opacity-60"
                >
                  {isPending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
