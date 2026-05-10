"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type PendingItem = {
  payrollBonusId: number;
  employeeId: number;
  name: string;
  role: string;
  division: string;
  periodLabel: string;
  bonusTypeLabel: string;
  amount: number;
};

type LogItem = {
  id: number;
  nomorSlip: string;
  name: string;
  distributedBy: string;
  distributedAt: string;
  slipStatus: string;
  isRead: boolean;
};

type Props = {
  pending: PendingItem[];
  logs: LogItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminBonusSlipDistribution({ pending, logs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(pending.map((item) => item.payrollBonusId)),
  );
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const allSelected = useMemo(
    () => pending.length > 0 && pending.every((item) => selectedIds.has(item.payrollBonusId)),
    [pending, selectedIds],
  );

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map((item) => item.payrollBonusId)));
    }
  }

  function toggleOne(payrollBonusId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(payrollBonusId)) {
        next.delete(payrollBonusId);
      } else {
        next.add(payrollBonusId);
      }
      return next;
    });
  }

  function handleDistribute() {
    setFeedback(null);
    const payrollBonusIds = Array.from(selectedIds);

    if (payrollBonusIds.length === 0) {
      setFeedback({ type: "error", text: "Centang minimal satu karyawan terlebih dahulu." });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/bonus-slip-distribution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payrollBonusIds }),
        });
        const result = (await response.json()) as { message?: string; distributed?: number };

        if (!response.ok) {
          setFeedback({ type: "error", text: result.message || "Gagal mendistribusikan slip bonus." });
          return;
        }

        setFeedback({ type: "success", text: result.message || "Distribusi berhasil." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#e3d5a8] bg-[#fff7d6] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#5b4400]">Distribusi Slip Bonus</p>
            <p className="mt-1 text-sm text-[#7c5b00]">
              Centang karyawan yang akan menerima slip bonus, lalu klik tombol Distribusi Slip Bonus.
            </p>
            <p className="mt-2 text-xs font-medium text-[#a07c00]">
              Terpilih: {selectedCount} dari {pending.length} karyawan
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 md:items-end">
            <button
              type="button"
              onClick={handleDistribute}
              disabled={isPending || pending.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#a07c00] px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(160,124,0,0.25)] transition hover:bg-[#7c5b00] hover:shadow-[0_4px_14px_rgba(160,124,0,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
              )}
              {isPending ? "Mendistribusikan..." : "Distribusi Slip Bonus"}
            </button>

            {feedback ? (
              <p
                className={
                  feedback.type === "success"
                    ? "max-w-xs rounded-lg bg-emerald-50 px-3 py-1.5 text-right text-xs font-medium text-emerald-700"
                    : "max-w-xs rounded-lg bg-rose-50 px-3 py-1.5 text-right text-xs font-medium text-rose-700"
                }
              >
                {feedback.text}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <div className="border-b border-[#eddad1] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            Daftar Slip Bonus Pending
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#241716]">
            Karyawan dengan Slip Bonus Siap Didistribusikan
          </h3>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-260px)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-6 py-4">Nama Karyawan</th>
                <th className="px-6 py-4">Jabatan</th>
                <th className="px-6 py-4">Divisi</th>
                <th className="px-6 py-4">Tipe Bonus</th>
                <th className="px-6 py-4">Periode</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4 text-right">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={pending.length === 0}
                      className="h-4 w-4 cursor-pointer accent-[#a07c00]"
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Pilih Semua</span>
                  </label>
                </th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#7a6059]">
                    Tidak ada slip bonus baru untuk didistribusikan.
                  </td>
                </tr>
              ) : (
                pending.map((item) => (
                  <tr key={item.payrollBonusId} className="border-b border-[#f1e5de] text-[#513d39] hover:bg-[#fffaf7]">
                    <td className="px-6 py-4 font-semibold uppercase text-[#241716]">{item.name}</td>
                    <td className="px-6 py-4">{item.role || "-"}</td>
                    <td className="px-6 py-4">{item.division || "-"}</td>
                    <td className="px-6 py-4">{item.bonusTypeLabel}</td>
                    <td className="px-6 py-4">{item.periodLabel}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.payrollBonusId)}
                        onChange={() => toggleOne(item.payrollBonusId)}
                        className="h-5 w-5 cursor-pointer accent-[#a07c00]"
                        aria-label={`Centang ${item.name}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <div className="border-b border-[#eddad1] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            Riwayat Distribusi
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#241716]">
            Slip Bonus yang Sudah Didistribusikan
          </h3>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-260px)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-6 py-4">Slip</th>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Didistribusikan Oleh</th>
                <th className="px-6 py-4">Tanggal Distribusi</th>
                <th className="px-6 py-4">Status Slip</th>
                <th className="px-6 py-4">Status Baca</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#7a6059]">
                    Belum ada slip bonus yang didistribusikan.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="border-b border-[#f1e5de] text-[#513d39]">
                    <td className="px-6 py-4 font-semibold text-[#241716]">{row.nomorSlip}</td>
                    <td className="px-6 py-4 uppercase">{row.name}</td>
                    <td className="px-6 py-4">{row.distributedBy}</td>
                    <td className="px-6 py-4">{row.distributedAt}</td>
                    <td className="px-6 py-4">{row.slipStatus}</td>
                    <td className="px-6 py-4">{row.isRead ? "Sudah dibaca" : "Belum dibaca"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
