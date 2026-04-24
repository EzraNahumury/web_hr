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

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
      Pending
    </span>
  );
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
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const pendingRows = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const historyRows = useMemo(
    () => rows.filter((r) => r.status !== "pending").sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [rows],
  );

  const summary = useMemo(
    () => ({
      total: rows.length,
      pending: pendingRows.length,
      approvedAmount: rows
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => sum + toNumber(r.amount), 0),
    }),
    [rows, pendingRows],
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
        const result = (await response.json()) as {
          message?: string;
          reimbursement?: ReimbursementItem;
        };
        if (!response.ok || !result.reimbursement)
          throw new Error(result.message || "Gagal memproses reimburse.");
        setRows((current) =>
          current.map((row) => (row.id === id ? result.reimbursement! : row)),
        );
        setMessage({ type: "success", text: result.message || "Approval reimburse berhasil." });
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan.",
        });
      } finally {
        setProcessingId(null);
      }
    });
  }

  const theadCls =
    "border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]";
  const thCls = "px-5 py-4 font-semibold";
  const tdCls = "px-5 py-4 align-top text-sm";

  function ReimburseTable({ tableRows, showActions }: { tableRows: ReimbursementItem[]; showActions: boolean }) {
    if (tableRows.length === 0) {
      return (
        <div className="px-6 py-14 text-center text-sm text-[#8a6f68]">
          {showActions ? "Tidak ada reimburse yang menunggu approval." : "Belum ada riwayat reimburse."}
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Karyawan</th>
              <th className={thCls}>Tgl Biaya</th>
              <th className={thCls}>Kategori</th>
              <th className={thCls}>Keterangan</th>
              <th className={thCls}>Nominal</th>
              <th className={thCls}>Nota</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Catatan Admin</th>
              {showActions && <th className={thCls}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              const processing = isPending && processingId === row.id;
              return (
                <tr key={row.id} className="border-b border-[#f1e5de]">
                  <td className={tdCls}>
                    <p className="font-semibold text-[#241716]">{row.employeeName}</p>
                    <p className="mt-0.5 text-xs text-[#8a6f68]">
                      {row.nip || "—"} · {row.role || "—"}
                    </p>
                  </td>
                  <td className={tdCls}>{row.expenseDate}</td>
                  <td className={tdCls}>{row.category}</td>
                  <td className={`${tdCls} max-w-[200px] text-[#5a3a30]`}>
                    {row.description || "—"}
                  </td>
                  <td className={`${tdCls} font-semibold`}>Rp{formatMoney(row.amount)}</td>
                  <td className={tdCls}>
                    <a
                      href={row.receiptPath}
                      target="_blank"
                      className="font-semibold text-[#8f1d22] hover:underline"
                    >
                      Lihat nota
                    </a>
                  </td>
                  <td className={tdCls}>
                    <StatusBadge status={row.status} />
                  </td>
                  <td className={tdCls}>
                    {showActions ? (
                      <input
                        value={notes[row.id] ?? ""}
                        onChange={(e) =>
                          setNotes((cur) => ({ ...cur, [row.id]: e.target.value }))
                        }
                        placeholder="Catatan (opsional)"
                        className="h-10 w-[200px] rounded-xl border border-[#e3d5cf] px-3 text-sm"
                      />
                    ) : (
                      <span className="text-[#5a3a30]">{row.adminNote || "—"}</span>
                    )}
                  </td>
                  {showActions && (
                    <td className={tdCls}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateApproval(row.id, "approved")}
                          disabled={processing}
                          className="h-9 rounded-xl bg-[#17603b] px-4 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updateApproval(row.id, "rejected")}
                          disabled={processing}
                          className="h-9 rounded-xl bg-[#b92f2f] px-4 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Total</p>
          <p className="mt-3 text-3xl font-semibold">{summary.total}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Menunggu</p>
          <p className="mt-3 text-3xl font-semibold text-[#4657df]">{summary.pending}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-[#8f1d22] p-5 text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70">Total Approved</p>
          <p className="mt-3 text-3xl font-semibold">Rp{formatMoney(summary.approvedAmount)}</p>
        </article>
      </section>

      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${message.type === "success" ? "bg-[#f2fbf4] text-[#267344]" : "bg-[#fff4f4] text-[#b13232]"}`}
        >
          {message.text}
        </div>
      ) : null}

      {/* Tab section */}
      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        {/* Tabs */}
        <div className="flex border-b border-[#ead7ce]">
          <button
            onClick={() => setActiveTab("pending")}
            className={`relative px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === "pending"
                ? "text-[#8f1d22]"
                : "text-[#9e7467] hover:text-[#5a3028]"
            }`}
          >
            Menunggu Approval
            {pendingRows.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#8f1d22] text-[10px] font-bold text-white">
                {pendingRows.length}
              </span>
            )}
            {activeTab === "pending" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8f1d22]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`relative px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === "history"
                ? "text-[#8f1d22]"
                : "text-[#9e7467] hover:text-[#5a3028]"
            }`}
          >
            Riwayat
            {historyRows.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ead7ce] px-1.5 text-[10px] font-bold text-[#8f1d22]">
                {historyRows.length}
              </span>
            )}
            {activeTab === "history" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8f1d22]" />
            )}
          </button>
        </div>

        {activeTab === "pending" ? (
          <ReimburseTable tableRows={pendingRows} showActions={true} />
        ) : (
          <ReimburseTable tableRows={historyRows} showActions={false} />
        )}
      </section>
    </div>
  );
}
