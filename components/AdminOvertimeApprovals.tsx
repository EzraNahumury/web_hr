"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type OvertimeRow = {
  id: number;
  nama: string;
  divisi?: string | null;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  total_jam: string;
  bukti_lembur: string | null;
  status_approval: "pending" | "approved" | "rejected";
  approver_name: string | null;
  assigned_approver_name?: string | null;
  assigned_approver_user_id?: number | null;
  catatan_atasan: string | null;
  catatan_karyawan?: string | null;
  jenis_pekerjaan?: string | null;
  deadline?: string | null;
  nama_order?: string | null;
  jumlah_qty?: number | null;
  target_sebelum_lembur?: number | null;
  target_setelah_lembur?: number | null;
};

type Props = {
  rows: OvertimeRow[];
};

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseTanggal(str: string): Date | null {
  const parts = str.split(" ");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = MONTH_MAP[parts[1]];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}

function StatusBadge({ status }: { status: OvertimeRow["status_approval"] }) {
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

export default function AdminOvertimeApprovals({ rows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<number, string>>(
    Object.fromEntries(rows.map((row) => [row.id, row.catatan_atasan ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; isImage: boolean } | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const filteredRows = useMemo(() => {
    if (!dateFrom && !dateTo) return rows;
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    return rows.filter((row) => {
      const d = parseTanggal(row.tanggal);
      if (!d) return true;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo]);

  function updateApproval(id: number, status: "approved" | "rejected") {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/overtime/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusApproval: status,
          catatanAtasan: notes[id]?.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Approval lembur gagal diperbarui.");
        return;
      }

      setSuccess(`Pengajuan lembur berhasil di-${status === "approved" ? "approve" : "reject"}.`);
      router.refresh();
    });
  }

  async function handleDownloadPDF() {
    setIsDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Laporan Pengajuan Lembur", 14, 18);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const periodeText =
        dateFrom || dateTo
          ? `Periode: ${dateFrom || "awal"} s/d ${dateTo || "akhir"}`
          : "Semua periode";
      doc.text(periodeText, 14, 26);
      doc.text(`Total data: ${filteredRows.length}`, 14, 33);

      autoTable(doc, {
        startY: 38,
        head: [["Nama", "Tanggal", "Jam", "Total", "Pekerjaan", "Deadline", "Order/QTY/Target", "Status", "Catatan"]],
        body: filteredRows.map((row) => [
          row.nama,
          row.tanggal,
          `${row.jam_mulai} - ${row.jam_selesai}`,
          `${row.total_jam} jam`,
          row.jenis_pekerjaan || "-",
          row.deadline || "-",
          row.nama_order
            ? `${row.nama_order}\nQTY: ${row.jumlah_qty ?? "-"}\nSblm: ${row.target_sebelum_lembur ?? "-"} | Sslh: ${row.target_setelah_lembur ?? "-"}`
            : "-",
          row.status_approval,
          row.catatan_atasan || "-",
        ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [143, 29, 34], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [255, 248, 244] },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 16 },
          4: { cellWidth: 32 },
          5: { cellWidth: 22 },
          6: { cellWidth: 48 },
          7: { cellWidth: 20 },
          8: { cellWidth: "auto" },
        },
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`laporan-lembur-${dateStr}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  }

  const totalApproved = filteredRows.filter((r) => r.status_approval === "approved").length;
  const totalPending = filteredRows.filter((r) => r.status_approval === "pending").length;
  const totalRejected = filteredRows.filter((r) => r.status_approval === "rejected").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">Total Request</p>
          <p className="mt-3 text-3xl font-semibold text-[#172033]">{filteredRows.length}</p>
        </div>
        <div className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">Pending</p>
          <p className="mt-3 text-3xl font-semibold text-[#4a5dff]">{totalPending}</p>
        </div>
        <div className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">Approved</p>
          <p className="mt-3 text-3xl font-semibold text-[#1f8f4c]">{totalApproved}</p>
        </div>
        <div className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">Rejected</p>
          <p className="mt-3 text-3xl font-semibold text-[#c63838]">{totalRejected}</p>
        </div>
      </section>

      {(error || success) && (
        <div
          className={
            error
              ? "rounded-2xl border border-[#f2c4c4] bg-[#fff4f4] px-4 py-3 text-sm text-[#b13232]"
              : "rounded-2xl border border-[#cde8d4] bg-[#f2fbf4] px-4 py-3 text-sm text-[#267344]"
          }
        >
          {error ?? success}
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] border border-[#dfe5ef] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="border-b border-[#e7edf5] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#172033]">Daftar Pengajuan Lembur</h3>
              <p className="mt-1 text-sm text-[#66748f]">
                Admin hanya perlu review data dan klik approve atau reject.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date range filter */}
              <div className="flex items-center gap-2 rounded-2xl border border-[#dfe5ef] bg-[#f8fafc] px-3 py-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4 flex-none text-[#8a96ad]"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-sm text-[#172033] outline-none"
                  aria-label="Dari tanggal"
                />
                <span className="text-xs text-[#8a96ad]">s/d</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-sm text-[#172033] outline-none"
                  aria-label="Sampai tanggal"
                />
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="ml-1 text-xs text-[#8a96ad] hover:text-[#c63838]"
                    aria-label="Reset filter"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Download PDF */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloading || filteredRows.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(143,29,34,0.2)] transition hover:bg-[#7a171c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
                </svg>
                {isDownloading ? "Membuat PDF..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-320px)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[#e7edf5] bg-[#f8fafc] text-xs uppercase tracking-[0.18em] text-[#8a96ad]">
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Jam</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Diajukan Ke</th>
                <th className="px-6 py-4">Pekerjaan</th>
                <th className="px-6 py-4">Deadline</th>
                <th className="px-6 py-4">Detail Produksi</th>
                <th className="px-6 py-4">Bukti</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Catatan</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-10 text-center text-sm text-[#7a879f]">
                    Tidak ada data lembur untuk rentang tanggal yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isLocked = row.status_approval !== "pending";
                  const canAdminAct = !isLocked;

                  return (
                    <tr key={row.id} className="border-b border-[#eef2f7] text-[#42506a]">
                      <td className="px-6 py-4 font-semibold uppercase text-[#172033]">{row.nama}</td>
                      <td className="px-6 py-4">{row.tanggal}</td>
                      <td className="px-6 py-4">
                        {row.jam_mulai} - {row.jam_selesai}
                      </td>
                      <td className="px-6 py-4">{row.total_jam} jam</td>
                      <td className="px-6 py-4">
                        {row.assigned_approver_name ? (
                          <span className="inline-flex rounded-full bg-[#fff3e0] px-3 py-1 text-xs font-semibold text-[#9c4d00]">
                            {row.assigned_approver_name}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4a5dff]">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="max-w-[200px] px-6 py-4 text-sm text-[#42506a]">
                        {row.jenis_pekerjaan || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#42506a]">
                        {row.deadline || "-"}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#42506a]">
                        {row.nama_order ? (
                          <div className="space-y-0.5 leading-5">
                            <p><span className="font-semibold text-[#172033]">Order:</span> {row.nama_order}</p>
                            <p><span className="font-semibold text-[#172033]">QTY:</span> {row.jumlah_qty ?? "-"}</p>
                            <p><span className="font-semibold text-[#172033]">Target Sblm:</span> {row.target_sebelum_lembur ?? "-"}</p>
                            <p><span className="font-semibold text-[#172033]">Target Sslh:</span> {row.target_setelah_lembur ?? "-"}</p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.bukti_lembur ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                url: row.bukti_lembur!,
                                isImage: /\.(jpg|jpeg|png|webp)$/i.test(row.bukti_lembur ?? ""),
                              })
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7deea] bg-white text-[#5b6680] transition hover:border-[#5b4fff] hover:text-[#5b4fff]"
                            aria-label="Lihat bukti lembur"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path
                                d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <StatusBadge status={row.status_approval} />
                          <p className="text-xs text-[#7a879f]">
                            {row.approver_name ? `oleh ${row.approver_name}` : "Belum diproses"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          value={notes[row.id] ?? ""}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                          placeholder="Catatan atasan"
                          disabled={isLocked}
                          className="h-11 w-[220px] rounded-xl border border-[#d7deea] bg-[#fbfcfe] px-3 text-sm text-[#172033] outline-none transition focus:border-[#5b4fff] disabled:cursor-not-allowed disabled:bg-[#f1f4f8] disabled:text-[#7a879f]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateApproval(row.id, "approved")}
                            disabled={isPending || !canAdminAct}
                            className="rounded-xl bg-[#19a15f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#14874f] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateApproval(row.id, "rejected")}
                            disabled={isPending || !canAdminAct}
                            className="rounded-xl bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d73737] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-4xl rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">Bukti Lembur</p>
                <p className="mt-2 text-sm text-[#66748f]">{preview.url}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-2xl border border-[#dbe3f1] bg-white px-4 py-2 text-sm font-semibold text-[#1f2a3d]"
              >
                Tutup
              </button>
            </div>
            <div className="p-6">
              {preview.isImage ? (
                <div className="overflow-hidden rounded-[24px] border border-[#e7edf5] bg-[#f8fafc]">
                  <Image
                    src={preview.url}
                    alt="Bukti lembur"
                    width={1200}
                    height={900}
                    unoptimized
                    className="h-auto max-h-[70vh] w-full object-contain"
                  />
                </div>
              ) : (
                <iframe
                  title="Bukti lembur"
                  src={preview.url}
                  className="h-[70vh] w-full rounded-[24px] border border-[#e7edf5]"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
