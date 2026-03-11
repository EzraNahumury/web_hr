"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmployeeListItem, LookupOption } from "@/lib/employees";

type Lookups = {
  units: LookupOption[];
  roles: LookupOption[];
  departments: LookupOption[];
  divisions: LookupOption[];
  subDivisions: LookupOption[];
  placements: LookupOption[];
  recapGroups: LookupOption[];
  banks: LookupOption[];
  workStatuses: LookupOption[];
  dataStatuses: LookupOption[];
  genders: LookupOption[];
  religions: LookupOption[];
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

type FormState = {
  name: string;
  nip: string;
  email: string;
  password: string;
  unit: string;
  role: string;
  department: string;
  division: string;
  subDivision: string;
  placement: string;
  recapGroup: string;
  bank: string;
  accountNumber: string;
  gender: "" | "laki-laki" | "perempuan";
  birthPlace: string;
  birthDate: string;
  nik: string;
  religion: string;
  addressKtp: string;
  addressCurrent: string;
  phoneNumber: string;
  ktpPhoto: string;
  employmentStatus: "training" | "tetap" | "kontrak" | "freelance";
  workStatus: "training" | "tetap" | "kontrak" | "freelance";
  dataStatus: "aktif" | "nonaktif";
  firstJoinDate: string;
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
  unit: "",
  role: "",
  department: "",
  division: "",
  subDivision: "",
  placement: "",
  recapGroup: "",
  bank: "",
  accountNumber: "",
  gender: "",
  birthPlace: "",
  birthDate: "",
  nik: "",
  religion: "",
  addressKtp: "",
  addressCurrent: "",
  phoneNumber: "",
  ktpPhoto: "",
  employmentStatus: "kontrak",
  workStatus: "kontrak",
  dataStatus: "aktif",
  firstJoinDate: "",
  contractDate: "",
  contractEndDate: "",
  annualRaise: "0",
  userActive: true,
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";
const selectClassName =
  `${inputClassName} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23845b52' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:18px_18px] bg-[right_1rem_center] bg-no-repeat pr-11`;
const textareaClassName =
  "min-h-[108px] w-full rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2.5">
      <span className="text-[13px] font-semibold text-[#6f5a54]">{label}</span>
      {children}
    </label>
  );
}

function sanitizeCurrencyInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatRupiahInput(value: string) {
  const digits = sanitizeCurrencyInput(value);
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

function formatStatus(status: EmployeeListItem["employmentStatus"]) {
  if (status === "training") return "Training";
  if (status === "tetap") return "Tetap";
  if (status === "kontrak") return "Kontrak";
  if (status === "freelance") return "Freelance";
  return status;
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function toFormState(employee: EmployeeListItem): FormState {
  return {
    name: employee.name,
    nip: employee.nip,
    email: employee.email,
    password: "",
    unit: employee.unit ?? "",
    role: employee.role,
    department: employee.department,
    division: employee.division,
    subDivision: employee.subDivision ?? "",
    placement: employee.placement ?? "",
    recapGroup: employee.recapGroup ?? "",
    bank: employee.bank ?? "BCA",
    accountNumber: employee.accountNumber ?? "",
    gender: employee.gender ?? "",
    birthPlace: employee.birthPlace ?? "",
    birthDate: employee.birthDate ?? "",
    nik: employee.nik ?? "",
    religion: employee.religion ?? "",
    addressKtp: employee.addressKtp ?? "",
    addressCurrent: employee.addressCurrent ?? "",
    phoneNumber: employee.phoneNumber ?? "",
    ktpPhoto: employee.ktpPhoto ?? "",
    employmentStatus: employee.employmentStatus,
    workStatus: employee.workStatus,
    dataStatus: employee.dataStatus,
    firstJoinDate: employee.firstJoinDate ?? "",
    contractDate: employee.contractDate ?? "",
    contractEndDate: employee.contractEndDate ?? "",
    annualRaise: employee.annualRaise.replace(/\./g, "").replace(",", "."),
    userActive: employee.userActive,
  };
}

export default function AdminEmployeesManager({ initialEmployees, lookups, stats }: Props) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeListItem | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ title: string; description: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter((employee) =>
      [
        employee.name,
        employee.nip,
        employee.unit ?? "",
        employee.role,
        employee.department,
        employee.division,
        employee.subDivision ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [employees, search]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if ((key === "employmentStatus" || key === "workStatus") && value === "tetap") {
        next.contractEndDate = "";
      }
      return next;
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setKtpFile(null);
    setEditingId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("nip", form.nip);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("unit", form.unit);
      formData.append("role", form.role);
      formData.append("department", form.department);
      formData.append("division", form.division);
      formData.append("subDivision", form.subDivision);
      formData.append("placement", form.placement);
      formData.append("recapGroup", form.recapGroup);
      formData.append("bank", form.bank);
      formData.append("accountNumber", form.accountNumber);
      formData.append("gender", form.gender);
      formData.append("birthPlace", form.birthPlace);
      formData.append("birthDate", form.birthDate);
      formData.append("nik", form.nik);
      formData.append("religion", form.religion);
      formData.append("addressKtp", form.addressKtp);
      formData.append("addressCurrent", form.addressCurrent);
      formData.append("phoneNumber", form.phoneNumber);
      formData.append("ktpPhoto", form.ktpPhoto);
      formData.append("employmentStatus", form.employmentStatus);
      formData.append("workStatus", form.workStatus);
      formData.append("dataStatus", form.dataStatus);
      formData.append("firstJoinDate", form.firstJoinDate);
      formData.append("contractDate", form.contractDate);
      formData.append("contractEndDate", form.contractEndDate);
      formData.append("annualRaise", String(Number(sanitizeCurrencyInput(form.annualRaise) || 0)));
      formData.append("userActive", String(form.userActive));

      if (ktpFile) {
        formData.append("ktpFile", ktpFile);
      }

      const response = await fetch(editingId ? `/api/admin/employees/${editingId}` : "/api/admin/employees", {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });
      const result = (await response.json()) as { message?: string; employee?: EmployeeListItem };
      if (!response.ok || !result.employee) {
        throw new Error(result.message || "Gagal menyimpan data karyawan.");
      }
      setEmployees((current) =>
        editingId
          ? current.map((employee) => (employee.id === editingId ? result.employee! : employee))
          : [result.employee!, ...current],
      );
      setToast({
        type: "success",
        title: editingId ? "Perubahan tersimpan" : "Karyawan ditambahkan",
        description: result.message || "Data berhasil disimpan.",
      });
      resetForm();
    } catch (error) {
      setToast({
        type: "error",
        title: "Simpan gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(employee: EmployeeListItem) {
    setEditingId(employee.id);
    setForm(toFormState(employee));
    setKtpFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const identityEntries: Array<{ label: string; value: string }> = viewingEmployee
    ? [
        { label: "Email", value: viewingEmployee.email || "-" },
        { label: "NIP", value: viewingEmployee.nip || "-" },
        { label: "Unit", value: viewingEmployee.unit || "-" },
        { label: "Jabatan", value: viewingEmployee.role || "-" },
      ]
    : [];
  const personalEntries: Array<{ label: string; value: string }> = viewingEmployee
    ? [
        { label: "Jenis Kelamin", value: viewingEmployee.gender || "-" },
        { label: "Tempat Lahir", value: viewingEmployee.birthPlace || "-" },
        { label: "Tanggal Lahir", value: viewingEmployee.birthDate || "-" },
        { label: "NIK", value: viewingEmployee.nik || "-" },
        { label: "Agama", value: viewingEmployee.religion || "-" },
        { label: "Nomor Telepon", value: viewingEmployee.phoneNumber || "-" },
      ]
    : [];
  const workEntries: Array<{ label: string; value: string }> = viewingEmployee
    ? [
        { label: "Departemen", value: viewingEmployee.department || "-" },
        { label: "Divisi", value: viewingEmployee.division || "-" },
        { label: "Sub Divisi", value: viewingEmployee.subDivision || "-" },
        { label: "Penempatan", value: viewingEmployee.placement || "-" },
        { label: "Pembagian Rekapan", value: viewingEmployee.recapGroup || "-" },
        { label: "Status Kepegawaian", value: formatStatus(viewingEmployee.employmentStatus) || "-" },
        { label: "Status Kerja", value: formatStatus(viewingEmployee.workStatus) || "-" },
        { label: "Status Data", value: viewingEmployee.dataStatus || "-" },
        { label: "Akun", value: viewingEmployee.userActive ? "Aktif" : "Nonaktif" },
      ]
    : [];
  const financeEntries: Array<{ label: string; value: string }> = viewingEmployee
    ? [
        { label: "Bank", value: viewingEmployee.bank || "-" },
        { label: "No Rekening", value: viewingEmployee.accountNumber || "-" },
        { label: "Kenaikan / Tahun", value: viewingEmployee.annualRaise || "0" },
      ]
    : [];
  const timelineEntries: Array<{ label: string; value: string }> = viewingEmployee
    ? [
        { label: "Tanggal Pertama Masuk", value: viewingEmployee.firstJoinDate || "-" },
        { label: "Tanggal Kontrak", value: viewingEmployee.contractDate || "-" },
        { label: "Tanggal Selesai Kontrak", value: viewingEmployee.contractEndDate || "-" },
      ]
    : [];

  async function handleDelete(employee: EmployeeListItem) {
    if (!window.confirm(`Hapus ${employee.name} (${employee.nip})?`)) return;
    setDeletingId(employee.id);
    try {
      const response = await fetch(`/api/admin/employees/${employee.id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus data karyawan.");
      }
      setEmployees((current) => current.filter((item) => item.id !== employee.id));
      setToast({
        type: "success",
        title: "Karyawan dihapus",
        description: result.message || "Data berhasil dihapus.",
      });
    } catch (error) {
      setToast({
        type: "error",
        title: "Hapus gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus data.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-6 top-24 z-50 max-w-sm rounded-[22px] border bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <p className="text-sm font-semibold text-[#241716]">{toast.title}</p>
          <p className="mt-1 text-sm text-[#7a6059]">{toast.description}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Total Karyawan</p>
          <p className="mt-3 text-4xl font-semibold text-[#241716]">{employees.length || stats.totalEmployees}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Karyawan Kontrak</p>
          <p className="mt-3 text-4xl font-semibold text-[#241716]">{stats.totalContract}</p>
        </article>
        <article className="rounded-[28px] border border-[#ead7ce] bg-[linear-gradient(135deg,#8f1d22_0%,#bb5148_100%)] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Pinjaman Aktif</p>
          <p className="mt-3 text-4xl font-semibold">{stats.activeLoans}</p>
        </article>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[680px,minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)]">
          <div className="border-b border-[#eddad1] px-6 py-6">
            <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
              Form Data Karyawan
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-[#241716]">
              {editingId ? "Edit Karyawan" : "Tambah Karyawan"}
            </h3>
          </div>

          <form className="space-y-6 px-6 py-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nama"><input value={form.name} onChange={(event) => updateField("name", event.target.value)} className={inputClassName} required /></Field>
              <Field label="NIP / No Karyawan"><input value={form.nip} onChange={(event) => updateField("nip", event.target.value)} className={inputClassName} required /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputClassName} required /></Field>
              <Field label={editingId ? "Password Baru (opsional)" : "Password"}><input type="text" value={form.password} onChange={(event) => updateField("password", event.target.value)} className={inputClassName} required={!editingId} /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Unit"><select value={form.unit} onChange={(event) => updateField("unit", event.target.value)} className={selectClassName}><option value="">Pilih unit</option>{lookups.units.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Jabatan"><select value={form.role} onChange={(event) => updateField("role", event.target.value)} className={selectClassName} required><option value="">Pilih jabatan</option>{lookups.roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Departemen"><select value={form.department} onChange={(event) => updateField("department", event.target.value)} className={selectClassName} required><option value="">Pilih departemen</option>{lookups.departments.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Divisi"><select value={form.division} onChange={(event) => updateField("division", event.target.value)} className={selectClassName} required><option value="">Pilih divisi</option>{lookups.divisions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Sub Divisi"><select value={form.subDivision} onChange={(event) => updateField("subDivision", event.target.value)} className={selectClassName}><option value="">Pilih sub divisi</option>{lookups.subDivisions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Penempatan"><select value={form.placement} onChange={(event) => updateField("placement", event.target.value)} className={selectClassName}><option value="">Pilih penempatan</option>{lookups.placements.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Pembagian Rekapan"><select value={form.recapGroup} onChange={(event) => updateField("recapGroup", event.target.value)} className={selectClassName}><option value="">Pilih pembagian rekapan</option>{lookups.recapGroups.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Bank"><input value={form.bank} onChange={(event) => updateField("bank", event.target.value)} className={inputClassName} placeholder="Nama bank" /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="No Rekening"><input value={form.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value)} className={inputClassName} /></Field>
              <Field label="Jenis Kelamin"><select value={form.gender} onChange={(event) => updateField("gender", event.target.value as FormState["gender"])} className={selectClassName}><option value="">Pilih jenis kelamin</option>{lookups.genders.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Tempat Lahir"><input value={form.birthPlace} onChange={(event) => updateField("birthPlace", event.target.value)} className={inputClassName} /></Field>
              <Field label="Tanggal Lahir"><input type="date" value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} className={inputClassName} /></Field>
              <Field label="NIK"><input value={form.nik} onChange={(event) => updateField("nik", event.target.value)} className={inputClassName} /></Field>
              <Field label="Agama"><input list="religions-list" value={form.religion} onChange={(event) => updateField("religion", event.target.value)} className={inputClassName} /></Field>
              <Field label="Nomor Telepon"><input value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} className={inputClassName} /></Field>
              <Field label="Foto KTP">
                <div className="space-y-3">
                  <label className="flex h-12 cursor-pointer items-center justify-between rounded-2xl border border-[#ead7ce] bg-white px-3.5 transition hover:border-[#d2b0a5]">
                    <span className="inline-flex h-9 items-center rounded-xl bg-[#8f1d22] px-4 text-sm font-semibold text-white">
                      Pilih File
                    </span>
                    <span className="ml-3 truncate text-sm text-[#7d635c]">
                      {ktpFile ? ktpFile.name : form.ktpPhoto ? "Gunakan file tersimpan" : "Belum ada file dipilih"}
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(event) => setKtpFile(event.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                  {form.ktpPhoto ? (
                    <p className="text-xs text-[#7d635c]">
                      File tersimpan:{" "}
                      <a href={form.ktpPhoto} target="_blank" className="font-semibold text-[#8f1d22] underline" rel="noreferrer">
                        lihat file
                      </a>
                    </p>
                  ) : null}
                </div>
              </Field>
            </div>

            <div className="grid gap-4">
              <Field label="Alamat KTP"><textarea value={form.addressKtp} onChange={(event) => updateField("addressKtp", event.target.value)} className={textareaClassName} /></Field>
              <Field label="Alamat Rumah / Kost"><textarea value={form.addressCurrent} onChange={(event) => updateField("addressCurrent", event.target.value)} className={textareaClassName} /></Field>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Status Kepegawaian"><select value={form.employmentStatus} onChange={(event) => updateField("employmentStatus", event.target.value as FormState["employmentStatus"])} className={selectClassName}>{lookups.workStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Status Kerja"><select value={form.workStatus} onChange={(event) => updateField("workStatus", event.target.value as FormState["workStatus"])} className={selectClassName}>{lookups.workStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Status Data"><select value={form.dataStatus} onChange={(event) => updateField("dataStatus", event.target.value as FormState["dataStatus"])} className={selectClassName}>{lookups.dataStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Kenaikan Tiap Tahun"><input value={form.annualRaise} onChange={(event) => updateField("annualRaise", formatRupiahInput(event.target.value))} className={inputClassName} inputMode="numeric" /></Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Tanggal Pertama Kali Masuk"><input type="date" value={form.firstJoinDate} onChange={(event) => updateField("firstJoinDate", event.target.value)} className={inputClassName} /></Field>
                <Field label="Tanggal Kontrak"><input type="date" value={form.contractDate} onChange={(event) => updateField("contractDate", event.target.value)} className={inputClassName} /></Field>
                <Field label="Tanggal Selesai Kontrak"><input type="date" value={form.contractEndDate} onChange={(event) => updateField("contractEndDate", event.target.value)} className={inputClassName} disabled={form.employmentStatus === "tetap" || form.workStatus === "tetap"} /></Field>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-sm font-medium text-[#5f4a45]">
              <input type="checkbox" checked={form.userActive} onChange={(event) => updateField("userActive", event.target.checked)} className="h-4 w-4 rounded border-[#c8716d] text-[#8f1d22] focus:ring-[#c8716d]" />
              Akun karyawan aktif
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isSubmitting} className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white">
                {isSubmitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Karyawan"}
              </button>
              <button type="button" onClick={resetForm} className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e7d4cb] bg-white px-6 text-sm font-semibold text-[#3b2622]">
                Reset Form
              </button>
            </div>
            <datalist id="religions-list">{lookups.religions.map((item) => <option key={item.value} value={item.value} />)}</datalist>
          </form>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white">
          <div className="border-b border-[#eddad1] px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
                  Tabel Data Karyawan
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-[#241716]">
                  Schema Baru
                </h3>
              </div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, NIP, unit, jabatan..." className={`${inputClassName} xl:max-w-sm`} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.2em] text-[#9e7467]">
                  <th className="px-6 py-4 font-semibold">Nama</th>
                  <th className="px-6 py-4 font-semibold">NIP</th>
                  <th className="px-6 py-4 font-semibold">Unit</th>
                  <th className="px-6 py-4 font-semibold">Jabatan</th>
                  <th className="px-6 py-4 font-semibold">Departemen</th>
                  <th className="px-6 py-4 font-semibold">Divisi</th>
                  <th className="px-6 py-4 font-semibold">Sub Divisi</th>
                  <th className="px-6 py-4 font-semibold">Penempatan</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Bank</th>
                  <th className="px-6 py-4 font-semibold">No Rekening</th>
                  <th className="px-6 py-4 font-semibold">TTL</th>
                  <th className="px-6 py-4 font-semibold">NIK</th>
                  <th className="px-6 py-4 font-semibold">Telepon</th>
                  <th className="px-6 py-4 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length ? (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-[#f1e5de] text-sm text-[#513d39] hover:bg-[#fffaf7]">
                      <td className="px-6 py-5 font-semibold text-[#241716]">{employee.name}</td>
                      <td className="px-6 py-5">{employee.nip}</td>
                      <td className="px-6 py-5">{employee.unit || "-"}</td>
                      <td className="px-6 py-5">{employee.role}</td>
                      <td className="px-6 py-5">{employee.department}</td>
                      <td className="px-6 py-5">{employee.division}</td>
                      <td className="px-6 py-5">{employee.subDivision || "-"}</td>
                      <td className="px-6 py-5">{employee.placement || "-"}</td>
                      <td className="px-6 py-5">{formatStatus(employee.employmentStatus)}</td>
                      <td className="px-6 py-5">{employee.bank || "-"}</td>
                      <td className="px-6 py-5">{employee.accountNumber || "-"}</td>
                      <td className="px-6 py-5">
                        {[employee.birthPlace, employee.birthDate].filter(Boolean).join(", ") || "-"}
                      </td>
                      <td className="px-6 py-5">{employee.nik || "-"}</td>
                      <td className="px-6 py-5">{employee.phoneNumber || "-"}</td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingEmployee(employee)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d9d6ea] bg-[#faf8ff] text-[#4e3f79] transition hover:border-[#cfc6e7] hover:bg-[#f3efff]"
                            aria-label={`Lihat ${employee.name}`}
                            title="Lihat"
                          >
                            <ViewIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(employee)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e8d5cc] bg-white text-[#3c2824] transition hover:border-[#d6bbb0] hover:bg-[#fff7f2] hover:text-[#8f1d22]"
                            aria-label={`Edit ${employee.name}`}
                            title="Edit"
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(employee)}
                            disabled={deletingId === employee.id}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Hapus ${employee.name}`}
                            title="Hapus"
                          >
                            {deletingId === employee.id ? <SpinnerIcon /> : <DeleteIcon />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={15} className="px-6 py-16 text-center text-[#8a6f68]">
                      Belum ada data yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {viewingEmployee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,#fffdfa_0%,#fff7f2_100%)] shadow-[0_40px_120px_rgba(15,23,42,0.28)]">
            <div className="relative overflow-hidden border-b border-[#ead9d1] bg-[linear-gradient(135deg,#fff8f2_0%,#fff1e8_52%,#fffdfa_100%)] px-6 py-6">
              <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#f4cdb8]/35 blur-3xl" />
              <div className="absolute left-1/3 top-0 h-32 w-32 rounded-full bg-[#f8dcca]/35 blur-3xl" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-18 w-18 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,#8f1d22_0%,#d06c4b_100%)] text-2xl font-semibold text-white shadow-[0_18px_45px_rgba(143,29,34,0.28)]">
                    {viewingEmployee.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                      Detail Karyawan
                    </p>
                    <h3 className="mt-2 text-3xl font-semibold text-[#241716]">{viewingEmployee.name}</h3>
                    <p className="mt-2 text-sm text-[#7a6059]">
                      {viewingEmployee.nip} • {viewingEmployee.role} • {viewingEmployee.department}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#8f1d22] shadow-sm">
                        {formatStatus(viewingEmployee.employmentStatus)}
                      </span>
                      <span className="rounded-full bg-[#f4ebe6] px-3 py-1 text-xs font-semibold text-[#6d524a]">
                        Status data: {viewingEmployee.dataStatus}
                      </span>
                      <span className="rounded-full bg-[#f4ebe6] px-3 py-1 text-xs font-semibold text-[#6d524a]">
                        Akun: {viewingEmployee.userActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingEmployee(null)}
                  className="rounded-2xl border border-[#e8d5cc] bg-white/90 px-4 py-2 text-sm font-semibold text-[#3c2824] shadow-sm"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-140px)] overflow-y-auto px-6 py-6">
              <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-6">
                  <section className="rounded-[30px] border border-[#ead7ce] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                      Ringkasan
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {identityEntries.map((entry) => (
                        <div key={entry.label} className="rounded-[22px] bg-[#f9f3ef] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                            {entry.label}
                          </p>
                          <p className="mt-2 break-words text-sm font-medium text-[#2b1e1b]">{entry.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#ead7ce] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                      Data Personal
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {personalEntries.map((entry) => (
                        <div key={entry.label} className="rounded-[22px] border border-[#f0e1d9] bg-[#fffaf7] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                            {entry.label}
                          </p>
                          <p className="mt-2 break-words text-sm text-[#3f302c]">{entry.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#ead7ce] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                      Alamat
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[22px] border border-[#f0e1d9] bg-[#fffaf7] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                          Alamat KTP
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#3f302c]">{viewingEmployee.addressKtp || "-"}</p>
                      </div>
                      <div className="rounded-[22px] border border-[#f0e1d9] bg-[#fffaf7] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                          Alamat Rumah / Kost
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#3f302c]">{viewingEmployee.addressCurrent || "-"}</p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-[30px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfb_0%,#fff7f1_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                      Organisasi Kerja
                    </p>
                    <div className="mt-4 space-y-3">
                      {workEntries.map((entry) => (
                        <div key={entry.label} className="flex items-start justify-between gap-4 rounded-[20px] bg-white px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9c766a]">
                            {entry.label}
                          </p>
                          <p className="text-right text-sm font-medium text-[#2f201d]">{entry.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#ead7ce] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                      Finansial
                    </p>
                    <div className="mt-4 space-y-3">
                      {financeEntries.map((entry) => (
                        <div key={entry.label} className="rounded-[20px] border border-[#f0e1d9] bg-[#fffaf7] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                            {entry.label}
                          </p>
                          <p className="mt-2 text-sm font-medium text-[#2f201d]">{entry.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#ead7ce] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                      Timeline Kerja
                    </p>
                    <div className="mt-4 space-y-3">
                      {timelineEntries.map((entry) => (
                        <div key={entry.label} className="rounded-[20px] bg-[#f9f3ef] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                            {entry.label}
                          </p>
                          <p className="mt-2 text-sm font-medium text-[#2f201d]">{entry.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#ead7ce] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                      Dokumen
                    </p>
                    <div className="mt-4 rounded-[22px] bg-[linear-gradient(135deg,#fff5ef_0%,#fffdfa_100%)] p-4">
                      <p className="text-sm text-[#6d524a]">
                        Foto KTP
                      </p>
                      {viewingEmployee.ktpPhoto ? (
                        <a
                          href={viewingEmployee.ktpPhoto}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex rounded-full bg-[#8f1d22] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(143,29,34,0.22)]"
                        >
                          Buka Dokumen
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-[#8a6f68]">Belum ada file KTP tersimpan.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
