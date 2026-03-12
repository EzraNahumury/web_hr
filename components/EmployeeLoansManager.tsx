"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { LoanListItem } from "@/lib/loans";

type Props = {
  employeeName: string;
  initialRows: LoanListItem[];
  defaultRequestDate: string;
};

type FormState = {
  totalLoan: string;
  installmentCount: string;
  requestDate: string;
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

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

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatMoney(value: string | number | null | undefined) {
  const amount = toNumber(value);

  return amount.toLocaleString("id-ID", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatNumericInput(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("id-ID") : "";
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

export default function EmployeeLoansManager({ employeeName, initialRows, defaultRequestDate }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<FormState>({
    totalLoan: "",
    installmentCount: "",
    requestDate: defaultRequestDate,
  });

  const summary = useMemo(
    () =>
      rows.reduce(
        (total, row) => ({
          total: total.total + 1,
          pending: total.pending + (row.status === "pending" ? 1 : 0),
          active: total.active + (["approved", "berjalan"].includes(row.status) ? 1 : 0),
          remaining: total.remaining + (["approved", "berjalan"].includes(row.status) ? toNumber(row.remainingBalance) : 0),
        }),
        { total: 0, pending: 0, active: 0, remaining: 0 },
      ),
    [rows],
  );

  const totalLoanNumber = toNumber(digitsOnly(form.totalLoan));
  const installmentCountNumber = toNumber(form.installmentCount);
  const estimatedMonthlyDeduction = installmentCountNumber > 0 ? totalLoanNumber / installmentCountNumber : 0;

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm({
      totalLoan: "",
      installmentCount: "",
      requestDate: defaultRequestDate,
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/employee/loans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            totalLoan: totalLoanNumber,
            installmentCount: installmentCountNumber,
            requestDate: form.requestDate,
          }),
        });

        const result = (await response.json()) as { message?: string; loan?: LoanListItem };

        if (!response.ok || !result.loan) {
          throw new Error(result.message || "Pengajuan pinjaman gagal dikirim.");
        }

        setRows((current) => [result.loan!, ...current]);
        setMessage({
          type: "success",
          text: result.message || "Pengajuan pinjaman berhasil dikirim dan menunggu approval admin.",
        });
        resetForm();
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat mengirim pengajuan.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Total Pengajuan</p>
          <p className="mt-3 text-3xl font-semibold text-[#241716]">{summary.total}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Pending</p>
          <p className="mt-3 text-3xl font-semibold text-[#4657df]">{summary.pending}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">Pinjaman Aktif</p>
          <p className="mt-3 text-3xl font-semibold text-[#17603b]">{summary.active}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-[linear-gradient(135deg,#8f1d22_0%,#c65d4a_100%)] p-5 text-white shadow-[0_18px_36px_rgba(143,29,34,0.2)]">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70">Sisa Pinjaman</p>
          <p className="mt-3 text-3xl font-semibold">Rp{formatMoney(summary.remaining)}</p>
        </article>
      </section>

      <section className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_18px_50px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] px-6 py-6">
          <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            Pengajuan Pinjaman
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">Ajukan Pinjaman Karyawan</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#7a6059]">
            Setelah admin approve, potongan pinjaman akan otomatis mulai di bulan berikutnya dan langsung masuk ke payroll summary pada bulan cicilan yang sesuai.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#2f1f1d]">Nama Karyawan</span>
              <input value={employeeName} readOnly className={`${inputClassName} bg-[#f8f3f0] text-[#6b514b]`} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#2f1f1d]">Tanggal Pengajuan</span>
              <input
                type="date"
                value={form.requestDate}
                onChange={(event) => updateField("requestDate", event.target.value)}
                className={inputClassName}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#2f1f1d]">Jumlah Pinjaman</span>
              <input
                value={form.totalLoan}
                onChange={(event) => updateField("totalLoan", formatNumericInput(event.target.value))}
                className={inputClassName}
                inputMode="numeric"
                placeholder="Contoh: 5.000.000"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#2f1f1d]">Jumlah Angsuran</span>
              <input
                type="number"
                min={1}
                value={form.installmentCount}
                onChange={(event) => updateField("installmentCount", event.target.value)}
                className={inputClassName}
                placeholder="Contoh: 5"
                required
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Preview Otomatis</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-[22px] bg-[#f9f3ef] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">Potongan per Bulan</p>
                <p className="mt-2 text-2xl font-semibold text-[#241716]">Rp{formatMoney(estimatedMonthlyDeduction)}</p>
              </div>
              <div className="rounded-[22px] bg-[#f9f3ef] px-4 py-4 text-sm leading-7 text-[#6f5a54]">
                Cicilan baru aktif mulai bulan setelah pinjaman di-approve admin. Sistem akan menghitung bulan potongan otomatis tanpa input tambahan.
              </div>
            </div>
          </div>

          <div className="xl:col-span-2">
            {message ? (
              <div className={`rounded-2xl px-4 py-3 text-sm ${message.type === "success" ? "border border-[#cfe8d4] bg-[#f2fbf4] text-[#267344]" : "border border-[#f2c4c4] bg-[#fff4f4] text-[#b13232]"}`}>
                {message.text}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Mengirim..." : "Kirim Pengajuan"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e7d4cb] bg-white px-6 text-sm font-semibold text-[#3b2622]"
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white shadow-[0_18px_50px_rgba(96,45,34,0.06)]">
        <div className="border-b border-[#eddad1] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Riwayat Pinjaman</p>
          <h3 className="mt-3 text-2xl font-semibold text-[#241716]">Status Pengajuan dan Cicilan</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-6 py-4 font-semibold">Tanggal Pengajuan</th>
                <th className="px-6 py-4 font-semibold">Total Pinjaman</th>
                <th className="px-6 py-4 font-semibold">Angsuran</th>
                <th className="px-6 py-4 font-semibold">Potongan / Bulan</th>
                <th className="px-6 py-4 font-semibold">Approval</th>
                <th className="px-6 py-4 font-semibold">Mulai Potong</th>
                <th className="px-6 py-4 font-semibold">Bulan Potongan</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Sudah Bayar</th>
                <th className="px-6 py-4 font-semibold">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f1e5de] align-top text-[#513d39] hover:bg-[#fffaf7]">
                    <td className="px-6 py-5">{row.requestDate}</td>
                    <td className="px-6 py-5 font-semibold text-[#241716]">Rp{formatMoney(row.totalLoan)}</td>
                    <td className="px-6 py-5">{row.installmentCount}x</td>
                    <td className="px-6 py-5 font-semibold text-[#241716]">Rp{formatMoney(row.monthlyDeduction)}</td>
                    <td className="px-6 py-5">{row.approvalDate || "Menunggu approval"}</td>
                    <td className="px-6 py-5">{row.deductionStartDate || "-"}</td>
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
                    <td className="px-6 py-5 font-semibold text-[#17603b]">Rp{formatMoney(row.totalPaid)}</td>
                    <td className="px-6 py-5 font-semibold text-[#8f1d22]">Rp{formatMoney(row.remainingBalance)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <p className="text-base font-semibold text-[#3b2723]">Belum ada pengajuan pinjaman</p>
                    <p className="mt-2 text-sm text-[#8a6f68]">Ajukan pinjaman dari form di atas. Status approval dan jadwal potongan akan muncul otomatis di sini.</p>
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
