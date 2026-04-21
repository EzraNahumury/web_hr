"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ReimbursementItem } from "@/lib/reimbursements";

type Props = {
  initialRows: ReimbursementItem[];
};

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string | number | null | undefined) {
  return toNumber(value).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export default function AdminReimbursementsManager({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [notes, setNotes] = useState<Record<number, string>>(
    Object.fromEntries(initialRows.map((row) => [row.id, row.adminNote ?? ""])),
  );
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const summary = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((row) => row.status === "pending").length,
      approvedAmount: rows.filter((row) => row.status === "approved").reduce((sum, row) => sum + toNumber(row.amount), 0),
    }),
    [rows],
  );

  function updateApproval(id: number, status: "approved" | "rejected") {
    setProcessingId(id);
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/reimbursements/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, note: notes[id]?.trim() || null }),
        });
        const result = (await response.json()) as { message?: string; reimbursement?: ReimbursementItem };
        if (!response.ok || !result.reimbursement) throw new Error(result.message || "Gagal memproses reimburse.");
        setRows((current) => current.map((row) => (row.id === id ? result.reimbursement! : row)));
        setMessage({ type: "success", text: result.message || "Approval reimburse berhasil diproses." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan." });
      } finally {
        setProcessingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[28px] border border-[#ead7ce] bg-white p-5"><p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Total</p><p className="mt-3 text-3xl font-semibold">{summary.total}</p></article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white p-5"><p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Pending</p><p className="mt-3 text-3xl font-semibold text-[#4657df]">{summary.pending}</p></article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-[#8f1d22] p-5 text-white"><p className="text-xs uppercase tracking-[0.22em] text-white/70">Approved</p><p className="mt-3 text-3xl font-semibold">Rp{formatMoney(summary.approvedAmount)}</p></article>
      </section>
      {message ? <div className={`rounded-2xl px-4 py-3 text-sm ${message.type === "success" ? "bg-[#f2fbf4] text-[#267344]" : "bg-[#fff4f4] text-[#b13232]"}`}>{message.text}</div> : null}
      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1380px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Nota</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Catatan</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const locked = row.status !== "pending";
                const processing = isPending && processingId === row.id;
                return (
                  <tr key={row.id} className="border-b border-[#f1e5de] align-top">
                    <td className="px-6 py-5"><p className="font-semibold text-[#241716]">{row.employeeName}</p><p className="mt-1 text-xs text-[#8a6f68]">{row.nip || "-"} | {row.role || "-"}</p></td>
                    <td className="px-6 py-5">{row.expenseDate}</td>
                    <td className="px-6 py-5">{row.category}</td>
                    <td className="px-6 py-5 font-semibold">Rp{formatMoney(row.amount)}</td>
                    <td className="px-6 py-5"><a href={row.receiptPath} target="_blank" className="font-semibold text-[#8f1d22]">Lihat nota</a></td>
                    <td className="px-6 py-5">{row.status}</td>
                    <td className="px-6 py-5"><input value={notes[row.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))} disabled={locked} className="h-11 w-[240px] rounded-xl border border-[#e3d5cf] px-3 disabled:bg-[#f5f1ef]" /></td>
                    <td className="px-6 py-5">
                      {locked ? <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a18a84]">Final</span> : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => updateApproval(row.id, "approved")} disabled={processing} className="h-10 rounded-2xl bg-[#17603b] px-4 text-sm font-semibold text-white disabled:opacity-60">Approve</button>
                          <button type="button" onClick={() => updateApproval(row.id, "rejected")} disabled={processing} className="h-10 rounded-2xl bg-[#b92f2f] px-4 text-sm font-semibold text-white disabled:opacity-60">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
