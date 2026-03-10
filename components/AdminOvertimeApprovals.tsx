"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type OvertimeRow = {
  id: number;
  nama: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  total_jam: string;
  bukti_lembur: string | null;
  status_approval: "pending" | "approved" | "rejected";
  approver_name: string | null;
  catatan_atasan: string | null;
};

type Props = {
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

export default function AdminOvertimeApprovals({ rows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<number, string>>(
    Object.fromEntries(rows.map((row) => [row.id, row.catatan_atasan ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; isImage: boolean } | null>(null);

  function updateApproval(id: number, status: "approved" | "rejected") {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/overtime/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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

  const totalApproved = rows.filter((row) => row.status_approval === "approved").length;
  const totalPending = rows.filter((row) => row.status_approval === "pending").length;
  const totalRejected = rows.filter((row) => row.status_approval === "rejected").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">
            Total Request
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#172033]">{rows.length}</p>
        </div>
        <div className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">
            Pending
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#4a5dff]">{totalPending}</p>
        </div>
        <div className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">
            Approved
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#1f8f4c]">{totalApproved}</p>
        </div>
        <div className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">
            Rejected
          </p>
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
          <h3 className="text-lg font-semibold text-[#172033]">Daftar Pengajuan Lembur</h3>
          <p className="mt-1 text-sm text-[#66748f]">
            Admin hanya perlu review data dan klik approve atau reject.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e7edf5] bg-[#f8fafc] text-xs uppercase tracking-[0.18em] text-[#8a96ad]">
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Jam</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Bukti</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Catatan</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isLocked = row.status_approval !== "pending";

                return (
                  <tr key={row.id} className="border-b border-[#eef2f7] text-[#42506a]">
                    <td className="px-6 py-4 font-semibold text-[#172033]">{row.nama}</td>
                    <td className="px-6 py-4">{row.tanggal}</td>
                    <td className="px-6 py-4">
                      {row.jam_mulai} - {row.jam_selesai}
                    </td>
                    <td className="px-6 py-4">{row.total_jam} jam</td>
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
                          disabled={isPending || isLocked}
                          className="rounded-xl bg-[#19a15f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#14874f] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updateApproval(row.id, "rejected")}
                          disabled={isPending || isLocked}
                          className="rounded-xl bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d73737] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-4xl rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a96ad]">
                  Bukti Lembur
                </p>
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
