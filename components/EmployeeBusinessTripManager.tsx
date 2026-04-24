"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { BusinessTripItem } from "@/lib/business-trips";

type Props = {
  initialRows: BusinessTripItem[];
  defaultDate: string;
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

function StatusBadge({ status }: { status: BusinessTripItem["status"] }) {
  const styles =
    status === "approved"
      ? "bg-[#e8faf0] text-[#17603b]"
      : status === "rejected"
        ? "bg-[#fff0f0] text-[#b92f2f]"
        : "bg-[#eef2ff] text-[#4657df]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

export default function EmployeeBusinessTripManager({ initialRows, defaultDate }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    startDate: defaultDate,
    endDate: defaultDate,
    note: "",
  });
  const [letter, setLetter] = useState<File | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("startDate", form.startDate);
        formData.append("endDate", form.endDate);
        formData.append("note", form.note);
        if (letter) {
          formData.append("letter", letter);
        }

        const response = await fetch("/api/employee/business-trips", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; businessTrip?: BusinessTripItem };

        if (!response.ok || !result.businessTrip) {
          throw new Error(result.message || "Pengajuan perjalanan dinas gagal dikirim.");
        }

        setRows((current) => [result.businessTrip!, ...current]);
        setMessage({ type: "success", text: result.message || "Pengajuan perjalanan dinas berhasil dikirim." });
        setForm({
          startDate: defaultDate,
          endDate: defaultDate,
          note: "",
        });
        setLetter(null);
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Pengajuan Dinas</p>
        <h2 className="mt-3 text-2xl font-semibold text-[#241716]">Perjalanan Dinas</h2>
        <p className="mt-2 text-sm text-[#7a6059]">
          Isi rentang tanggal dinas dan upload surat. Setelah admin approve, absensi otomatis diisi hadir dari tanggal mulai sampai tanggal selesai.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Tanggal Mulai</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              className={inputClassName}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Tanggal Selesai</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              className={inputClassName}
              required
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Catatan</span>
            <textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              className="min-h-24 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-[#2d1b18] outline-none focus:border-[#c8716d]"
              placeholder="Tujuan dinas, agenda, dan keterangan tambahan"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Surat Perjalanan Dinas</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(event) => setLetter(event.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#8f1d22] file:px-4 file:py-2 file:font-semibold file:text-white"
              required
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="h-12 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Mengirim..." : "Kirim Pengajuan Dinas"}
            </button>
          </div>
        </form>

        {message ? (
          <div
            className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
              message.type === "success" ? "bg-[#f2fbf4] text-[#267344]" : "bg-[#fff4f4] text-[#b13232]"
            }`}
          >
            {message.text}
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <div className="border-b border-[#eddad1] px-6 py-5">
          <h3 className="text-lg font-semibold text-[#241716]">Riwayat Perjalanan Dinas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Surat</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Catatan Karyawan</th>
                <th className="px-6 py-4">Catatan Admin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#f1e5de]">
                  <td className="px-6 py-4">
                    {row.startDate} s/d {row.endDate}
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
                  <td className="px-6 py-4">{row.adminNote || "-"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-[#8a6f68]" colSpan={5}>
                    Belum ada pengajuan perjalanan dinas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
