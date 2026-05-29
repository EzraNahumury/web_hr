"use client";

import { FormEvent, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type OvertimeRow = {
  id: number;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  total_jam: string;
  status_approval: "pending" | "approved" | "rejected";
  catatan_atasan: string | null;
  catatan_karyawan: string | null;
  assigned_approver_name?: string | null;
  jenis_pekerjaan?: string | null;
  deadline?: string | null;
  nama_order?: string | null;
  jumlah_qty?: number | null;
  target_sebelum_lembur?: number | null;
  target_setelah_lembur?: number | null;
  approval_flow?: "single" | "double";
  first_approval_status?: "pending" | "approved" | "rejected" | null;
  first_approver_name?: string | null;
};

type ApproverOption = {
  userId: number;
  name: string;
  role: string;
};

type Props = {
  employeeId: number;
  rows: OvertimeRow[];
  approvers: ApproverOption[];
  routesToAdmin: boolean;
  jabatan: string;
  divisi: string;
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

const ADMIN_OPTION_VALUE = "admin";

export default function EmployeeOvertimeManager({ employeeId, rows, approvers, routesToAdmin, jabatan, divisi }: Props) {
  const jabatanLower = jabatan.trim().toLowerCase();
  const isSupervisor = jabatanLower === "supervisor";
  const isManagerSubmitter = jabatanLower === "manager";
  const isProduksi = divisi.trim().toLowerCase() === "produksi";
  const approverLabel = isManagerSubmitter
    ? "Admin"
    : isSupervisor
      ? "Manager / Admin"
      : "Supervisor / SPV / Admin";
  const nonAdminApprovers = approvers.filter((a) => a.role.toLowerCase() !== "admin");
  const hasAdminOption = approvers.some((a) => a.role.toLowerCase() === "admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    tanggal: "",
    jamMulai: "",
    jamSelesai: "",
    assignedApproverUserId: "",
    catatanKaryawan: "",
    jenisPekerjaan: "",
    deadline: "",
    namaOrder: "",
    jumlahQty: "",
    targetSebelumLembur: "",
    targetSetelahLembur: "",
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

    if (!routesToAdmin && !form.assignedApproverUserId) {
      setError(`Pilih ${approverLabel} yang akan menerima pengajuan.`);
      return;
    }

    if (!form.jenisPekerjaan.trim()) {
      setError("Jenis pekerjaan wajib diisi.");
      return;
    }

    if (!form.deadline) {
      setError("Deadline wajib diisi.");
      return;
    }

    if (isProduksi) {
      if (!form.namaOrder.trim()) {
        setError("Nama order wajib diisi untuk divisi Produksi.");
        return;
      }
      if (!form.jumlahQty) {
        setError("Jumlah QTY wajib diisi untuk divisi Produksi.");
        return;
      }
      if (!form.targetSebelumLembur) {
        setError("Target sebelum lembur wajib diisi untuk divisi Produksi.");
        return;
      }
      if (!form.targetSetelahLembur) {
        setError("Target setelah lembur wajib diisi untuk divisi Produksi.");
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("karyawanId", String(employeeId));
      formData.append("tanggal", form.tanggal);
      formData.append("jamMulai", form.jamMulai);
      formData.append("jamSelesai", form.jamSelesai);
      if (!routesToAdmin) {
        formData.append("assignedApproverUserId", form.assignedApproverUserId);
      }
      if (buktiFile) {
        formData.append("buktiLembur", buktiFile);
      }
      if (form.catatanKaryawan.trim()) {
        formData.append("catatanKaryawan", form.catatanKaryawan.trim());
      }
      formData.append("jenisPekerjaan", form.jenisPekerjaan.trim());
      formData.append("deadline", form.deadline);
      if (isProduksi) {
        formData.append("namaOrder", form.namaOrder.trim());
        formData.append("jumlahQty", form.jumlahQty);
        formData.append("targetSebelumLembur", form.targetSebelumLembur);
        formData.append("targetSetelahLembur", form.targetSetelahLembur);
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

      setSuccess(
        routesToAdmin
          ? "Pengajuan lembur berhasil dikirim dan menunggu approval admin."
          : "Pengajuan lembur berhasil dikirim ke atasan yang dipilih.",
      );
      setForm({
        tanggal: "",
        jamMulai: "",
        jamSelesai: "",
        assignedApproverUserId: "",
        catatanKaryawan: "",
        jenisPekerjaan: "",
        deadline: "",
        namaOrder: "",
        jumlahQty: "",
        targetSebelumLembur: "",
        targetSetelahLembur: "",
      });
      setBuktiFile(null);
      setSelectedFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#ead7ce] bg-white p-6 shadow-[0_18px_40px_rgba(96,45,34,0.08)]">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-[#241716]">Form Pengajuan Lembur</h3>
          <p className="text-sm leading-6 text-[#7a6059]">
            {routesToAdmin
              ? "Isi tanggal dan jam lembur. Pengajuan Anda akan langsung diproses oleh admin."
              : `Isi tanggal dan jam lembur, lalu pilih ${approverLabel} yang akan menerima pengajuan.`}
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
            <span className="text-sm font-semibold text-[#2f1f1d]">Diajukan ke ({approverLabel})</span>
            {routesToAdmin ? (
              <div className="flex h-12 w-full items-center rounded-2xl border border-[#e4d4cc] bg-[#f8f3f0] px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#6b514b]">
                Admin
              </div>
            ) : (
              <select
                value={form.assignedApproverUserId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, assignedApproverUserId: event.target.value }))
                }
                required
                className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
              >
                <option value="">Pilih atasan</option>
                {nonAdminApprovers.map((option) => (
                  <option key={option.userId} value={option.userId}>
                    {option.name.toUpperCase()} — {option.role.toUpperCase()}
                  </option>
                ))}
                {hasAdminOption ? <option value={ADMIN_OPTION_VALUE}>ADMIN</option> : null}
              </select>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Jenis Pekerjaan</span>
            <input
              type="text"
              value={form.jenisPekerjaan}
              onChange={(event) =>
                setForm((current) => ({ ...current, jenisPekerjaan: event.target.value }))
              }
              placeholder="Contoh: Packing order, finishing produk, dll."
              className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Deadline</span>
            <input
              type="date"
              value={form.deadline}
              onChange={(event) =>
                setForm((current) => ({ ...current, deadline: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
              required
            />
          </label>

          {isProduksi ? (
            <div className="space-y-4 rounded-[24px] border border-[#f0d8d1] bg-[#fff7f3] p-5 md:col-span-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-full bg-[#8f1d22] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                  Produksi
                </span>
                <p className="text-xs text-[#7a6059]">
                  Field tambahan khusus karyawan divisi Produksi.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#2f1f1d]">Nama Order</span>
                  <input
                    type="text"
                    value={form.namaOrder}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, namaOrder: event.target.value }))
                    }
                    placeholder="Contoh: Order #1234 — Pesanan PT XYZ"
                    className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-white px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
                    required={isProduksi}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#2f1f1d]">Jumlah QTY</span>
                  <input
                    type="number"
                    min={0}
                    value={form.jumlahQty}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, jumlahQty: event.target.value }))
                    }
                    placeholder="Contoh: 500"
                    className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-white px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
                    required={isProduksi}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#2f1f1d]">Target Sebelum Lembur</span>
                  <input
                    type="number"
                    min={0}
                    value={form.targetSebelumLembur}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, targetSebelumLembur: event.target.value }))
                    }
                    placeholder="Contoh: 200"
                    className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-white px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
                    required={isProduksi}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#2f1f1d]">Target Setelah Lembur</span>
                  <input
                    type="number"
                    min={0}
                    value={form.targetSetelahLembur}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, targetSetelahLembur: event.target.value }))
                    }
                    placeholder="Contoh: 400"
                    className="h-12 w-full rounded-2xl border border-[#e4d4cc] bg-white px-4 text-sm text-[#241716] outline-none transition focus:border-[#c65e61]"
                    required={isProduksi}
                  />
                </label>
              </div>
            </div>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Catatan / Alasan Lembur</span>
            <textarea
              value={form.catatanKaryawan}
              onChange={(event) =>
                setForm((current) => ({ ...current, catatanKaryawan: event.target.value }))
              }
              rows={4}
              placeholder="Tuliskan alasan atau keterangan lembur..."
              className="w-full rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] px-4 py-3 text-sm text-[#241716] outline-none transition focus:border-[#c65e61] resize-none"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#2f1f1d]">Bukti Lembur</span>
            <div className="rounded-2xl border border-[#e4d4cc] bg-[#fffaf7] p-4">
              <input
                ref={fileInputRef}
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
              <th className="px-6 py-4">Diajukan Ke</th>
              <th className="px-6 py-4">Alasan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Catatan Atasan</th>
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
                <td className="px-6 py-4">{row.assigned_approver_name || "Admin"}</td>
                <td className="max-w-[180px] px-6 py-4 text-sm text-[#7a6059]">
                  {row.catatan_karyawan || "-"}
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1.5">
                    <StatusBadge status={row.status_approval} />
                    {row.approval_flow === "double" &&
                    row.status_approval === "pending" &&
                    row.first_approval_status === "approved" ? (
                      <span className="inline-flex w-fit rounded-full bg-[#eaf8ef] px-3 py-1 text-[10px] font-semibold text-[#1f8f4c]">
                        Disetujui atasan, menunggu admin
                      </span>
                    ) : null}
                    {row.approval_flow === "double" &&
                    row.status_approval === "pending" &&
                    (row.first_approval_status === "pending" || !row.first_approval_status) ? (
                      <span className="inline-flex w-fit rounded-full bg-[#fff7e6] px-3 py-1 text-[10px] font-semibold text-[#9c4d00]">
                        Menunggu approval atasan
                      </span>
                    ) : null}
                  </div>
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
