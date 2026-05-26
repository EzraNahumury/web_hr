"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type PendingItem = {
  payrollId: number;
  employeeId: number;
  name: string;
  role: string;
  division: string;
  periodLabel: string;
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
  periodMonth: number;
  periodYear: number;
};

export default function AdminPayslipDistribution({ pending, logs, periodMonth, periodYear }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentMonthInputValue = `${periodYear}-${String(periodMonth).padStart(2, "0")}`;

  function handlePeriodChange(value: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month)) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", String(month));
      params.set("year", String(year));
      router.replace(`/admin/payslip-distribution?${params.toString()}`, { scroll: false });
    });
  }
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(pending.map((item) => item.payrollId)),
  );
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const allSelected = useMemo(
    () => pending.length > 0 && pending.every((item) => selectedIds.has(item.payrollId)),
    [pending, selectedIds],
  );

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map((item) => item.payrollId)));
    }
  }

  function toggleOne(payrollId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(payrollId)) {
        next.delete(payrollId);
      } else {
        next.add(payrollId);
      }
      return next;
    });
  }

  function handleDistribute() {
    setFeedback(null);
    const payrollIds = Array.from(selectedIds);

    if (payrollIds.length === 0) {
      setFeedback({ type: "error", text: "Centang minimal satu karyawan terlebih dahulu." });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/payslip-distribution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payrollIds }),
        });
        const result = (await response.json()) as { message?: string; distributed?: number };

        if (!response.ok) {
          setFeedback({ type: "error", text: result.message || "Gagal mendistribusikan slip." });
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
      <section className="rounded-[28px] border border-[#ead7ce] bg-white px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Periode Distribusi</p>
            <p className="mt-2 text-sm text-[#7a6059]">Pilih periode payroll untuk melihat slip yang siap didistribusikan.</p>
          </div>
          <input
            type="month"
            value={currentMonthInputValue}
            onChange={(event) => handlePeriodChange(event.target.value)}
            disabled={isPending}
            className="h-11 w-full max-w-xs rounded-2xl border border-[#d9cbc5] bg-white px-4 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_4px_rgba(201,127,91,0.14)] disabled:opacity-60"
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#ead7ce] bg-[#fff8f4] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#2f1f1d]">Distribusi Slip Gaji</p>
            <p className="mt-1 text-sm text-[#7a6059]">
              Centang karyawan yang akan menerima slip, lalu klik tombol Distribusi Slip Gaji.
            </p>
            <p className="mt-2 text-xs font-medium text-[#a16f63]">
              Terpilih: {selectedCount} dari {pending.length} karyawan
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 md:items-end">
            <button
              type="button"
              onClick={handleDistribute}
              disabled={isPending || pending.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8f1d22] px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(143,29,34,0.25)] transition hover:bg-[#a12228] hover:shadow-[0_4px_14px_rgba(143,29,34,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
              {isPending ? "Mendistribusikan..." : "Distribusi Slip Gaji"}
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
            Daftar Slip Pending
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#241716]">
            Karyawan dengan Slip Siap Didistribusikan
          </h3>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-260px)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-6 py-4">Nama Karyawan</th>
                <th className="px-6 py-4">Jabatan</th>
                <th className="px-6 py-4">Divisi</th>
                <th className="px-6 py-4">Periode</th>
                <th className="px-6 py-4 text-right">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={pending.length === 0}
                      className="h-4 w-4 cursor-pointer accent-[#8f1d22]"
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Pilih Semua</span>
                  </label>
                </th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-[#7a6059]">
                    Tidak ada slip baru untuk didistribusikan.
                  </td>
                </tr>
              ) : (
                pending.map((item) => (
                  <tr key={item.payrollId} className="border-b border-[#f1e5de] text-[#513d39] hover:bg-[#fffaf7]">
                    <td className="px-6 py-4 font-semibold uppercase text-[#241716]">{item.name}</td>
                    <td className="px-6 py-4">{item.role || "-"}</td>
                    <td className="px-6 py-4">{item.division || "-"}</td>
                    <td className="px-6 py-4">{item.periodLabel}</td>
                    <td className="px-6 py-4 text-right">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.payrollId)}
                        onChange={() => toggleOne(item.payrollId)}
                        className="h-5 w-5 cursor-pointer accent-[#8f1d22]"
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
            Slip yang Sudah Didistribusikan
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
                    Belum ada slip yang didistribusikan.
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
