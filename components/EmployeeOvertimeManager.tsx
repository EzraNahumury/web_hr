"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type OvertimeRow = {
  id: number;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  total_jam: string;
  status_approval: "pending" | "approved" | "rejected";
  catatan_atasan: string | null;
};

type Props = {
  employeeId: number;
  rows: OvertimeRow[];
};

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

export default function EmployeeOvertimeManager({ employeeId, rows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [form, setForm] = useState({
    tanggal: "",
    jamMulai: "",
    jamSelesai: "",
  });
  const [buktiFile, setBuktiFile] = useState<File | null>(null);

  const estimatedHours = useMemo(() => {
    if (!form.tanggal || !form.jamMulai || !form.jamSelesai) {
      return "0.00";
    }

    const start = new Date(`${form.tanggal}T${form.jamMulai}:00`);
    const end = new Date(`${form.tanggal}T${form.jamSelesai}:00`);
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (!Number.isFinite(diffHours) || diffHours <= 0) {
      return "0.00";
    }

    return diffHours.toFixed(2);
  }, [form]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("karyawanId", String(employeeId));
      formData.append("tanggal", form.tanggal);
      formData.append("jamMulai", form.jamMulai);
      formData.append("jamSelesai", form.jamSelesai);
      if (buktiFile) {
        formData.append("buktiLembur", buktiFile);
      }

      const response = await fetch("/api/employee/overtime", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Pengajuan lembur gagal disimpan.");
        return;
      }

      setSuccess("Pengajuan lembur berhasil dikirim dan menunggu approval admin.");
      setForm({
        tanggal: "",
        jamMulai: "",
        jamSelesai: "",
      });
      setBuktiFile(null);
      setSelectedFileName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#ead7ce] bg-white p-6 shadow-[0_18px_40px_rgba(96,45,34,0.08)]">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-[#241716]">Form Pengajuan Lembur</h3>
          <p className="text-sm leading-6 text-[#7a6059]">
            Isi tanggal dan jam lembur. Setelah dikirim, admin akan melihat request ini dan
            memutuskan approve atau reject.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Tanggal Lembur</span>
            <input
              type="date"
              value={form.tanggal}
              onChange={(event) => setForm((current) => ({ ...current, tanggal: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#2f1f1d]">Jam Mulai</span>
              <input
                type="time"
                value={form.jamMulai}
                onChange={(event) =>
                  setForm((current) => ({ ...current, jamMulai: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#2f1f1d]">Jam Selesai</span>
              <input
                type="time"
                value={form.jamSelesai}
                onChange={(event) =>
                  setForm((current) => ({ ...current, jamSelesai: event.target.value }))
                }
                className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
                required
              />
            </label>
          </div>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Bukti Lembur</span>
            <div className="rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] p-4">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setBuktiFile(nextFile);
                  setSelectedFileName(nextFile?.name ?? "");
                }}
                className="block w-full text-sm text-[#241716] file:mr-4 file:rounded-xl file:border-0 file:bg-[#8f1d22] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              <p className="mt-3 text-sm text-[#7a6059]">
                {selectedFileName || "Upload screenshot atau bukti lembur yang disetujui atasan."}
              </p>
            </div>
          </label>

          <div className="rounded-2xl border border-[#ead7ce] bg-[#fff7f3] px-4 py-3 text-sm text-[#7a6059]">
            Estimasi total lembur: <span className="font-semibold text-[#241716]">{estimatedHours} jam</span>
          </div>

          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="h-12 rounded-2xl bg-[linear-gradient(135deg,#8f1d22_0%,#ba4846_100%)] px-6 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(143,29,34,0.2)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </div>
        </form>

        {(error || success) && (
          <div
            className={
              error
                ? "mt-4 rounded-2xl border border-[#f3c7c7] bg-[#fff4f4] px-4 py-3 text-sm text-[#b13232]"
                : "mt-4 rounded-2xl border border-[#cfe8d4] bg-[#f2fbf4] px-4 py-3 text-sm text-[#267344]"
            }
          >
            {error ?? success}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
        <div className="border-b border-[#efe0d8] px-6 py-5">
          <h3 className="text-lg font-semibold text-[#241716]">Riwayat Pengajuan</h3>
        </div>
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Jam</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#f1e5de]">
                <td className="px-6 py-4">{row.tanggal}</td>
                <td className="px-6 py-4">
                  {row.jam_mulai} - {row.jam_selesai}
                </td>
                <td className="px-6 py-4">{row.total_jam} jam</td>
                <td className="px-6 py-4">
                  <StatusBadge status={row.status_approval} />
                </td>
                <td className="px-6 py-4">{row.catatan_atasan || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
