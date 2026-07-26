"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Tarif lembur Rp 20.000 / jam (konsisten dengan overtimeBonus di lib/payroll-summary.ts).
const OVERTIME_RATE_PER_HOUR = 20000;

function formatOvertimeNominal(totalJam: string | number) {
  const jam = Number(totalJam) || 0;
  return `Rp${Math.round(jam * OVERTIME_RATE_PER_HOUR).toLocaleString("id-ID")}`;
}

type OvertimeRow = {
  id: number;
  nama: string;
  divisi?: string | null;
  tanggal: string;
  tanggal_iso?: string;
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
  approval_flow?: "single" | "double";
  first_approval_status?: "pending" | "approved" | "rejected" | null;
  first_approver_name?: string | null;
  first_approver_user_id?: number | null;
  first_approved_at?: string | null;
};

type Props = {
  rows: OvertimeRow[];
  canApprove?: boolean;
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

export default function AdminOvertimeApprovals({ rows, canApprove = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<number, string>>(
    Object.fromEntries(rows.map((row) => [row.id, row.catatan_atasan ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; isImage: boolean } | null>(null);
  const [detailRow, setDetailRow] = useState<OvertimeRow | null>(null);
  const [statusRow, setStatusRow] = useState<OvertimeRow | null>(null);
  const [editRow, setEditRow] = useState<OvertimeRow | null>(null);
  const [editForm, setEditForm] = useState({ tanggal: "", jamMulai: "", jamSelesai: "" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [flowTab, setFlowTab] = useState<"single" | "double">("single");

  const singleFlowRows = useMemo(() => rows.filter((r) => (r.approval_flow ?? "single") === "single"), [rows]);
  const doubleFlowRows = useMemo(() => rows.filter((r) => r.approval_flow === "double"), [rows]);

  const baseTabRows = flowTab === "single" ? singleFlowRows : doubleFlowRows;

  const filteredRows = useMemo(() => {
    const dateFiltered = (() => {
      if (!dateFrom && !dateTo) return baseTabRows;
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      return baseTabRows.filter((row) => {
        const d = parseTanggal(row.tanggal);
        if (!d) return true;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    })();
    return dateFiltered;
  }, [baseTabRows, dateFrom, dateTo]);

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
      setStatusRow(null);
      router.refresh();
    });
  }

  function openEdit(row: OvertimeRow) {
    setError(null);
    setSuccess(null);
    const isoFromDisplay = (() => {
      if (row.tanggal_iso) return row.tanggal_iso;
      const d = parseTanggal(row.tanggal);
      if (!d) return "";
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, "0");
      const day = `${d.getDate()}`.padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();
    setEditForm({
      tanggal: isoFromDisplay,
      jamMulai: row.jam_mulai,
      jamSelesai: row.jam_selesai,
    });
    setEditRow(row);
  }

  function handleSaveEdit() {
    if (!editRow) return;
    setError(null);
    setSuccess(null);

    if (!editForm.tanggal) {
      setError("Tanggal lembur wajib diisi.");
      return;
    }
    if (!editForm.jamMulai || !editForm.jamSelesai) {
      setError("Jam mulai dan jam selesai wajib diisi.");
      return;
    }
    const start = new Date(`${editForm.tanggal}T${editForm.jamMulai}:00`);
    const end = new Date(`${editForm.tanggal}T${editForm.jamSelesai}:00`);
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (!Number.isFinite(diffHours) || diffHours <= 0) {
      setError("Jam selesai harus lebih besar dari jam mulai.");
      return;
    }

    setIsSavingEdit(true);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/overtime/${editRow.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tanggal: editForm.tanggal,
            jamMulai: editForm.jamMulai,
            jamSelesai: editForm.jamSelesai,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error ?? "Gagal memperbarui tanggal/jam lembur.");
          return;
        }
        setSuccess("Tanggal & jam lembur berhasil diperbarui.");
        setEditRow(null);
        router.refresh();
      } finally {
        setIsSavingEdit(false);
      }
    });
  }

  const editEstimatedHours = (() => {
    if (!editForm.tanggal || !editForm.jamMulai || !editForm.jamSelesai) return "0.00";
    const start = new Date(`${editForm.tanggal}T${editForm.jamMulai}:00`);
    const end = new Date(`${editForm.tanggal}T${editForm.jamSelesai}:00`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Number.isFinite(diff) && diff > 0 ? diff.toFixed(2) : "0.00";
  })();

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
      doc.setFont("helvetica", "bold");
      doc.text(`Total Nominal Lembur (Approved): Rp${totalNominalApproved.toLocaleString("id-ID")}`, 14, 40);
      doc.setFont("helvetica", "normal");

      autoTable(doc, {
        startY: 45,
        head: [["Nama", "Tanggal", "Jam", "Total", "Nominal", "Deadline", "Status", "Catatan"]],
        body: filteredRows.map((row) => [
          (row.nama || "").toUpperCase(),
          row.tanggal,
          `${row.jam_mulai} - ${row.jam_selesai}`,
          `${row.total_jam} jam`,
          formatOvertimeNominal(row.total_jam),
          row.deadline || "-",
          (row.status_approval || "").toUpperCase(),
          (row.catatan_atasan || "-").toUpperCase(),
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
          5: { cellWidth: 30 },
          6: { cellWidth: 24 },
          7: { cellWidth: "auto" },
        },
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`LAPORAN-LEMBUR-${dateStr}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  }

  const totalApproved = filteredRows.filter((r) => r.status_approval === "approved").length;
  const totalPending = filteredRows.filter((r) => r.status_approval === "pending").length;
  const totalRejected = filteredRows.filter((r) => r.status_approval === "rejected").length;
  // Total nominal lembur yang APPROVED (payable) sesuai filter tab + range tanggal.
  const totalNominalApproved = filteredRows
    .filter((r) => r.status_approval === "approved")
    .reduce((sum, r) => sum + (Number(r.total_jam) || 0) * OVERTIME_RATE_PER_HOUR, 0);

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

      <div className="flex flex-wrap gap-2 rounded-[20px] border border-[#dfe5ef] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => setFlowTab("single")}
          className={
            flowTab === "single"
              ? "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8f1d22] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(143,29,34,0.18)] transition"
              : "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-[#5b6680] transition hover:bg-[#f8fafc]"
          }
        >
          Langsung ke Admin
          <span
            className={
              flowTab === "single"
                ? "inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-white/25 px-2 text-xs font-semibold"
                : "inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-[#eef2f7] px-2 text-xs font-semibold text-[#5b6680]"
            }
          >
            {singleFlowRows.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFlowTab("double")}
          className={
            flowTab === "double"
              ? "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8f1d22] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(143,29,34,0.18)] transition"
              : "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-[#5b6680] transition hover:bg-[#f8fafc]"
          }
        >
          Via Atasan (2x Approve)
          <span
            className={
              flowTab === "double"
                ? "inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-white/25 px-2 text-xs font-semibold"
                : "inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-[#eef2f7] px-2 text-xs font-semibold text-[#5b6680]"
            }
          >
            {doubleFlowRows.length}
          </span>
        </button>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[#dfe5ef] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="border-b border-[#e7edf5] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#172033]">Daftar Pengajuan Lembur</h3>
              <p className="mt-1 text-sm text-[#66748f]">
                Admin hanya perlu review data dan klik approve atau reject.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-[#e3d5a8] bg-[#fffaf0] px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a07c00]">Total Nominal Lembur (Approved)</span>
                <span className="text-base font-bold tabular-nums text-[#7c5b00]">Rp{totalNominalApproved.toLocaleString("id-ID")}</span>
              </div>
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
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[#e7edf5] bg-[#f8fafc] text-xs uppercase tracking-[0.18em] text-[#8a96ad]">
                <th className="px-3 py-3.5">Nama</th>
                <th className="px-3 py-3.5">Tanggal</th>
                <th className="px-3 py-3.5">Jam</th>
                <th className="px-3 py-3.5">Total</th>
                <th className="px-3 py-3.5">Nominal</th>
                <th className="px-3 py-3.5">Diajukan Ke</th>
                {flowTab === "double" ? <th className="px-3 py-3.5">Approval Atasan</th> : null}
                <th className="px-3 py-3.5">Bukti</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-3 py-3.5">Catatan</th>
                <th className="px-3 py-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={flowTab === "double" ? 11 : 10} className="px-6 py-10 text-center text-sm text-[#7a879f]">
                    Tidak ada data lembur untuk rentang tanggal yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isLocked = row.status_approval !== "pending";
                  const isDoubleFlow = row.approval_flow === "double";
                  const waitingFirstApprover =
                    isDoubleFlow && row.first_approval_status === "pending" && !isLocked;
                  const canAdminAct = !isLocked && !waitingFirstApprover;

                  return (
                    <tr key={row.id} className="border-b border-[#eef2f7] text-[#42506a]">
                      <td className="px-3 py-3.5 font-semibold uppercase text-[#172033]">{row.nama}</td>
                      <td className="px-3 py-3.5">{row.tanggal}</td>
                      <td className="px-3 py-3.5">
                        {row.jam_mulai} - {row.jam_selesai}
                      </td>
                      <td className="px-3 py-3.5">{row.total_jam} jam</td>
                      <td className="px-3 py-3.5 font-semibold tabular-nums text-[#172033]">{formatOvertimeNominal(row.total_jam)}</td>
                      <td className="px-3 py-3.5">
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
                      {flowTab === "double" ? (
                        <td className="px-3 py-3.5 text-xs">
                          {row.first_approval_status === "approved" ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex w-fit rounded-full bg-[#eaf8ef] px-3 py-1 text-xs font-semibold text-[#1f8f4c]">
                                Disetujui Atasan
                              </span>
                              <span className="text-[11px] text-[#7a879f]">
                                oleh {row.first_approver_name ?? "-"}
                              </span>
                            </span>
                          ) : row.first_approval_status === "rejected" ? (
                            <span className="inline-flex w-fit rounded-full bg-[#fff1f1] px-3 py-1 text-xs font-semibold text-[#c63838]">
                              Ditolak Atasan
                            </span>
                          ) : (
                            <span className="inline-flex w-fit rounded-full bg-[#fff7e6] px-3 py-1 text-xs font-semibold text-[#9c4d00]">
                              Menunggu Atasan
                            </span>
                          )}
                        </td>
                      ) : null}
                      <td className="px-3 py-3.5">
                        {row.bukti_lembur ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                url: row.bukti_lembur!,
                                isImage: /\.(jpg|jpeg|png|webp)$/i.test(row.bukti_lembur ?? ""),
                              })
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#d7deea] bg-white text-[#5b6680] transition hover:border-[#5b4fff] hover:text-[#5b4fff]"
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
                      <td className="px-3 py-3.5">
                        <div className="space-y-2">
                          <StatusBadge status={row.status_approval} />
                          <p className="text-xs text-[#7a879f]">
                            {row.approver_name ? `oleh ${row.approver_name}` : "Belum diproses"}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <input
                          value={notes[row.id] ?? ""}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                          placeholder="Catatan atasan"
                          disabled={isLocked || !canApprove}
                          className="h-10 w-[150px] rounded-xl border border-[#d7deea] bg-[#fbfcfe] px-2.5 text-sm text-[#172033] outline-none transition focus:border-[#5b4fff] disabled:cursor-not-allowed disabled:bg-[#f1f4f8] disabled:text-[#7a879f]"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailRow(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#d7deea] bg-white text-[#5b6680] transition hover:border-[#5b4fff] hover:text-[#5b4fff]"
                            aria-label="Lihat detail pengajuan"
                            title="Detail pengajuan"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                          </button>
                          {canApprove ? (
                            <>
                              <button
                                type="button"
                                onClick={() => { setError(null); setSuccess(null); setStatusRow(row); }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#d7deea] bg-white text-[#5b6680] transition hover:border-[#19a15f] hover:text-[#19a15f]"
                                aria-label="Update status lembur"
                                title="Update status lembur (approve / reject)"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#d7deea] bg-white text-[#5b6680] transition hover:border-[#8f1d22] hover:text-[#8f1d22]"
                                aria-label="Update tanggal & jam lembur"
                                title="Update tanggal & jam lembur"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                                  <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateApproval(row.id, "approved")}
                                disabled={isPending || !canAdminAct}
                                title={waitingFirstApprover ? "Atasan belum menyetujui" : undefined}
                                className="rounded-xl bg-[#19a15f] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#14874f] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => updateApproval(row.id, "rejected")}
                                disabled={isPending || !canAdminAct}
                                title={waitingFirstApprover ? "Atasan belum menyetujui" : undefined}
                                className="rounded-xl bg-[#ef4444] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#d73737] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-[#8a96ad]">Read-only</span>
                          )}
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

      {detailRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] bg-[linear-gradient(135deg,#8f1d22_0%,#c44b3f_100%)] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Detail Pengajuan Lembur</p>
                <p className="mt-2 text-lg font-semibold uppercase">{detailRow.nama}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Tutup
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <DetailField label="Tanggal Lembur" value={detailRow.tanggal} />
                <DetailField label="Jam" value={`${detailRow.jam_mulai} - ${detailRow.jam_selesai}`} />
                <DetailField label="Total Jam" value={`${detailRow.total_jam} jam`} />
                <DetailField label="Divisi" value={detailRow.divisi || "-"} />
                <DetailField label="Diajukan Ke" value={detailRow.assigned_approver_name ?? "Admin (semua)"} />
                <DetailField
                  label="Alur Approval"
                  value={detailRow.approval_flow === "double" ? "2x Approve (Atasan + Admin)" : "Langsung Admin"}
                />
                <DetailField label="Jenis Pekerjaan" value={detailRow.jenis_pekerjaan || "-"} fullWidth />
                <DetailField label="Deadline" value={detailRow.deadline || "-"} />
                <DetailField label="Status" value={detailRow.status_approval} />
              </div>

              {detailRow.nama_order ? (
                <div className="mt-6 rounded-[20px] border border-[#f0d8d1] bg-[#fff7f3] p-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-[#8f1d22] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                      Produksi
                    </span>
                    <p className="text-xs text-[#7a6059]">Field tambahan khusus divisi Produksi</p>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <DetailField label="Nama Order" value={detailRow.nama_order} fullWidth />
                    <DetailField label="Jumlah QTY" value={String(detailRow.jumlah_qty ?? "-")} />
                    <DetailField label="Target Sebelum Lembur" value={String(detailRow.target_sebelum_lembur ?? "-")} />
                    <DetailField label="Target Setelah Lembur" value={String(detailRow.target_setelah_lembur ?? "-")} />
                  </div>
                </div>
              ) : null}

              {detailRow.approval_flow === "double" ? (
                <div className="mt-6 rounded-[20px] border border-[#dfe5ef] bg-[#f8fafc] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">Stage 1 — Approval Atasan</p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <DetailField label="Status" value={detailRow.first_approval_status ?? "-"} />
                    <DetailField label="Disetujui oleh" value={detailRow.first_approver_name ?? "-"} />
                    <DetailField label="Waktu" value={detailRow.first_approved_at ?? "-"} fullWidth />
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4">
                <DetailField label="Catatan Karyawan" value={detailRow.catatan_karyawan || "-"} fullWidth multiline />
                <DetailField label="Catatan Atasan" value={detailRow.catatan_atasan || "-"} fullWidth multiline />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {statusRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] bg-[linear-gradient(135deg,#19a15f_0%,#0f7a47_100%)] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Update Status Lembur</p>
                <p className="mt-2 text-lg font-semibold uppercase">{statusRow.nama}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusRow(null)}
                disabled={isPending}
                className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:opacity-50"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-[#e7edf5] bg-[#f8fafc] px-4 py-3 text-sm text-[#5b6680]">
                <div className="flex items-center justify-between gap-3">
                  <span>Status saat ini</span>
                  <StatusBadge status={statusRow.status_approval} />
                </div>
                <p className="mt-2 text-xs text-[#7a879f]">
                  {statusRow.tanggal} • {statusRow.jam_mulai}-{statusRow.jam_selesai} • {statusRow.total_jam} jam
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a96ad]">Catatan Atasan (opsional)</span>
                <input
                  value={notes[statusRow.id] ?? ""}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [statusRow.id]: event.target.value }))
                  }
                  placeholder="Catatan atasan"
                  className="h-11 w-full rounded-xl border border-[#d7deea] bg-[#fbfcfe] px-3 text-sm text-[#172033] outline-none transition focus:border-[#19a15f]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateApproval(statusRow.id, "approved")}
                  disabled={isPending}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#19a15f] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(25,161,95,0.22)] transition hover:bg-[#14874f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => updateApproval(statusRow.id, "rejected")}
                  disabled={isPending}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#ef4444] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(239,68,68,0.22)] transition hover:bg-[#d73737] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] bg-[linear-gradient(135deg,#8f1d22_0%,#c44b3f_100%)] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Update Tanggal &amp; Jam Lembur</p>
                <p className="mt-2 text-lg font-semibold uppercase">{editRow.nama}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditRow(null)}
                disabled={isSavingEdit}
                className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:opacity-50"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-5 p-6">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a96ad]">Tanggal Lembur</span>
                <input
                  type="date"
                  value={editForm.tanggal}
                  onChange={(e) => setEditForm((c) => ({ ...c, tanggal: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-[#d7deea] bg-[#fbfcfe] px-4 text-sm text-[#172033] outline-none transition focus:border-[#8f1d22]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a96ad]">Jam Mulai</span>
                  <input
                    type="time"
                    value={editForm.jamMulai}
                    onChange={(e) => setEditForm((c) => ({ ...c, jamMulai: e.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[#d7deea] bg-[#fbfcfe] px-4 text-sm text-[#172033] outline-none transition focus:border-[#8f1d22]"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a96ad]">Jam Selesai</span>
                  <input
                    type="time"
                    value={editForm.jamSelesai}
                    onChange={(e) => setEditForm((c) => ({ ...c, jamSelesai: e.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[#d7deea] bg-[#fbfcfe] px-4 text-sm text-[#172033] outline-none transition focus:border-[#8f1d22]"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-[#e7edf5] bg-[#f8fafc] px-4 py-3 text-sm text-[#5b6680]">
                Estimasi total lembur: <span className="font-semibold text-[#172033]">{editEstimatedHours} jam</span>
              </div>

              <div className="flex items-start gap-2 rounded-2xl border border-[#f3dcc4] bg-[#fff8ef] px-4 py-3 text-xs leading-5 text-[#8a5a1f]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true">
                  <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>
                  Summary Payroll otomatis menyesuaikan. Tapi jika slip gaji periode terkait sudah didistribusikan,
                  buka Summary Payroll lalu <span className="font-semibold">Simpan ulang</span> payroll karyawan ini agar slip ikut terbarui.
                </span>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditRow(null)}
                  disabled={isSavingEdit}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#dbe3f1] bg-white px-5 text-sm font-semibold text-[#1f2a3d] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(143,29,34,0.2)] transition hover:bg-[#7a171c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailField({
  label,
  value,
  fullWidth,
  multiline,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a96ad]">{label}</p>
      <p
        className={
          multiline
            ? "mt-2 whitespace-pre-wrap rounded-2xl border border-[#dfe5ef] bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-[#172033]"
            : "mt-2 text-sm font-semibold text-[#172033]"
        }
      >
        {value}
      </p>
    </div>
  );
}
