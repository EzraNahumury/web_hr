"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useConfirm } from "@/components/ConfirmDialog";
import type { LoanListItem } from "@/lib/loans";

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

type EmployeeOption = {
  employeeId: number;
  name: string;
  role: string;
};

type Props = {
  initialRows: LoanListItem[];
  employeeOptions: EmployeeOption[];
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#e3d5cf] bg-white px-4 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";
const selectClassName =
  `${inputClassName} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23845b52' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:18px_18px] bg-[right_1rem_center] bg-no-repeat pr-11`;

function todayIsoDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatRupiahInput(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

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

function formatMoney(value: string | number | null | undefined) {
  const amount = toNumber(value);

  return amount.toLocaleString("id-ID", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
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

function mapApprovalMessage(status: "approved" | "rejected") {
  return status === "approved"
    ? "Pengajuan pinjaman berhasil di-approve. Jadwal cicilan otomatis dibuat mulai bulan berikutnya."
    : "Pengajuan pinjaman berhasil ditolak.";
}

export default function AdminLoansManager({ initialRows, employeeOptions }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [deletingLoanId, setDeletingLoanId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    employeeId: "",
    totalLoan: "",
    installmentCount: "",
    requestDate: todayIsoDate(),
  });
  const [isCreating, setIsCreating] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [payoffTarget, setPayoffTarget] = useState<LoanListItem | null>(null);
  const [payoffMonthYear, setPayoffMonthYear] = useState<string>("");
  const [isPayingOff, setIsPayingOff] = useState(false);
  const [payoffFeedback, setPayoffFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function resetForm() {
    setForm({
      employeeId: "",
      totalLoan: "",
      installmentCount: "",
      requestDate: todayIsoDate(),
    });
    setFormFeedback(null);
    setEditingLoanId(null);
  }

  function openEditLoan(loan: LoanListItem) {
    setEditingLoanId(loan.id);
    setForm({
      employeeId: String(loan.employeeId),
      totalLoan: formatRupiahInput(String(Math.trunc(toNumber(loan.totalLoan)))),
      installmentCount: String(loan.installmentCount),
      requestDate: loan.requestDate || todayIsoDate(),
    });
    setFormFeedback(null);
    setFeedback(null);
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDeleteLoan(loan: LoanListItem) {
    const ok = await confirm({
      tone: "danger",
      title: "Hapus pengajuan pinjaman?",
      description: `Pinjaman ${loan.employeeName} sebesar Rp${formatMoney(loan.totalLoan)} akan dihapus beserta jadwal cicilannya.`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
    });
    if (!ok) return;

    setDeletingLoanId(loan.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/loans/${loan.id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus pengajuan pinjaman.");
      }
      setRows((current) => current.filter((row) => row.id !== loan.id));
      if (editingLoanId === loan.id) resetForm();
      setFeedback({ type: "success", text: result.message || "Pengajuan pinjaman dihapus." });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus pinjaman.",
      });
    } finally {
      setDeletingLoanId(null);
    }
  }

  async function handleCreateLoan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormFeedback(null);

    const employeeId = Number(form.employeeId);
    const totalLoan = Number(digitsOnly(form.totalLoan));
    const installmentCount = Number(form.installmentCount);

    if (!employeeId || !totalLoan || !installmentCount || !form.requestDate) {
      setFormFeedback({ type: "error", text: "Lengkapi semua field terlebih dahulu." });
      return;
    }

    setIsCreating(true);
    try {
      const isEditing = editingLoanId !== null;
      const response = await fetch(
        isEditing ? `/api/admin/loans/${editingLoanId}` : "/api/admin/loans",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            totalLoan,
            installmentCount,
            requestDate: form.requestDate,
          }),
        },
      );
      const result = (await response.json()) as { message?: string; loan?: LoanListItem };

      if (!response.ok || !result.loan) {
        throw new Error(result.message || (isEditing ? "Gagal memperbarui pinjaman." : "Gagal membuat pengajuan pinjaman."));
      }

      if (isEditing) {
        setRows((current) => current.map((row) => (row.id === result.loan!.id ? result.loan! : row)));
      } else {
        setRows((current) => [result.loan!, ...current]);
      }
      setFormFeedback({ type: "success", text: result.message || (isEditing ? "Pinjaman diperbarui." : "Pengajuan pinjaman dibuat.") });
      resetForm();
      router.refresh();
    } catch (error) {
      setFormFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan pinjaman.",
      });
    } finally {
      setIsCreating(false);
    }
  }

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
        row.department,
        row.status,
        row.requestDate,
        row.approvalDate ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [rows, search]);

  const summary = useMemo(
    () =>
      filteredRows.reduce(
        (total, row) => ({
          total: total.total + 1,
          pending: total.pending + (row.status === "pending" ? 1 : 0),
          active: total.active + (["approved", "berjalan"].includes(row.status) ? 1 : 0),
          remaining: total.remaining + (["approved", "berjalan"].includes(row.status) ? toNumber(row.remainingBalance) : 0),
        }),
        { total: 0, pending: 0, active: 0, remaining: 0 },
      ),
    [filteredRows],
  );

  function openPayoffModal(loan: LoanListItem) {
    setPayoffFeedback(null);
    const firstUnpaid = loan.installments.find((installment) => !installment.isPaid);
    setPayoffMonthYear(firstUnpaid ? `${firstUnpaid.month}-${firstUnpaid.year}` : "");
    setPayoffTarget(loan);
  }

  function closePayoffModal() {
    setPayoffTarget(null);
    setPayoffMonthYear("");
    setPayoffFeedback(null);
  }

  async function handlePayoff() {
    if (!payoffTarget) return;
    setPayoffFeedback(null);

    const [monthRaw, yearRaw] = payoffMonthYear.split("-");
    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (!month || !year) {
      setPayoffFeedback({ type: "error", text: "Pilih bulan pelunasan terlebih dahulu." });
      return;
    }

    setIsPayingOff(true);
    try {
      const response = await fetch(`/api/admin/loans/${payoffTarget.id}/payoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const result = (await response.json()) as { message?: string; loan?: LoanListItem };
      if (!response.ok || !result.loan) {
        throw new Error(result.message || "Gagal memproses pelunasan pinjaman.");
      }
      setRows((current) => current.map((row) => (row.id === result.loan!.id ? result.loan! : row)));
      setFeedback({ type: "success", text: result.message || "Pelunasan dipercepat berhasil diterapkan." });
      router.refresh();
      closePayoffModal();
    } catch (error) {
      setPayoffFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses pelunasan.",
      });
    } finally {
      setIsPayingOff(false);
    }
  }

  function handleAction(loanId: number, status: "approved" | "rejected") {
    setFeedback(null);
    setProcessingId(loanId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/loans/${loanId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        const result = (await response.json()) as { message?: string; loan?: LoanListItem };

        if (!response.ok || !result.loan) {
          throw new Error(result.message || "Gagal memproses pengajuan pinjaman.");
        }

        setRows((current) => current.map((row) => (row.id === loanId ? result.loan! : row)));
        setFeedback({
          type: "success",
          text: result.message || mapApprovalMessage(status),
        });
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses pengajuan.",
        });
      } finally {
        setProcessingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-[28px] border border-[#ead7ce] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(96,45,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Total Pengajuan</p>
          <p className="mt-3 text-3xl font-semibold text-[#241716]">{summary.total}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(96,45,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Pending</p>
          <p className="mt-3 text-3xl font-semibold text-[#4657df]">{summary.pending}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(96,45,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Pinjaman Aktif</p>
          <p className="mt-3 text-3xl font-semibold text-[#17603b]">{summary.active}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-[linear-gradient(135deg,#8f1d22_0%,#c65d4a_100%)] px-5 py-5 text-white shadow-[0_20px_40px_rgba(143,29,34,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Sisa Tanggungan</p>
          <p className="mt-3 text-3xl font-semibold">Rp{formatMoney(summary.remaining)}</p>
        </article>
      </section>

      <section ref={formCardRef} className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_18px_50px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] px-6 py-6">
          <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            {editingLoanId ? "Edit Pinjaman" : "Tambah Pinjaman"}
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
            {editingLoanId ? "Edit Pengajuan Pinjaman" : "Form Pengajuan Pinjaman"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#7a6059]">
            {editingLoanId
              ? "Update detail pinjaman. Untuk pinjaman yang sudah di-approve, jadwal cicilan akan dibangun ulang otomatis berdasarkan tanggal approval awal."
              : "Admin dapat membuat pengajuan pinjaman langsung untuk karyawan tertentu. Setelah submit, pengajuan masuk daftar di bawah dengan status pending dan siap di-approve."}
          </p>
        </div>

        <form onSubmit={handleCreateLoan} className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2.5">
              <span className="text-[13px] font-semibold text-[#6f5a54]">Nama Karyawan</span>
              <select
                value={form.employeeId}
                onChange={(event) => setForm((p) => ({ ...p, employeeId: event.target.value }))}
                className={selectClassName}
                required
              >
                <option value="">Pilih karyawan</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.name.toUpperCase()} {emp.role ? `— ${emp.role}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2.5">
              <span className="text-[13px] font-semibold text-[#6f5a54]">Tanggal Pengajuan</span>
              <input
                type="date"
                value={form.requestDate}
                onChange={(event) => setForm((p) => ({ ...p, requestDate: event.target.value }))}
                className={inputClassName}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2.5">
              <span className="text-[13px] font-semibold text-[#6f5a54]">Jumlah Pinjaman</span>
              <input
                inputMode="numeric"
                value={form.totalLoan}
                onChange={(event) => setForm((p) => ({ ...p, totalLoan: formatRupiahInput(event.target.value) }))}
                placeholder="Contoh: 5.000.000"
                className={inputClassName}
                required
              />
            </label>

            <label className="space-y-2.5">
              <span className="text-[13px] font-semibold text-[#6f5a54]">Jumlah Angsuran</span>
              <input
                inputMode="numeric"
                value={form.installmentCount}
                onChange={(event) => setForm((p) => ({ ...p, installmentCount: digitsOnly(event.target.value) }))}
                placeholder="Contoh: 5"
                className={inputClassName}
                required
              />
            </label>
          </div>

          {formFeedback ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                formFeedback.type === "success"
                  ? "border border-[#cfe8d4] bg-[#f2fbf4] text-[#267344]"
                  : "border border-[#f2c4c4] bg-[#fff4f4] text-[#b13232]"
              }`}
            >
              {formFeedback.text}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(143,29,34,0.25)] transition hover:bg-[#a12228] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? (editingLoanId ? "Menyimpan..." : "Mengirim...") : (editingLoanId ? "Update Pinjaman" : "Kirim Pengajuan")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e7d4cb] bg-white px-6 text-sm font-semibold text-[#3b2622]"
            >
              {editingLoanId ? "Batal Edit" : "Reset"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_18px_50px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] px-6 py-6">
          <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            Approval Pinjaman
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">Pinjaman Karyawan</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#7a6059]">
            Setelah admin approve, sistem langsung membuat jadwal cicilan otomatis mulai bulan berikutnya dan payroll summary akan menarik potongan pinjaman sesuai bulan cicilan.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Daftar Pengajuan</p>
              <p className="mt-2 text-sm text-[#7a6059]">Tabel menampilkan nominal pinjaman, cicilan per bulan, dan bulan-bulan potongan yang dihitung otomatis dari tanggal approval.</p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIP, jabatan, status..."
              className={`${inputClassName} xl:max-w-sm`}
            />
          </div>

          {feedback ? (
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${feedback.type === "success" ? "border border-[#cfe8d4] bg-[#f2fbf4] text-[#267344]" : "border border-[#f2c4c4] bg-[#fff4f4] text-[#b13232]"}`}>
              {feedback.text}
            </div>
          ) : null}
        </div>

        <div className="overflow-auto max-h-[calc(100vh-260px)] border-t border-[#eddad1]">
          <table className="min-w-[1760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
                <th className="sticky left-0 z-20 bg-[#fff8f4] px-6 py-4 font-semibold shadow-[2px_0_0_0_#efe0d8]">Nama</th>
                <th className="px-6 py-4 font-semibold">NIP</th>
                <th className="px-6 py-4 font-semibold">Jabatan</th>
                <th className="px-6 py-4 font-semibold">Total Pinjaman</th>
                <th className="px-6 py-4 font-semibold">Angsuran</th>
                <th className="px-6 py-4 font-semibold">Potongan / Bulan</th>
                <th className="px-6 py-4 font-semibold">Pengajuan</th>
                <th className="px-6 py-4 font-semibold">Approval</th>
                <th className="px-6 py-4 font-semibold">Mulai Potong</th>
                <th className="px-6 py-4 font-semibold">Bulan Potongan</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Progress</th>
                <th className="px-6 py-4 font-semibold">Sisa</th>
                <th className="px-6 py-4 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const isProcessingRow = isPending && processingId === row.id;

                  return (
                    <tr key={row.id} className="border-b border-[#f1e5de] align-top text-[#513d39] hover:bg-[#fffaf7]">
                      <td className="sticky left-0 z-10 bg-white px-6 py-5 font-semibold uppercase text-[#241716] shadow-[2px_0_0_0_#f1e5de]">{row.employeeName}</td>
                      <td className="px-6 py-5">{row.nip}</td>
                      <td className="px-6 py-5">
                        <div>{row.role}</div>
                        <div className="mt-1 text-xs text-[#8a6f68]">{row.department}</div>
                      </td>
                      <td className="px-6 py-5 font-semibold text-[#241716]">Rp{formatMoney(row.totalLoan)}</td>
                      <td className="px-6 py-5">{row.installmentCount}x</td>
                      <td className="px-6 py-5 font-semibold text-[#241716]">Rp{formatMoney(row.monthlyDeduction)}</td>
                      <td className="px-6 py-5">{row.requestDate}</td>
                      <td className="px-6 py-5">{row.approvalDate || "-"}</td>
                      <td className="px-6 py-5">{row.deductionStartDate || "Menunggu approval"}</td>
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
                      <td className="px-6 py-5">
                        <div className="font-semibold text-[#241716]">{row.paidInstallmentCount}/{row.installmentCount}</div>
                        <div className="mt-1 text-xs text-[#8a6f68]">Rp{formatMoney(row.totalPaid)} terpotong</div>
                      </td>
                      <td className="px-6 py-5 font-semibold text-[#8f1d22]">Rp{formatMoney(row.remainingBalance)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          {row.status === "pending" ? (
                            <div className="flex min-w-[170px] gap-2">
                              <button
                                type="button"
                                onClick={() => handleAction(row.id, "approved")}
                                disabled={isProcessingRow}
                                className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#17603b] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isProcessingRow ? "Proses..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAction(row.id, "rejected")}
                                disabled={isProcessingRow}
                                className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#b92f2f] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isProcessingRow ? "Proses..." : "Reject"}
                              </button>
                            </div>
                          ) : (row.status === "approved" || row.status === "berjalan") && toNumber(row.remainingBalance) > 0 ? (
                            <button
                              type="button"
                              onClick={() => openPayoffModal(row)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#8d6200] px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(141,98,0,0.25)] transition hover:bg-[#a47400]"
                            >
                              Lunasi Sekarang
                            </button>
                          ) : null}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditLoan(row)}
                              title="Edit pinjaman"
                              aria-label="Edit pinjaman"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e3d5cf] bg-white text-[#8f5a3e] transition hover:border-[#c8716d] hover:text-[#8f1d22]"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLoan(row)}
                              disabled={deletingLoanId === row.id}
                              title="Hapus pinjaman"
                              aria-label="Hapus pinjaman"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e3d5cf] bg-white text-[#b92f2f] transition hover:border-[#b92f2f] hover:text-white hover:bg-[#b92f2f] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="px-6 py-16 text-center">
                    <p className="text-base font-semibold text-[#3b2723]">Belum ada pengajuan pinjaman</p>
                    <p className="mt-2 text-sm text-[#8a6f68]">Data akan muncul otomatis setelah karyawan mengirim pengajuan pinjaman.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {payoffTarget ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payoff-dialog-title"
        >
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={isPayingOff ? undefined : closePayoffModal}
            className="absolute inset-0 h-full w-full cursor-default bg-[#1c0e0a]/55 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)] shadow-[0_30px_80px_rgba(58,24,12,0.28)] ring-1 ring-[#f5e3b3]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(166,117,0,0.18),transparent_70%)]" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(141,98,0,0.12),transparent_70%)]" />

            <div className="relative px-7 pt-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff5d6] text-[#a07c00] shadow-[0_10px_24px_rgba(58,24,12,0.08)]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="payoff-dialog-title" className="text-lg font-semibold text-[#241716]">Lunasi pinjaman lebih cepat?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#6e574f]">
                    Sisa pinjaman <span className="font-semibold text-[#8d6200]">Rp{formatMoney(payoffTarget.remainingBalance)}</span> akan dipotong sekaligus pada periode payroll yang dipilih. Cicilan bulan berikutnya akan di-nol-kan otomatis.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <label className="block text-[13px] font-semibold text-[#6f5a54]">Bulan Pelunasan</label>
                <select
                  value={payoffMonthYear}
                  onChange={(event) => setPayoffMonthYear(event.target.value)}
                  className={selectClassName}
                  disabled={isPayingOff}
                >
                  <option value="">Pilih periode...</option>
                  {payoffTarget.installments
                    .filter((installment) => !installment.isPaid)
                    .map((installment) => (
                      <option
                        key={`${installment.month}-${installment.year}`}
                        value={`${installment.month}-${installment.year}`}
                      >
                        {installment.monthLabel}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-[#8a6f68]">
                  Karyawan: <span className="font-semibold uppercase">{payoffTarget.employeeName}</span>
                </p>
              </div>

              {payoffFeedback ? (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                    payoffFeedback.type === "success"
                      ? "border border-[#cfe8d4] bg-[#f2fbf4] text-[#267344]"
                      : "border border-[#f2c4c4] bg-[#fff4f4] text-[#b13232]"
                  }`}
                >
                  {payoffFeedback.text}
                </div>
              ) : null}
            </div>

            <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[#f1e1d8] bg-white/60 px-7 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closePayoffModal}
                disabled={isPayingOff}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#e2cfc6] bg-white px-5 text-sm font-semibold text-[#5a443d] transition hover:bg-[#fdf6f1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePayoff}
                disabled={isPayingOff || !payoffMonthYear}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#a67500] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(166,117,0,0.28)] transition hover:bg-[#8a6100] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPayingOff ? "Memproses..." : "Lunaskan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
