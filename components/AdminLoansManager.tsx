"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { LoanListItem } from "@/lib/loans";

type Props = {
  initialRows: LoanListItem[];
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#e3d5cf] bg-white px-4 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string | number | null | undefined) {
  const amount = toNumber(value);

  return amount.toLocaleString("id-ID", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function StatusBadge({ status }: { status: LoanListItem["status"] }) {
  const styles =
    status === "approved"
      ? "bg-[#fff3d9] text-[#8d6200]"
      : status === "berjalan"
        ? "bg-[#e8faf0] text-[#17603b]"
        : status === "lunas"
          ? "bg-[#eaf7ff] text-[#14597f]"
          : status === "rejected"
            ? "bg-[#fff0f0] text-[#b92f2f]"
            : "bg-[#eef2ff] text-[#4657df]";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
}

function mapApprovalMessage(status: "approved" | "rejected") {
  return status === "approved"
    ? "Pengajuan pinjaman berhasil di-approve. Jadwal cicilan otomatis dibuat mulai bulan berikutnya."
    : "Pengajuan pinjaman berhasil ditolak.";
}

export default function AdminLoansManager({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.employeeName,
        row.nip,
        row.role,
        row.department,
        row.status,
        row.requestDate,
        row.approvalDate ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [rows, search]);

  const summary = useMemo(
    () =>
      filteredRows.reduce(
        (total, row) => ({
          total: total.total + 1,
          pending: total.pending + (row.status === "pending" ? 1 : 0),
          active: total.active + (["approved", "berjalan"].includes(row.status) ? 1 : 0),
          remaining: total.remaining + (["approved", "berjalan"].includes(row.status) ? toNumber(row.remainingBalance) : 0),
        }),
        { total: 0, pending: 0, active: 0, remaining: 0 },
      ),
    [filteredRows],
  );

  function handleAction(loanId: number, status: "approved" | "rejected") {
    setFeedback(null);
    setProcessingId(loanId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/loans/${loanId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        const result = (await response.json()) as { message?: string; loan?: LoanListItem };

        if (!response.ok || !result.loan) {
          throw new Error(result.message || "Gagal memproses pengajuan pinjaman.");
        }

        setRows((current) => current.map((row) => (row.id === loanId ? result.loan! : row)));
        setFeedback({
          type: "success",
          text: result.message || mapApprovalMessage(status),
        });
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses pengajuan.",
        });
      } finally {
        setProcessingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-[28px] border border-[#ead7ce] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(96,45,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Total Pengajuan</p>
          <p className="mt-3 text-3xl font-semibold text-[#241716]">{summary.total}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(96,45,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Pending</p>
          <p className="mt-3 text-3xl font-semibold text-[#4657df]">{summary.pending}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(96,45,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Pinjaman Aktif</p>
          <p className="mt-3 text-3xl font-semibold text-[#17603b]">{summary.active}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-[linear-gradient(135deg,#8f1d22_0%,#c65d4a_100%)] px-5 py-5 text-white shadow-[0_20px_40px_rgba(143,29,34,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Sisa Tanggungan</p>
          <p className="mt-3 text-3xl font-semibold">Rp{formatMoney(summary.remaining)}</p>
        </article>
      </section>

      <section className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_18px_50px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] px-6 py-6">
          <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            Approval Pinjaman
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">Pinjaman Karyawan</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#7a6059]">
            Setelah admin approve, sistem langsung membuat jadwal cicilan otomatis mulai bulan berikutnya dan payroll summary akan menarik potongan pinjaman sesuai bulan cicilan.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Daftar Pengajuan</p>
              <p className="mt-2 text-sm text-[#7a6059]">Tabel menampilkan nominal pinjaman, cicilan per bulan, dan bulan-bulan potongan yang dihitung otomatis dari tanggal approval.</p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIP, jabatan, status..."
              className={`${inputClassName} xl:max-w-sm`}
            />
          </div>

          {feedback ? (
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${feedback.type === "success" ? "border border-[#cfe8d4] bg-[#f2fbf4] text-[#267344]" : "border border-[#f2c4c4] bg-[#fff4f4] text-[#b13232]"}`}>
              {feedback.text}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto border-t border-[#eddad1]">
          <table className="min-w-[1760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-6 py-4 font-semibold">Nama</th>
                <th className="px-6 py-4 font-semibold">NIP</th>
                <th className="px-6 py-4 font-semibold">Jabatan</th>
                <th className="px-6 py-4 font-semibold">Total Pinjaman</th>
                <th className="px-6 py-4 font-semibold">Angsuran</th>
                <th className="px-6 py-4 font-semibold">Potongan / Bulan</th>
                <th className="px-6 py-4 font-semibold">Pengajuan</th>
                <th className="px-6 py-4 font-semibold">Approval</th>
                <th className="px-6 py-4 font-semibold">Mulai Potong</th>
                <th className="px-6 py-4 font-semibold">Bulan Potongan</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Progress</th>
                <th className="px-6 py-4 font-semibold">Sisa</th>
                <th className="px-6 py-4 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const isLocked = row.status !== "pending";
                  const isProcessingRow = isPending && processingId === row.id;

                  return (
                    <tr key={row.id} className="border-b border-[#f1e5de] align-top text-[#513d39] hover:bg-[#fffaf7]">
                      <td className="px-6 py-5 font-semibold text-[#241716]">{row.employeeName}</td>
                      <td className="px-6 py-5">{row.nip}</td>
                      <td className="px-6 py-5">
                        <div>{row.role}</div>
                        <div className="mt-1 text-xs text-[#8a6f68]">{row.department}</div>
                      </td>
                      <td className="px-6 py-5 font-semibold text-[#241716]">Rp{formatMoney(row.totalLoan)}</td>
                      <td className="px-6 py-5">{row.installmentCount}x</td>
                      <td className="px-6 py-5 font-semibold text-[#241716]">Rp{formatMoney(row.monthlyDeduction)}</td>
                      <td className="px-6 py-5">{row.requestDate}</td>
                      <td className="px-6 py-5">{row.approvalDate || "-"}</td>
                      <td className="px-6 py-5">{row.deductionStartDate || "Menunggu approval"}</td>
                      <td className="px-6 py-5">
                        {row.installments.length ? (
                          <div className="flex max-w-[420px] flex-wrap gap-2">
                            {row.installments.map((installment) => (
                              <span
                                key={`${row.id}-${installment.sequence}`}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${installment.isPaid ? "bg-[#e8faf0] text-[#17603b]" : "bg-[#f7efe9] text-[#6d524a]"}`}
                              >
                                {installment.monthLabel}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#8a6f68]">Belum ada jadwal</span>
                        )}
                      </td>
                      <td className="px-6 py-5"><StatusBadge status={row.status} /></td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-[#241716]">{row.paidInstallmentCount}/{row.installmentCount}</div>
                        <div className="mt-1 text-xs text-[#8a6f68]">Rp{formatMoney(row.totalPaid)} terpotong</div>
                      </td>
                      <td className="px-6 py-5 font-semibold text-[#8f1d22]">Rp{formatMoney(row.remainingBalance)}</td>
                      <td className="px-6 py-5">
                        {isLocked ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a18a84]">Final</span>
                        ) : (
                          <div className="flex min-w-[170px] gap-2">
                            <button
                              type="button"
                              onClick={() => handleAction(row.id, "approved")}
                              disabled={isProcessingRow}
                              className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#17603b] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessingRow ? "Proses..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(row.id, "rejected")}
                              disabled={isProcessingRow}
                              className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#b92f2f] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessingRow ? "Proses..." : "Reject"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="px-6 py-16 text-center">
                    <p className="text-base font-semibold text-[#3b2723]">Belum ada pengajuan pinjaman</p>
                    <p className="mt-2 text-sm text-[#8a6f68]">Data akan muncul otomatis setelah karyawan mengirim pengajuan pinjaman.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
