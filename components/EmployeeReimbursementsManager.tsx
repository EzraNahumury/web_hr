"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ReimbursementItem } from "@/lib/reimbursements";

type Props = {
  initialRows: ReimbursementItem[];
  defaultRequestDate: string;
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatMoney(value: string | number | null | undefined) {
  return toNumber(value).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function formatNumericInput(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

function StatusBadge({ status }: { status: ReimbursementItem["status"] }) {
  const styles =
    status === "approved"
      ? "bg-[#e8faf0] text-[#17603b]"
      : status === "rejected"
        ? "bg-[#fff0f0] text-[#b92f2f]"
        : "bg-[#eef2ff] text-[#4657df]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
}

export default function EmployeeReimbursementsManager({ initialRows, defaultRequestDate }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    requestDate: defaultRequestDate,
    expenseDate: defaultRequestDate,
    category: "Perjalanan Dinas",
    amount: "",
    description: "",
  });
  const [receipt, setReceipt] = useState<File | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("requestDate", form.requestDate);
        formData.append("expenseDate", form.expenseDate);
        formData.append("category", form.category);
        formData.append("amount", String(toNumber(digitsOnly(form.amount))));
        formData.append("description", form.description);
        if (receipt) formData.append("receipt", receipt);

        const response = await fetch("/api/employee/reimbursements", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; reimbursement?: ReimbursementItem };

        if (!response.ok || !result.reimbursement) {
          throw new Error(result.message || "Pengajuan reimburse gagal dikirim.");
        }

        setRows((current) => [result.reimbursement!, ...current]);
        setMessage({ type: "success", text: result.message || "Pengajuan reimburse berhasil dikirim." });
        setForm({
          requestDate: defaultRequestDate,
          expenseDate: defaultRequestDate,
          category: "Perjalanan Dinas",
          amount: "",
          description: "",
        });
        setReceipt(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#ead7ce] bg-white p-6 shadow-[0_18px_50px_rgba(96,45,34,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Pengajuan Reimburse</p>
        <h2 className="mt-3 text-2xl font-semibold text-[#241716]">Upload Nota Perjalanan Dinas</h2>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Tanggal Pengajuan</span>
            <input type="date" value={form.requestDate} onChange={(event) => setForm((current) => ({ ...current, requestDate: event.target.value }))} className={inputClassName} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Tanggal Biaya</span>
            <input type="date" value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} className={inputClassName} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Kategori</span>
            <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className={inputClassName} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Nominal</span>
            <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: formatNumericInput(event.target.value) }))} className={inputClassName} inputMode="numeric" required />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Keterangan</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-[#2d1b18] outline-none focus:border-[#c8716d]" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Nota</span>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#8f1d22] file:px-4 file:py-2 file:font-semibold file:text-white" required />
          </label>
          <div className="md:col-span-2">
            <button type="submit" disabled={isPending} className="h-12 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white disabled:opacity-60">{isPending ? "Mengirim..." : "Kirim Pengajuan"}</button>
          </div>
        </form>
        {message ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${message.type === "success" ? "bg-[#f2fbf4] text-[#267344]" : "bg-[#fff4f4] text-[#b13232]"}`}>{message.text}</div> : null}
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <div className="border-b border-[#eddad1] px-6 py-5">
          <h3 className="text-lg font-semibold text-[#241716]">Riwayat Reimburse</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Nota</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#f1e5de]">
                  <td className="px-6 py-4">{row.expenseDate}</td>
                  <td className="px-6 py-4">{row.category}</td>
                  <td className="px-6 py-4 font-semibold">Rp{formatMoney(row.amount)}</td>
                  <td className="px-6 py-4"><a href={row.receiptPath} target="_blank" className="font-semibold text-[#8f1d22]">Lihat nota</a></td>
                  <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                  <td className="px-6 py-4">{row.adminNote || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
