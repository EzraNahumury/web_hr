"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { BusinessTripItem } from "@/lib/business-trips";

type Props = {
  initialRows: BusinessTripItem[];
};

function StatusBadge({ status }: { status: BusinessTripItem["status"] }) {
  const styles =
    status === "approved"
      ? "bg-[#eaf8ef] text-[#1f8f4c]"
      : status === "rejected"
        ? "bg-[#fff1f1] text-[#c63838]"
        : "bg-[#eef2ff] text-[#4a5dff]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

export default function AdminBusinessTripApprovals({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [notes, setNotes] = useState<Record<number, string>>(
    Object.fromEntries(initialRows.map((row) => [row.id, row.adminNote ?? ""])),
  );
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pendingRows = useMemo(() => rows.filter((row) => row.status === "pending"), [rows]);
  const historyRows = useMemo(
    () => rows.filter((row) => row.status !== "pending").sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [rows],
  );
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  function updateApproval(id: number, status: "approved" | "rejected") {
    setProcessingId(id);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/business-trips/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, note: notes[id]?.trim() || null }),
        });
        const result = (await response.json()) as { message?: string; businessTrip?: BusinessTripItem };
        if (!response.ok || !result.businessTrip) {
          throw new Error(result.message || "Gagal memproses perjalanan dinas.");
        }

        setRows((current) => current.map((row) => (row.id === id ? result.businessTrip! : row)));
        setMessage({ type: "success", text: result.message || "Approval perjalanan dinas berhasil diproses." });
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses perjalanan dinas.",
        });
      } finally {
        setProcessingId(null);
      }
    });
  }

  function Table({ tableRows, showActions }: { tableRows: BusinessTripItem[]; showActions: boolean }) {
    if (!tableRows.length) {
      return (
        <div className="px-6 py-12 text-center text-sm text-[#8a6f68]">
          {showActions ? "Tidak ada pengajuan dinas yang menunggu approval." : "Belum ada riwayat approval perjalanan dinas."}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Karyawan</th>
              <th className="px-6 py-4">Tanggal Dinas</th>
              <th className="px-6 py-4">Surat</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Catatan Karyawan</th>
              <th className="px-6 py-4">Catatan Admin</th>
              {showActions ? <th className="px-6 py-4">Aksi</th> : null}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              const processing = isPending && processingId === row.id;
              return (
                <tr key={row.id} className="border-b border-[#f1e5de]">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[#241716]">{row.employeeName}</p>
                    <p className="mt-1 text-xs text-[#8a6f68]">
                      {row.nip || "-"} | {row.role || "-"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {row.startDate} s/d {row.endDate}
                    <p className="mt-1 text-xs text-[#8a6f68]">Auto hadir: hari mulai s/d selesai</p>
                  </td>
                  <td className="px-6 py-4">
                    <a href={row.letterPath} target="_blank" className="font-semibold text-[#8f1d22]">
                      Lihat surat
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-6 py-4">{row.note || "-"}</td>
                  <td className="px-6 py-4">
                    {showActions ? (
                      <input
                        value={notes[row.id] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [row.id]: event.target.value,
                          }))
                        }
                        placeholder="Catatan admin (opsional)"
                        className="h-10 w-[220px] rounded-xl border border-[#e3d5cf] px-3 text-sm"
                      />
                    ) : (
                      row.adminNote || "-"
                    )}
                  </td>
                  {showActions ? (
                    <td className="px-6 py-4">
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
                  ) : null}
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
      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            message.type === "success" ? "bg-[#f2fbf4] text-[#267344]" : "bg-[#fff4f4] text-[#b13232]"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <div className="flex border-b border-[#ead7ce]">
          <button
            onClick={() => setActiveTab("pending")}
            className={`relative px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === "pending" ? "text-[#8f1d22]" : "text-[#9e7467] hover:text-[#5a3028]"
            }`}
          >
            Menunggu Approval
            {pendingRows.length > 0 ? (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#8f1d22] text-[10px] font-bold text-white">
                {pendingRows.length}
              </span>
            ) : null}
            {activeTab === "pending" ? <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8f1d22]" /> : null}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`relative px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === "history" ? "text-[#8f1d22]" : "text-[#9e7467] hover:text-[#5a3028]"
            }`}
          >
            Riwayat
            {historyRows.length > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ead7ce] px-1.5 text-[10px] font-bold text-[#8f1d22]">
                {historyRows.length}
              </span>
            ) : null}
            {activeTab === "history" ? <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8f1d22]" /> : null}
          </button>
        </div>

        {activeTab === "pending" ? <Table tableRows={pendingRows} showActions={true} /> : <Table tableRows={historyRows} showActions={false} />}
      </section>
    </div>
  );
}
