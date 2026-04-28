"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { PayrollPeriodOption } from "@/lib/payroll-admin";
import type {
  PayrollBonusEmployeeOption,
  PayrollBonusSheet,
  PayrollBonusSheetRow,
} from "@/lib/payroll-bonus";

type Props = {
  sheet: PayrollBonusSheet | null;
  employeeOptions: PayrollBonusEmployeeOption[];
  periodOptions: PayrollPeriodOption[];
  basePath?: string;
};

type FormState = {
  employeeId: string;
  amount: string;
  note: string;
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#d5e9ea] bg-white px-4 text-[#173033] outline-none placeholder:text-[#87a6a8] focus:border-[#19d7df] focus:shadow-[0_0_0_4px_rgba(25,215,223,0.16)]";

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatNumericInput(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

function parseNumber(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits) : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function emptyForm(employeeId = ""): FormState {
  return { employeeId, amount: "", note: "" };
}

function buildFormFromRow(row: PayrollBonusSheetRow): FormState {
  return {
    employeeId: String(row.employeeId),
    amount: formatNumericInput(String(row.amount)),
    note: row.note ?? "",
  };
}

export default function AdminPayrollBonusManager({
  sheet,
  employeeOptions,
  periodOptions,
  basePath = "/admin/payroll-bonus",
}: Props) {
  const router = useRouter();
  const [isSubmitPending, startSubmitTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const initialMonthYear = sheet
    ? `${sheet.periodYear}-${String(sheet.periodMonth).padStart(2, "0")}`
    : periodOptions[0]
      ? `${periodOptions[0].year}-${String(periodOptions[0].month).padStart(2, "0")}`
      : "";
  const [selectedPeriod, setSelectedPeriod] = useState(initialMonthYear);
  const [form, setForm] = useState<FormState>(emptyForm(""));

  const selectedRowEmployee = useMemo(
    () => employeeOptions.find((item) => item.employeeId === Number(form.employeeId)) ?? null,
    [employeeOptions, form.employeeId],
  );
  const savedEmployeeIds = useMemo(
    () => new Set(sheet?.rows.map((row) => row.employeeId) ?? []),
    [sheet],
  );
  const availableEmployeeOptions = useMemo(
    () =>
      editingId
        ? employeeOptions
        : employeeOptions.filter((employee) => !savedEmployeeIds.has(employee.employeeId)),
    [editingId, employeeOptions, savedEmployeeIds],
  );

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm(nextEmployeeId?: string) {
    setEditingId(null);
    setForm(emptyForm(nextEmployeeId ?? ""));
  }

  function handlePeriodChange(value: string) {
    setSelectedPeriod(value);
    resetForm();
    setMessage(null);
    const [year, month] = value.split("-");
    router.push(`${basePath}?month=${month}&year=${year}`);
  }

  function handleEditRow(row: PayrollBonusSheetRow) {
    setEditingId(row.id);
    setMessage(null);
    setForm(buildFormFromRow(row));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleteRow(rowId: number) {
    const target = sheet?.rows.find((item) => item.id === rowId);
    if (!target || !window.confirm(`Hapus bonus ${target.name} untuk periode ini?`)) return;

    startDeleteTransition(async () => {
      try {
        const response = await fetch(`/api/admin/payroll-bonus/${rowId}`, { method: "DELETE" });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) {
          throw new Error(result.message || "Gagal menghapus payroll bonus.");
        }
        if (editingId === rowId) {
          resetForm();
        }
        setMessage({ type: "success", text: result.message || "Payroll bonus berhasil dihapus." });
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus payroll bonus.",
        });
      }
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const [year, month] = selectedPeriod.split("-");
    const payload = {
      month: Number(month),
      year: Number(year),
      employeeId: Number(form.employeeId),
      amount: parseNumber(form.amount),
      note: form.note.trim(),
    };

    startSubmitTransition(async () => {
      try {
        const response = await fetch("/api/admin/payroll-bonus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) {
          throw new Error(result.message || "Gagal menyimpan payroll bonus.");
        }
        resetForm();
        setMessage({ type: "success", text: result.message || "Payroll bonus berhasil disimpan." });
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan payroll bonus.",
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end md:justify-between">
          <label className="block space-y-2">
            <span className="block text-[13px] font-semibold text-[#466668]">Periode Payroll Bonus</span>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(event) => handlePeriodChange(event.target.value)}
              className={inputClassName}
            />
          </label>
          <div className="rounded-[22px] bg-[#f5fbfb] px-4 py-3 text-sm text-[#47696b]">
            Payroll bonus ini untuk Sales, SPV, Manager, CS, dan Host Live, serta tidak ikut perhitungan finance.
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-[#cfeaec] bg-[linear-gradient(180deg,#f9ffff_0%,#f2fcfc_100%)] p-6"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0c8087]">Payroll Bonus Khusus</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#123336]">Input Bonus</h2>
            <p className="mt-2 text-sm text-[#628083]">
              Bonus disimpan terpisah dari payroll utama.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block space-y-2">
              <span className="block text-[13px] font-semibold text-[#466668]">Nama Karyawan (Sales/SPV/Manager/CS/Host Live)</span>
              <select
                value={form.employeeId}
                onChange={(event) => updateField("employeeId", event.target.value)}
                className={`${inputClassName} appearance-none`}
                required
              >
                <option value="">Pilih karyawan</option>
                {availableEmployeeOptions.map((employee) => (
                  <option key={employee.employeeId} value={employee.employeeId}>
                    {employee.name} - {employee.role}
                  </option>
                ))}
              </select>
            </label>

            {selectedRowEmployee ? (
              <div className="rounded-[24px] border border-[#d5e9ea] bg-white px-5 py-5 text-sm text-[#35585b]">
                <p className="font-semibold text-[#19393d]">{selectedRowEmployee.name}</p>
                <p className="mt-2">
                  {selectedRowEmployee.role} | {selectedRowEmployee.division} | {selectedRowEmployee.department}
                </p>
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="block text-[13px] font-semibold text-[#466668]">Nominal Bonus</span>
              <input
                value={form.amount}
                onChange={(event) => updateField("amount", formatNumericInput(event.target.value))}
                className={inputClassName}
                inputMode="numeric"
                placeholder="Contoh: 1.500.000"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="block text-[13px] font-semibold text-[#466668]">Catatan (opsional)</span>
              <textarea
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                className="w-full rounded-2xl border border-[#d5e9ea] bg-white px-4 py-3 text-[#173033] outline-none placeholder:text-[#87a6a8] focus:border-[#19d7df] focus:shadow-[0_0_0_4px_rgba(25,215,223,0.16)]"
                rows={3}
                placeholder="Keterangan bonus"
              />
            </label>
          </div>

          {message ? (
            <div
              className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-[#def8eb] text-[#17603b]"
                  : "bg-[#ffe4e4] text-[#8b2626]"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitPending || !form.employeeId}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0d7f86] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitPending ? "Menyimpan..." : editingId ? "Update Bonus" : "Simpan Bonus"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => resetForm()}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#cfeaec] bg-white px-6 text-sm font-semibold text-[#35585b]"
              >
                Batal Edit
              </button>
            ) : null}
          </div>
        </form>

        <section className="grid gap-4">
          <article className="rounded-[30px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)] px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Periode</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#241716]">
              {sheet?.periodLabel ?? "-"}
            </h2>
            <p className="mt-2 text-sm text-[#7a6059]">Total bonus periode ini</p>
            <p className="mt-2 text-2xl font-semibold text-[#8f1d22]">
              {formatCurrency(sheet?.totalAmount ?? 0)}
            </p>
          </article>
        </section>
      </section>

      <div className="overflow-hidden rounded-[32px] border border-[#d9efef] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm text-[#1d1d1d]">
            <thead>
              <tr className="bg-[#19d7df] text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#062e31]">
                <th className="border border-[#a8ebef] px-3 py-3">No</th>
                <th className="sticky left-0 z-20 border border-[#a8ebef] bg-[#19d7df] px-3 py-3 text-left">Nama</th>
                <th className="border border-[#a8ebef] px-3 py-3 text-left">Jabatan</th>
                <th className="border border-[#a8ebef] px-3 py-3 text-left">Divisi</th>
                <th className="border border-[#a8ebef] px-3 py-3 text-left">Departemen</th>
                <th className="border border-[#a8ebef] px-3 py-3">Tipe Bonus</th>
                <th className="border border-[#a8ebef] px-3 py-3 text-right">Nominal</th>
                <th className="border border-[#a8ebef] px-3 py-3 text-left">Catatan</th>
                <th className="border border-[#a8ebef] px-3 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!sheet || sheet.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-[#87a6a8]">
                    Belum ada payroll bonus pada periode ini.
                  </td>
                </tr>
              ) : (
                sheet.rows.map((row) => (
                  <tr key={row.id} className="text-[#3a2b27] odd:bg-white even:bg-[#fcfefe]">
                    <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.number}</td>
                    <td className="sticky left-0 z-10 border border-[#d7ecee] bg-white px-3 py-3 font-semibold text-[#241716]">{row.name}</td>
                    <td className="border border-[#d7ecee] px-3 py-3">{row.role}</td>
                    <td className="border border-[#d7ecee] px-3 py-3">{row.division}</td>
                    <td className="border border-[#d7ecee] px-3 py-3">{row.department}</td>
                    <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.bonusTypeLabel}</td>
                    <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold">{formatCurrency(row.amount)}</td>
                    <td className="border border-[#d7ecee] px-3 py-3">{row.note ?? "-"}</td>
                    <td className="border border-[#d7ecee] px-3 py-3">
                      <div className="flex min-w-[140px] gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditRow(row)}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-[#0d7f86] px-3 text-xs font-semibold text-[#0d7f86]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={isDeletePending}
                          className="inline-flex h-9 items-center justify-center rounded-xl bg-[#8f1d22] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeletePending ? "Proses..." : "Hapus"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
