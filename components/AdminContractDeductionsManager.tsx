"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  ContractDeductionEmployeeOption,
  ContractDeductionPlanItem,
} from "@/lib/contract-deductions";

type ToastState = {
  type: "success" | "error";
  title: string;
  description: string;
} | null;

type Props = {
  initialRows: ContractDeductionPlanItem[];
  employeeOptions: ContractDeductionEmployeeOption[];
};

type FormState = {
  employeeId: string;
  nominalDeduction: string;
  description: string;
};

const emptyForm: FormState = {
  employeeId: "",
  nominalDeduction: "200.000",
  description: "Potongan kontrak 5 bulan pertama",
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none shadow-[0_1px_2px_rgba(15,23,42,0.03)] placeholder:text-[#b1948d] focus:border-[#c8716d] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

function formatRupiahInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");

  if (!digits) {
    return "";
  }

  return Number(digits).toLocaleString("id-ID");
}

function formatMoney(value: string | null) {
  if (!value) {
    return "-";
  }

  return Number(value).toLocaleString("id-ID");
}

export default function AdminContractDeductionsManager({
  initialRows,
  employeeOptions,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeEmployeeOptions = useMemo(
    () =>
      employeeOptions.filter(
        (employee) => employee.contractDate && employee.workStatus === "kontrak",
      ),
    [employeeOptions],
  );

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
        row.division,
        row.department,
        row.contractDate ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [rows, search]);

  function notify(type: "success" | "error", title: string, description: string) {
    setToast({ type, title, description });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingEmployeeId(null);
  }

  function handleEdit(row: ContractDeductionPlanItem) {
    setEditingEmployeeId(row.employeeId);
    setForm({
      employeeId: String(row.employeeId),
      nominalDeduction: formatRupiahInput(row.installments[0]?.nominalDeduction ?? "200000"),
      description: row.description ?? "Potongan kontrak 5 bulan pertama",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const employeeId = Number(form.employeeId);
      const nominalDeduction = Number(form.nominalDeduction.replace(/[^\d]/g, "") || 0);
      const response = await fetch(
        editingEmployeeId
          ? `/api/admin/contract-deductions/${editingEmployeeId}`
          : "/api/admin/contract-deductions",
        {
          method: editingEmployeeId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId,
            nominalDeduction,
            description: form.description,
          }),
        },
      );

      const result = (await response.json()) as {
        message?: string;
        row?: ContractDeductionPlanItem;
      };

      if (!response.ok || !result.row) {
        throw new Error(result.message || "Gagal menyimpan potongan kontrak.");
      }

      setRows((current) => {
        const next = current.filter((row) => row.employeeId !== result.row!.employeeId);
        return [result.row!, ...next].sort((a, b) =>
          a.employeeName.localeCompare(b.employeeName, "id-ID"),
        );
      });

      notify(
        "success",
        editingEmployeeId ? "Potongan diperbarui" : "Potongan ditambahkan",
        result.message ||
          (editingEmployeeId
            ? "Potongan kontrak berhasil diperbarui."
            : "Potongan kontrak 5 bulan pertama berhasil dibuat."),
      );
      resetForm();
    } catch (error) {
      notify(
        "error",
        "Simpan gagal",
        error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(row: ContractDeductionPlanItem) {
    const confirmed = window.confirm(
      `Hapus potongan kontrak 5 bulan pertama untuk ${row.employeeName}?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingEmployeeId(row.employeeId);

    try {
      const response = await fetch(`/api/admin/contract-deductions/${row.employeeId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus potongan kontrak.");
      }

      setRows((current) => current.filter((item) => item.employeeId !== row.employeeId));
      notify("success", "Potongan dihapus", result.message || "Potongan kontrak berhasil dihapus.");

      if (editingEmployeeId === row.employeeId) {
        resetForm();
      }
    } catch (error) {
      notify(
        "error",
        "Hapus gagal",
        error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus data.",
      );
    } finally {
      setDeletingEmployeeId(null);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="pointer-events-none fixed right-6 top-24 z-50 max-w-sm">
          <div
            className={[
              "rounded-[22px] border bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]",
              toast.type === "success" ? "border-emerald-200" : "border-rose-200",
            ].join(" ")}
          >
            <p className="text-sm font-semibold text-[#241716]">{toast.title}</p>
            <p className="mt-1 text-sm leading-6 text-[#7a6059]">{toast.description}</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.08),_transparent_36%),linear-gradient(180deg,#fffaf8_0%,#fff6f2_100%)] px-6 py-6">
          <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            Potongan Kontrak
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
            {editingEmployeeId ? "Update Potongan 5 Bulan" : "Buat Potongan 5 Bulan"}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#7a6059]">
            Potongan berlaku Rp200.000 per bulan untuk 5 bulan pertama sejak tanggal kontrak.
          </p>
        </div>

        <form className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
          <label className="space-y-2.5 xl:col-span-2">
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#6f5a54]">
              Karyawan Kontrak
            </span>
            <select
              value={form.employeeId}
              onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
              className={inputClassName}
              disabled={Boolean(editingEmployeeId)}
              required
            >
              <option value="">Pilih karyawan kontrak</option>
              {activeEmployeeOptions.map((employee) => (
                <option key={employee.employeeId} value={employee.employeeId}>
                  {employee.name} - {employee.nip}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2.5">
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#6f5a54]">
              Potongan per Bulan
            </span>
            <input
              value={form.nominalDeduction}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nominalDeduction: formatRupiahInput(event.target.value),
                }))
              }
              className={inputClassName}
              inputMode="numeric"
              placeholder="200.000"
              required
            />
          </label>

          <label className="space-y-2.5">
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#6f5a54]">
              Keterangan
            </span>
            <input
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className={inputClassName}
              placeholder="Potongan kontrak 5 bulan pertama"
            />
          </label>

          <div className="flex flex-wrap gap-3 xl:col-span-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(143,29,34,0.24)] hover:-translate-y-0.5 hover:bg-[#7b171d] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Menyimpan..."
                : editingEmployeeId
                  ? "Update Potongan"
                  : "Buat Potongan"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e7d4cb] bg-white px-6 text-sm font-semibold text-[#3b2622] hover:border-[#ca7771] hover:text-[#8f1d22]"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
                Rekap Potongan
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
                5 Bulan Pertama Kontrak
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#7a6059]">
                Potongan kontrak hanya berlaku pada 5 bulan pertama, lalu dikembalikan saat karyawan keluar.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIP, jabatan, departemen..."
              className={`${inputClassName} xl:max-w-sm`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1480px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#12dfe6] text-xs uppercase tracking-[0.16em] text-[#111111]">
                <th className="px-6 py-4 font-semibold">Nama</th>
                <th className="px-6 py-4 font-semibold">NIP</th>
                <th className="px-6 py-4 font-semibold">Jabatan</th>
                <th className="px-6 py-4 font-semibold">Divisi</th>
                <th className="px-6 py-4 font-semibold">Departemen</th>
                <th className="px-6 py-4 font-semibold">Kontrak</th>
                <th className="px-6 py-4 font-semibold">Kenaikan Tiap Tahun</th>
                <th className="px-6 py-4 font-semibold text-center">1</th>
                <th className="px-6 py-4 font-semibold text-center">2</th>
                <th className="px-6 py-4 font-semibold text-center">3</th>
                <th className="px-6 py-4 font-semibold text-center">4</th>
                <th className="px-6 py-4 font-semibold text-center">5</th>
                <th className="px-6 py-4 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.employeeId} className="border-b border-[#f1e5de] text-sm text-[#513d39] hover:bg-[#fffaf7]">
                    <td className="px-6 py-4 font-semibold text-[#241716]">{row.employeeName}</td>
                    <td className="px-6 py-4">{row.nip}</td>
                    <td className="px-6 py-4">{row.role}</td>
                    <td className="px-6 py-4">{row.division}</td>
                    <td className="px-6 py-4">{row.department}</td>
                    <td className="px-6 py-4">{row.contractDate || "-"}</td>
                    <td className="px-6 py-4">Rp{formatMoney(row.annualRaise)}</td>
                    {row.installments.map((installment) => (
                      <td key={`${row.employeeId}-${installment.sequence}`} className="px-4 py-4">
                        {installment.nominalDeduction ? (
                          <div className="min-w-[120px] rounded-2xl bg-[#fff7f2] px-3 py-2 text-center">
                            <div className="font-semibold text-[#241716]">
                              {formatMoney(installment.nominalDeduction)}
                            </div>
                            <div className="mt-1 text-xs text-[#7a6059]">
                              {installment.monthLabel}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[#b1948d]">-</div>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label={`Edit potongan kontrak ${row.employeeName}`}
                          title={`Edit potongan kontrak ${row.employeeName}`}
                          onClick={() => handleEdit(row)}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e8d5cc] bg-white text-[#3c2824] hover:border-[#c8736d] hover:text-[#8f1d22]"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M4 20h4l10-10a2.12 2.12 0 0 0-3-3L5 17v3Z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="m13.5 6.5 4 4" strokeLinecap="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus potongan kontrak ${row.employeeName}`}
                          title={`Hapus potongan kontrak ${row.employeeName}`}
                          onClick={() => handleDelete(row)}
                          disabled={deletingEmployeeId === row.employeeId}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6" strokeLinecap="round" />
                            <path d="M14 11v6" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center">
                    <p className="text-base font-semibold text-[#3b2723]">
                      Belum ada data potongan kontrak
                    </p>
                    <p className="mt-2 text-sm text-[#8a6f68]">
                      Buat potongan 5 bulan pertama untuk karyawan kontrak dari form di atas.
                    </p>
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
