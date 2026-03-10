"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmployeeListItem, LookupOption } from "@/lib/employees";

type Lookups = {
  roles: LookupOption[];
  divisions: LookupOption[];
  departments: LookupOption[];
  recapGroups: LookupOption[];
  banks: LookupOption[];
  workStatuses: LookupOption[];
};

type Stats = {
  totalEmployees: number;
  totalContract: number;
  activeLoans: number;
};

type Props = {
  initialEmployees: EmployeeListItem[];
  lookups: Lookups;
  stats: Stats;
};

type ToastState = {
  type: "success" | "error";
  title: string;
  description: string;
} | null;

type FormState = {
  name: string;
  nip: string;
  email: string;
  password: string;
  role: string;
  division: string;
  department: string;
  recapGroup: string;
  bank: string;
  accountNumber: string;
  workStatus: "tetap" | "kontrak" | "freelance" | "magang" | "resign";
  contractDate: string;
  contractEndDate: string;
  annualRaise: string;
  userActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  nip: "",
  email: "",
  password: "",
  role: "",
  division: "",
  department: "",
  recapGroup: "",
  bank: "BCA",
  accountNumber: "",
  workStatus: "kontrak",
  contractDate: "",
  contractEndDate: "",
  annualRaise: "0",
  userActive: true,
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none shadow-[0_1px_2px_rgba(15,23,42,0.03)] placeholder:text-[#b1948d] focus:border-[#c8716d] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2.5">
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#6f5a54]">
        {label}
      </span>
      {children}
    </label>
  );
}

function toFormState(employee: EmployeeListItem): FormState {
  return {
    name: employee.name,
    nip: employee.nip,
    email: employee.email,
    password: "",
    role: employee.role,
    division: employee.division,
    department: employee.department,
    recapGroup: employee.recapGroup ?? "",
    bank: employee.bank ?? "BCA",
    accountNumber: employee.accountNumber ?? "",
    workStatus: employee.workStatus,
    contractDate: employee.contractDate ?? "",
    contractEndDate: employee.contractEndDate ?? "",
    annualRaise: employee.annualRaise.replace(/\./g, "").replace(",", "."),
    userActive: employee.userActive,
  };
}

function formatStatus(status: EmployeeListItem["workStatus"]) {
  if (status === "tetap") return "Tetap";
  if (status === "kontrak") return "Kontrak";
  if (status === "freelance") return "Freelance";
  if (status === "magang") return "Magang";
  return "Resign";
}

function sanitizeCurrencyInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatRupiahInput(value: string) {
  const digits = sanitizeCurrencyInput(value);

  if (!digits) {
    return "";
  }

  return Number(digits).toLocaleString("id-ID");
}

export default function AdminEmployeesManager({
  initialEmployees,
  lookups,
  stats,
}: Props) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return employees;
    }

    return employees.filter((employee) =>
      [
        employee.name,
        employee.nip,
        employee.email,
        employee.role,
        employee.division,
        employee.department,
        employee.recapGroup ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [employees, search]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "workStatus" && value === "tetap") {
        next.contractEndDate = "";
      }

      return next;
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setErrorMessage("");
  }

  function notify(type: "success" | "error", title: string, description: string) {
    setToast({ type, title, description });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");
    const isEditing = Boolean(editingId);

    try {
      const response = await fetch(
        editingId ? `/api/admin/employees/${editingId}` : "/api/admin/employees",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            recapGroup: form.recapGroup || null,
            bank: form.bank || null,
            accountNumber: form.accountNumber || null,
            contractDate: form.contractDate || null,
            contractEndDate: form.contractEndDate || null,
            annualRaise: Number(sanitizeCurrencyInput(form.annualRaise) || 0),
          }),
        },
      );

      const result = (await response.json()) as {
        message?: string;
        employee?: EmployeeListItem;
      };

      if (!response.ok || !result.employee) {
        throw new Error(result.message || "Gagal menyimpan data karyawan.");
      }

      setEmployees((current) => {
        if (editingId) {
          return current.map((employee) =>
            employee.id === editingId ? result.employee! : employee,
          );
        }

        return [result.employee!, ...current];
      });

      const successMessage =
        result.message ||
        (isEditing
          ? "Data karyawan berhasil diperbarui."
          : "Data karyawan berhasil ditambahkan.");
      setMessage(successMessage);
      notify(
        "success",
        isEditing ? "Perubahan tersimpan" : "Karyawan ditambahkan",
        successMessage,
      );
      resetForm();
    } catch (error) {
      const nextError =
        error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data.";
      setErrorMessage(nextError);
      notify("error", "Simpan gagal", nextError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(employee: EmployeeListItem) {
    setEditingId(employee.id);
    setForm(toFormState(employee));
    setMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(employee: EmployeeListItem) {
    const confirmed = window.confirm(`Hapus ${employee.name} (${employee.nip})?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(employee.id);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus data karyawan.");
      }

      setEmployees((current) => current.filter((item) => item.id !== employee.id));

      if (editingId === employee.id) {
        resetForm();
      }

      const successMessage = result.message || "Data karyawan berhasil dihapus.";
      setMessage(successMessage);
      notify("success", "Karyawan dihapus", successMessage);
    } catch (error) {
      const nextError =
        error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus data.";
      setErrorMessage(nextError);
      notify("error", "Hapus gagal", nextError);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="pointer-events-none fixed right-6 top-24 z-50 max-w-sm">
          <div
            className={[
              "rounded-[22px] border px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur",
              toast.type === "success"
                ? "border-emerald-200 bg-white text-[#163127]"
                : "border-rose-200 bg-white text-[#4a161b]",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                  toast.type === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600",
                ].join(" ")}
              >
                {toast.type === "success" ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M12 8v4" strokeLinecap="round" />
                    <path d="M12 16h.01" strokeLinecap="round" />
                    <path
                      d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#7a6059]">
                  {toast.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5 shadow-[0_18px_40px_rgba(96,45,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
            Total Karyawan
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#241716]">
            {employees.length || stats.totalEmployees}
          </p>
          <p className="mt-2 text-sm text-[#7a6059]">Data login dan profil kerja.</p>
        </article>

        <article className="rounded-[28px] border border-[#ead7ce] bg-white/82 p-5 shadow-[0_18px_40px_rgba(96,45,34,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
            Karyawan Kontrak
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#241716]">
            {stats.totalContract}
          </p>
          <p className="mt-2 text-sm text-[#7a6059]">Relevan untuk potongan kontrak.</p>
        </article>

        <article className="rounded-[28px] border border-[#ead7ce] bg-[linear-gradient(135deg,#8f1d22_0%,#bb5148_100%)] p-5 text-white shadow-[0_22px_50px_rgba(143,29,34,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            Pinjaman Aktif
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            {stats.activeLoans}
          </p>
          <p className="mt-2 text-sm text-white/78">
            Terkait potongan payroll bulanan.
          </p>
        </article>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[520px,minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
          <div className="border-b border-[#eddad1] bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.08),_transparent_36%),linear-gradient(180deg,#fffaf8_0%,#fff6f2_100%)] px-6 py-6">
            <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
              Form Data Karyawan
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
              {editingId ? "Edit Karyawan" : "Tambah Karyawan"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[#7a6059]">
              Semua data login karyawan dan data payroll diinput oleh admin dari sini.
            </p>
          </div>

          <form className="space-y-6 px-6 py-6" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="rounded-[28px] border border-[#efdfd8] bg-white/90 p-5 shadow-[0_10px_30px_rgba(96,45,34,0.05)]">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">
                    Akun Login
                  </p>
                  <p className="mt-1 text-sm text-[#7a6059]">
                    Informasi dasar yang dipakai karyawan untuk masuk ke sistem.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nama">
                    <input
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className={inputClassName}
                      placeholder="Nama lengkap"
                      required
                    />
                  </Field>

                  <Field label="NIP / No Karyawan">
                    <input
                      value={form.nip}
                      onChange={(event) => updateField("nip", event.target.value)}
                      className={inputClassName}
                      placeholder="KRY-2026-001"
                      required
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Email">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className={inputClassName}
                      placeholder="nama@company.local"
                      required
                    />
                  </Field>

                  <Field label={editingId ? "Password Baru (opsional)" : "Password"}>
                    <input
                      type="text"
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      className={inputClassName}
                      placeholder={editingId ? "Kosongkan jika tidak diubah" : "Password login"}
                      required={!editingId}
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#efdfd8] bg-white/90 p-5 shadow-[0_10px_30px_rgba(96,45,34,0.05)]">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">
                    Struktur Kerja
                  </p>
                  <p className="mt-1 text-sm text-[#7a6059]">
                    Posisi, divisi, departemen, dan rekapan kerja karyawan.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Jabatan">
                    <input
                      list="roles-list"
                      value={form.role}
                      onChange={(event) => updateField("role", event.target.value)}
                      className={inputClassName}
                      placeholder="Staff Admin"
                      required
                    />
                  </Field>

                  <Field label="Divisi">
                    <input
                      list="divisions-list"
                      value={form.division}
                      onChange={(event) => updateField("division", event.target.value)}
                      className={inputClassName}
                      placeholder="Operasional"
                      required
                    />
                  </Field>

                  <Field label="Departemen">
                    <select
                      value={form.department}
                      onChange={(event) => updateField("department", event.target.value)}
                      className={inputClassName}
                      required
                    >
                      <option value="">Pilih departemen</option>
                      {lookups.departments.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label="Pembagian Rekapan">
                    <select
                      value={form.recapGroup}
                      onChange={(event) => updateField("recapGroup", event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Pilih pembagian rekapan</option>
                      {lookups.recapGroups.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Bank">
                    <input value={form.bank} className={inputClassName} readOnly />
                  </Field>

                  <Field label="No Rekening">
                    <input
                      value={form.accountNumber}
                      onChange={(event) => updateField("accountNumber", event.target.value)}
                      className={inputClassName}
                      placeholder="1234567890"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#efdfd8] bg-white/90 p-5 shadow-[0_10px_30px_rgba(96,45,34,0.05)]">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">
                    Kontrak & Payroll
                  </p>
                  <p className="mt-1 text-sm text-[#7a6059]">
                    Data status kerja, periode kontrak, dan kenaikan tahunan.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Status Kerja">
                    <select
                      value={form.workStatus}
                      onChange={(event) =>
                        updateField("workStatus", event.target.value as FormState["workStatus"])
                      }
                      className={inputClassName}
                    >
                      {lookups.workStatuses.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Tanggal Kontrak">
                    <input
                      type="date"
                      value={form.contractDate}
                      onChange={(event) => updateField("contractDate", event.target.value)}
                      className={inputClassName}
                    />
                  </Field>

                  <Field label="Tanggal Selesai Kontrak">
                    <input
                      type="date"
                      value={form.contractEndDate}
                      onChange={(event) => updateField("contractEndDate", event.target.value)}
                      className={inputClassName}
                      disabled={form.workStatus === "tetap"}
                    />
                  </Field>

                  <Field label="Kenaikan Tiap Tahun">
                    <input
                      value={form.annualRaise}
                      onChange={(event) =>
                        updateField("annualRaise", formatRupiahInput(event.target.value))
                      }
                      className={inputClassName}
                      inputMode="numeric"
                      placeholder="500.000"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-sm font-medium text-[#5f4a45] shadow-[0_8px_24px_rgba(96,45,34,0.04)]">
              <input
                type="checkbox"
                checked={form.userActive}
                onChange={(event) => updateField("userActive", event.target.checked)}
                className="h-4 w-4 rounded border-[#c8716d] text-[#8f1d22] focus:ring-[#c8716d]"
              />
              Akun karyawan aktif
            </label>

            {message ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(143,29,34,0.24)] hover:-translate-y-0.5 hover:bg-[#7b171d] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : editingId
                    ? "Simpan Perubahan"
                    : "Tambah Karyawan"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e7d4cb] bg-white px-6 text-sm font-semibold text-[#3b2622] hover:border-[#ca7771] hover:text-[#8f1d22]"
              >
                Reset Form
              </button>
            </div>

            <datalist id="roles-list">
              {lookups.roles.map((item) => (
                <option key={item.value} value={item.value} />
              ))}
            </datalist>
            <datalist id="divisions-list">
              {lookups.divisions.map((item) => (
                <option key={item.value} value={item.value} />
              ))}
            </datalist>
          </form>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
          <div className="border-b border-[#eddad1] px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
                  Tabel Data Karyawan
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
                  Format Sesuai Rekap Admin
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#7a6059]">
                  Menampilkan data login, struktur kerja, kontrak, dan rekening
                  karyawan untuk kebutuhan admin dan payroll.
                </p>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIP, email, divisi..."
                className={`${inputClassName} xl:max-w-sm`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.2em] text-[#9e7467]">
                  <th className="px-6 py-4 font-semibold">Nama</th>
                  <th className="px-6 py-4 font-semibold">NIP</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Password</th>
                  <th className="px-6 py-4 font-semibold">Jabatan</th>
                  <th className="px-6 py-4 font-semibold">Divisi</th>
                  <th className="px-6 py-4 font-semibold">Departemen</th>
                  <th className="px-6 py-4 font-semibold">Pembagian Rekapan</th>
                  <th className="px-6 py-4 font-semibold">Bank</th>
                  <th className="px-6 py-4 font-semibold">No Rekening</th>
                  <th className="px-6 py-4 font-semibold">Status Kerja</th>
                  <th className="px-6 py-4 font-semibold">Mulai Kontrak</th>
                  <th className="px-6 py-4 font-semibold">Selesai Kontrak</th>
                  <th className="px-6 py-4 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length ? (
                  filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-[#f1e5de] text-sm text-[#513d39] hover:bg-[#fffaf7]"
                    >
                      <td className="px-6 py-5 font-semibold text-[#241716]">{employee.name}</td>
                      <td className="px-6 py-5">{employee.nip}</td>
                      <td className="px-6 py-5">{employee.email}</td>
                      <td className="px-6 py-5 text-[#9a7a72]">{employee.passwordLabel}</td>
                      <td className="px-6 py-5">{employee.role}</td>
                      <td className="px-6 py-5">{employee.division}</td>
                      <td className="px-6 py-5">{employee.department}</td>
                      <td className="px-6 py-5">{employee.recapGroup || "-"}</td>
                      <td className="px-6 py-5">{employee.bank || "-"}</td>
                      <td className="px-6 py-5">{employee.accountNumber || "-"}</td>
                      <td className="px-6 py-5">
                        <span className="rounded-full border border-[#edd8cf] bg-[#fff7f2] px-3 py-1 text-xs font-medium text-[#785f58]">
                          {formatStatus(employee.workStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-5">{employee.contractDate || "-"}</td>
                      <td className="px-6 py-5">{employee.contractEndDate || "-"}</td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`Edit ${employee.name}`}
                            title={`Edit ${employee.name}`}
                            onClick={() => handleEdit(employee)}
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
                              <path
                                d="M4 20h4l10-10a2.12 2.12 0 0 0-3-3L5 17v3Z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path d="m13.5 6.5 4 4" strokeLinecap="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${employee.name}`}
                            title={`Hapus ${employee.name}`}
                            onClick={() => handleDelete(employee)}
                            disabled={deletingId === employee.id}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {deletingId === employee.id ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeOpacity="0.25"
                                />
                                <path
                                  d="M21 12a9 9 0 0 0-9-9"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path
                                  d="M3 6h18"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M8 6V4h8v2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M19 6l-1 14H6L5 6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path d="M10 11v6" strokeLinecap="round" />
                                <path d="M14 11v6" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="px-6 py-16 text-center">
                      <p className="text-base font-semibold text-[#3b2723]">
                        Belum ada data yang cocok
                      </p>
                      <p className="mt-2 text-sm text-[#8a6f68]">
                        Coba ubah pencarian atau tambahkan karyawan baru.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
