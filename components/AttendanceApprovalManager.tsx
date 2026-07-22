"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AttendanceApprovalItem } from "@/lib/attendance-approval";

type Props = {
  rows: AttendanceApprovalItem[];
  endpoint?: string; // base PATCH endpoint; kalau kosong -> read-only (history)
  title?: string;
  // true jika admin ini boleh mengubah data karyawan HRD (super-editor).
  canEditHrd?: boolean;
};

function jenisLabel(jenis: string | null) {
  switch (jenis) {
    case "telat":
      return "Telat";
    case "pulang_awal":
      return "Pulang Awal";
    case "telat_pulang_awal":
      return "Telat & Pulang Awal";
    default:
      return "-";
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-[#e8faf0] text-[#17603b]"
      : status === "rejected"
        ? "bg-[#fff0f0] text-[#b92f2f]"
        : "bg-[#fff3d9] text-[#8d6200]";
  const label = status === "approved" ? "Disetujui" : status === "rejected" ? "Ditolak" : "Menunggu";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export default function AttendanceApprovalManager({ rows, endpoint, title, canEditHrd = false }: Props) {
  const router = useRouter();
  const readOnly = !endpoint;
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.nama, r.nip ?? "", r.jabatan ?? "", r.divisi ?? "", r.tanggal, r.status]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  async function act(row: AttendanceApprovalItem, decision: "approved" | "rejected") {
    if (!endpoint) return;
    setFeedback(null);
    setProcessingId(row.id);
    try {
      const res = await fetch(`${endpoint}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusApproval: decision, catatanAtasan: notes[row.id] || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || data.message || "Gagal memproses approval." });
        return;
      }
      setFeedback({
        type: "success",
        text: decision === "approved" ? "Pengajuan disetujui." : "Pengajuan ditolak.",
      });
      router.refresh();
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setProcessingId(null);
    }
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: String(rows.length) },
          { label: "Menunggu", value: String(pendingCount) },
          { label: "Disetujui", value: String(rows.filter((r) => r.status === "approved").length) },
          { label: "Ditolak", value: String(rows.filter((r) => r.status === "rejected").length) },
        ].map((s) => (
          <div key={s.label} className="rounded-[22px] border border-[#ead7ce] bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16f63]">{s.label}</p>
            <p className="mt-2 text-xl font-semibold text-[#241716]">{s.value}</p>
          </div>
        ))}
      </div>

      {feedback ? (
        <div
          className={
            feedback.type === "success"
              ? "rounded-2xl border border-[#bbe7d6] bg-[#f0fbf6] px-5 py-3 text-sm text-[#136c4c]"
              : "rounded-2xl border border-[#f0c4c4] bg-[#fff4f4] px-5 py-3 text-sm text-[#b13232]"
          }
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="rounded-[24px] border border-[#ead7ce] bg-white px-4 py-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIP, jabatan, tanggal…"
          className="h-11 w-full rounded-xl border border-[#ead7ce] bg-[#fffaf8] px-4 text-sm text-[#2d1b18] outline-none focus:border-[#8f1d22]"
        />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#ead7ce] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#fff3ed] text-left text-xs font-semibold uppercase tracking-[0.1em] text-[#8f1d22]">
                <th className="border-b border-[#f1e0da] px-4 py-3">Karyawan</th>
                <th className="border-b border-[#f1e0da] px-4 py-3">Tanggal</th>
                <th className="border-b border-[#f1e0da] px-4 py-3">Jenis</th>
                <th className="border-b border-[#f1e0da] px-4 py-3">Jam</th>
                <th className="border-b border-[#f1e0da] px-4 py-3">Keterangan</th>
                <th className="border-b border-[#f1e0da] px-4 py-3">Atasan</th>
                <th className="border-b border-[#f1e0da] px-4 py-3">Status</th>
                {!readOnly ? <th className="border-b border-[#f1e0da] px-4 py-3">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 7 : 8} className="px-4 py-8 text-center text-sm text-[#8a6f68]">
                    {title ?? "Tidak ada pengajuan approval absensi."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="align-top text-[#3a2b27] odd:bg-white even:bg-[#fffaf8]">
                    <td className="border-b border-[#f4ebe6] px-4 py-3">
                      <div className="font-semibold uppercase text-[#241716]">{r.nama}</div>
                      <div className="text-xs text-[#8a6f68]">
                        {r.jabatan || "-"}
                        {r.divisi ? ` • ${r.divisi}` : ""}
                      </div>
                    </td>
                    <td className="border-b border-[#f4ebe6] px-4 py-3 whitespace-nowrap">{r.tanggal}</td>
                    <td className="border-b border-[#f4ebe6] px-4 py-3">
                      <span className="inline-flex rounded-full bg-[#ede9fe] px-2.5 py-1 text-xs font-semibold text-[#6d28d9]">
                        {jenisLabel(r.jenis)}
                      </span>
                      {r.lateMinutes > 0 ? (
                        <div className="mt-1 text-[11px] text-[#8a6f68]">Telat {r.lateMinutes} mnt</div>
                      ) : null}
                    </td>
                    <td className="border-b border-[#f4ebe6] px-4 py-3 whitespace-nowrap text-xs">
                      <div>Masuk: {r.jamMasuk ?? "-"}</div>
                      <div>Pulang: {r.jamPulang ?? "-"}</div>
                    </td>
                    <td className="border-b border-[#f4ebe6] px-4 py-3 max-w-[220px] text-xs text-[#5a443d]">
                      {r.keterangan || "-"}
                    </td>
                    <td className="border-b border-[#f4ebe6] px-4 py-3 text-xs">
                      {r.assignedApproverName || "Admin"}
                      {r.status !== "pending" && r.approverName ? (
                        <div className="mt-1 text-[11px] text-[#8a6f68]">oleh {r.approverName}</div>
                      ) : null}
                    </td>
                    <td className="border-b border-[#f4ebe6] px-4 py-3">
                      <StatusBadge status={r.status} />
                      {r.catatanAtasan ? (
                        <div className="mt-1 max-w-[180px] text-[11px] text-[#8a6f68]">“{r.catatanAtasan}”</div>
                      ) : null}
                    </td>
                    {!readOnly ? (
                      <td className="border-b border-[#f4ebe6] px-4 py-3">
                        {r.status === "pending" && !canEditHrd && (r.department ?? "").trim().toUpperCase() === "HRD" ? (
                          <span className="inline-flex items-center rounded-full bg-[#f0e6e2] px-3 py-1.5 text-xs font-semibold text-[#8a5d52]">
                            Read-only (HRD)
                          </span>
                        ) : r.status === "pending" ? (
                          <div className="flex min-w-[220px] flex-col gap-2">
                            <input
                              value={notes[r.id] ?? ""}
                              onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                              placeholder="Catatan (opsional)"
                              className="h-9 w-full rounded-lg border border-[#ead7ce] px-2 text-xs outline-none focus:border-[#8f1d22]"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => act(r, "approved")}
                                disabled={processingId === r.id}
                                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[#17603b] px-3 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {processingId === r.id ? "..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => act(r, "rejected")}
                                disabled={processingId === r.id}
                                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[#b92f2f] px-3 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {processingId === r.id ? "..." : "Reject"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#a1a1a1]">Selesai</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
