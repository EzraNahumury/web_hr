"use client";

import { useEffect, useState } from "react";
import type { EmployeeListItem } from "@/lib/employees";

const RELIGIONS = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"];

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";
const selectClassName =
  `${inputClassName} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23845b52' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:18px_18px] bg-[right_1rem_center] bg-no-repeat pr-11`;
const textareaClassName =
  "min-h-[108px] w-full rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

type ProfileForm = {
  name: string;
  gender: "" | "laki-laki" | "perempuan";
  birthPlace: string;
  birthDate: string;
  nik: string;
  religion: string;
  phoneNumber: string;
  addressKtp: string;
  addressCurrent: string;
  ktpPhotoLink: string;
  bank: string;
  accountNumber: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2.5">
      <span className="text-[13px] font-semibold text-[#6f5a54]">{label}</span>
      {children}
    </label>
  );
}

export default function EmployeeProfileForm({ initial }: { initial: EmployeeListItem }) {
  const [form, setForm] = useState<ProfileForm>({
    name: initial.name ?? "",
    gender: initial.gender ?? "",
    birthPlace: initial.birthPlace ?? "",
    birthDate: initial.birthDate ?? "",
    nik: initial.nik ?? "",
    religion: initial.religion ?? "",
    phoneNumber: initial.phoneNumber ?? "",
    addressKtp: initial.addressKtp ?? "",
    addressCurrent: initial.addressCurrent ?? "",
    ktpPhotoLink: initial.ktpPhoto ?? "",
    bank: initial.bank ?? "",
    accountNumber: initial.accountNumber ?? "",
  });
  const [isAddressSame, setIsAddressSame] = useState(
    !!initial.addressKtp && initial.addressKtp === initial.addressCurrent,
  );
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [validationPopup, setValidationPopup] = useState<{ missing: string[] } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function validateForm(): string[] {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Nama Lengkap");
    if (!form.gender) missing.push("Jenis Kelamin");
    if (!form.birthPlace.trim()) missing.push("Tempat Lahir");
    if (!form.birthDate) missing.push("Tanggal Lahir");
    if (!form.nik.trim()) missing.push("NIK");
    if (!form.religion) missing.push("Agama");
    if (!form.phoneNumber.trim()) missing.push("Nomor Telepon");
    if (!ktpFile && !form.ktpPhotoLink) missing.push("Foto KTP");
    if (!form.bank.trim()) missing.push("Bank");
    if (!form.accountNumber.trim()) missing.push("No Rekening");
    if (!form.addressKtp.trim()) missing.push("Alamat KTP");
    if (!form.addressCurrent.trim()) missing.push("Alamat Rumah / Kost");
    return missing;
  }

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "addressKtp" && isAddressSame) {
        next.addressCurrent = value as string;
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const missing = validateForm();
    if (missing.length > 0) {
      setValidationPopup({ missing });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (ktpFile) formData.append("ktpFile", ktpFile);

      const response = await fetch("/api/employee/profile", {
        method: "PUT",
        body: formData,
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Gagal menyimpan.");
      setToast({ message: result.message || "Data berhasil disimpan.", type: "success" });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-6 top-24 z-50 max-w-sm rounded-[22px] border bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <p className={`text-sm font-semibold ${toast.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {toast.message}
          </p>
        </div>
      ) : null}

      {validationPopup ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-4 border-b border-[#f3dcd4] px-6 py-5">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#fdecec] text-[#8f1d22]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-[#241716]">Data Belum Lengkap</h4>
                <p className="mt-1 text-sm text-[#7a6059]">
                  Mohon lengkapi data diri Anda terlebih dahulu sebelum menyimpan.
                </p>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto px-6 py-4">
              <p className="text-sm font-semibold text-[#6f5a54]">Kolom yang belum diisi:</p>
              <ul className="mt-2 space-y-1.5">
                {validationPopup.missing.map((field) => (
                  <li key={field} className="flex items-center gap-2 text-sm text-[#2d1b18]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8f1d22]" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#f3dcd4] bg-[#fffaf7] px-6 py-4">
              <button
                type="button"
                onClick={() => setValidationPopup(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#8f1d22] px-5 text-sm font-semibold text-white"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)]">
        <div className="border-b border-[#eddad1] px-6 py-6">
          <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
            Data Pribadi
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-[#241716]">Lengkapi Profil Anda</h3>
          <p className="mt-2 text-sm text-[#7a6059]">
            Isi data diri Anda di bawah ini. Data yang bertanda (*) wajib diisi.
          </p>
        </div>

        <form noValidate className="space-y-6 px-6 py-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama Lengkap *">
              <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClassName} />
            </Field>
            <Field label="Jenis Kelamin">
              <select value={form.gender} onChange={(e) => update("gender", e.target.value as ProfileForm["gender"])} className={selectClassName}>
                <option value="">Pilih jenis kelamin</option>
                <option value="laki-laki">Laki-laki</option>
                <option value="perempuan">Perempuan</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Tempat Lahir">
              <input value={form.birthPlace} onChange={(e) => update("birthPlace", e.target.value)} className={inputClassName} />
            </Field>
            <Field label="Tanggal Lahir">
              <input type="date" value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} className={inputClassName} />
            </Field>
            <Field label="NIK">
              <input value={form.nik} onChange={(e) => update("nik", e.target.value)} className={inputClassName} placeholder="Nomor Induk Kependudukan" />
            </Field>
            <Field label="Agama">
              <select value={form.religion} onChange={(e) => update("religion", e.target.value)} className={selectClassName}>
                <option value="">Pilih agama</option>
                {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Nomor Telepon">
              <input value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} className={inputClassName} placeholder="08xxxxxxxxxx" />
            </Field>
            <Field label="Foto KTP">
              <div className="space-y-2">
                <label className="flex h-12 cursor-pointer items-center justify-between rounded-2xl border border-[#ead7ce] bg-white px-3.5 transition hover:border-[#d2b0a5]">
                  <span className="inline-flex h-9 items-center rounded-xl bg-[#8f1d22] px-4 text-sm font-semibold text-white">Pilih File</span>
                  <span className="ml-3 truncate text-sm text-[#7d635c]">
                    {ktpFile ? ktpFile.name : form.ktpPhotoLink ? "File tersimpan" : "Belum ada file"}
                  </span>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setKtpFile(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
                {form.ktpPhotoLink ? (
                  <p className="text-xs text-[#7d635c]">
                    File tersimpan:{" "}
                    <a href={form.ktpPhotoLink} target="_blank" className="font-semibold text-[#8f1d22] underline" rel="noreferrer">lihat file</a>
                  </p>
                ) : null}
              </div>
            </Field>
            <Field label="Bank">
              <input value={form.bank} onChange={(e) => update("bank", e.target.value)} className={inputClassName} placeholder="Nama bank" />
            </Field>
            <Field label="No Rekening">
              <input value={form.accountNumber} onChange={(e) => update("accountNumber", e.target.value)} className={inputClassName} placeholder="Nomor rekening" />
            </Field>
          </div>

          <div className="grid gap-4">
            <Field label="Alamat KTP">
              <textarea value={form.addressKtp} onChange={(e) => update("addressKtp", e.target.value)} className={textareaClassName} />
            </Field>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#6f5a54]">Alamat Rumah / Kost</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-[#ead7ce] text-[#8f1d22] focus:ring-[#c8716d]"
                    checked={isAddressSame}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsAddressSame(checked);
                      if (checked) update("addressCurrent", form.addressKtp);
                    }}
                  />
                  <span className="text-xs text-[#8a6f68]">Sama dengan Alamat KTP</span>
                </label>
              </div>
              <textarea
                value={form.addressCurrent}
                onChange={(e) => {
                  update("addressCurrent", e.target.value);
                  setIsAddressSame(false);
                }}
                disabled={isAddressSame}
                className={`${textareaClassName} ${isAddressSame ? "cursor-not-allowed opacity-60 bg-gray-50" : ""}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Data Diri"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
