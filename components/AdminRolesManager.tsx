"use client";

import { useEffect, useMemo, useState } from "react";

import type { AdminItem, ManagedRole } from "@/lib/admins";

type Props = {
  initialRows: AdminItem[];
  currentAdminId: number;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  role: ManagedRole;
  isActive: boolean;
};

const ROLE_LABEL: Record<ManagedRole, string> = {
  admin: "Admin",
  spv: "SPV (Jadwal Toko/Gudang)",
};

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; row: AdminItem }
  | { mode: "delete"; row: AdminItem }
  | null;

const inputClassName =
  "h-11 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 text-[#2d1b18] outline-none placeholder:text-[#b1948d] focus:border-[#c8716d] focus:shadow-[0_0_0_4px_rgba(200,113,109,0.12)]";

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  role: "admin",
  isActive: true,
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminRolesManager({ initialRows, currentAdminId }: Props) {
  const [rows, setRows] = useState<AdminItem[]>(initialRows);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) =>
      [row.name, row.email, ROLE_LABEL[row.role]].join(" ").toLowerCase().includes(keyword),
    );
  }, [rows, search]);

  const activeCount = useMemo(() => rows.filter((row) => row.isActive).length, [rows]);
  const adminCount = useMemo(() => rows.filter((row) => row.role === "admin").length, [rows]);
  const spvCount = useMemo(() => rows.filter((row) => row.role === "spv").length, [rows]);

  function openCreate() {
    setForm(emptyForm);
    setDialog({ mode: "create" });
  }

  function openEdit(row: AdminItem) {
    setForm({
      name: row.name,
      email: row.email,
      password: "",
      role: row.role,
      isActive: row.isActive,
    });
    setDialog({ mode: "edit", row });
  }

  function openDelete(row: AdminItem) {
    setDialog({ mode: "delete", row });
  }

  function closeDialog() {
    if (isSubmitting) return;
    setDialog(null);
  }

  async function refreshRows() {
    const response = await fetch("/api/admin/roles", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { rows: AdminItem[] };
      setRows(data.rows);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!dialog || dialog.mode === "delete") return;

    const isEdit = dialog.mode === "edit";
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();

    if (!name) {
      setToast({ message: "Nama wajib diisi.", type: "error" });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setToast({ message: "Email tidak valid.", type: "error" });
      return;
    }
    if (!isEdit && password.length < 6) {
      setToast({ message: "Password minimal 6 karakter.", type: "error" });
      return;
    }
    if (isEdit && password && password.length < 6) {
      setToast({ message: "Password minimal 6 karakter.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/roles/${dialog.row.id}` : "/api/admin/roles";
      const method = isEdit ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: password || undefined,
          role: form.role,
          isActive: form.isActive,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Gagal memproses.");

      await refreshRows();
      setToast({ message: result.message || "Berhasil.", type: "success" });
      setDialog(null);
      setForm(emptyForm);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!dialog || dialog.mode !== "delete") return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/roles/${dialog.row.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Gagal menghapus.");

      await refreshRows();
      setToast({ message: result.message || "Akun dihapus.", type: "success" });
      setDialog(null);
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
        <div className="fixed right-6 top-24 z-[70] max-w-sm rounded-[22px] border bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <p className={`text-sm font-semibold ${toast.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {toast.message}
          </p>
        </div>
      ) : null}

      <section className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="flex flex-col gap-4 border-b border-[#eddad1] px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
              Manajemen Role
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
              Akun Admin & SPV
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6059]">
              Buat, ubah, atau hapus akun admin dan SPV. SPV hanya bisa akses jadwal Toko/Gudang.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[#ead7ce] bg-white px-4 py-2.5 text-sm text-[#7a6059]">
              Admin: <span className="font-semibold text-[#241716]">{adminCount}</span>
              <span className="mx-2 text-[#ead7ce]">|</span>
              SPV: <span className="font-semibold text-[#241716]">{spvCount}</span>
              <span className="mx-2 text-[#ead7ce]">|</span>
              Aktif: <span className="font-semibold text-emerald-700">{activeCount}</span>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#8f1d22] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(143,29,34,0.22)] transition hover:bg-[#7a171c]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Tambah Akun
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-[#eddad1] px-6 py-4 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau role..."
            className={`${inputClassName} md:max-w-md`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff2ec] text-xs uppercase tracking-[0.16em] text-[#7a6059]">
                <th className="px-6 py-4 font-semibold">Nama</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Dibuat</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f1e5de] text-sm text-[#2d1b18] hover:bg-[#fffaf7]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdecec] text-sm font-semibold text-[#8f1d22]">
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#241716]">{row.name}</div>
                          {row.id === currentAdminId ? (
                            <div className="text-[11px] text-[#a16f63]">Anda saat ini</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{row.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          row.role === "admin"
                            ? "inline-flex items-center rounded-full bg-[#fdecec] px-3 py-1 text-xs font-semibold text-[#8f1d22]"
                            : "inline-flex items-center rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#3949ab]"
                        }
                      >
                        {ROLE_LABEL[row.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          row.isActive
                            ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                            : "inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                        }
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${row.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {row.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#7a6059]">{formatDate(row.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-[#ead7ce] bg-white px-3 text-xs font-semibold text-[#8f1d22] transition hover:border-[#c8716d]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(row)}
                          disabled={row.id === currentAdminId}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-[#f0caca] bg-white px-3 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-base font-semibold text-[#3b2723]">Belum ada akun</p>
                    <p className="mt-2 text-sm text-[#8a6f68]">
                      Tambahkan akun admin atau SPV baru.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {dialog && dialog.mode !== "delete" ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <form onSubmit={handleSubmit}>
              <div className="border-b border-[#f3dcd4] px-6 py-5">
                <h4 className="text-lg font-semibold text-[#241716]">
                  {dialog.mode === "create" ? "Tambah Akun Baru" : "Ubah Akun"}
                </h4>
                <p className="mt-1 text-sm text-[#7a6059]">
                  {dialog.mode === "create"
                    ? "Pilih role akun: Admin (panel HR penuh) atau SPV (khusus jadwal Toko/Gudang)."
                    : "Perbarui informasi akun. Kosongkan password jika tidak ingin mengubah."}
                </p>
              </div>

              <div className="space-y-4 px-6 py-5">
                <label className="block space-y-2">
                  <span className="text-[13px] font-semibold text-[#6f5a54]">Role *</span>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value as ManagedRole }))
                    }
                    disabled={dialog.mode === "edit" && dialog.row.id === currentAdminId}
                    className={`${inputClassName} disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <option value="admin">Admin — akses penuh panel HR</option>
                    <option value="spv">SPV — hanya kelola jadwal Toko/Gudang</option>
                  </select>
                  {dialog.mode === "edit" && dialog.row.id === currentAdminId ? (
                    <span className="block text-xs text-[#a16f63]">
                      Role akun sendiri tidak dapat diubah.
                    </span>
                  ) : null}
                </label>
                <label className="block space-y-2">
                  <span className="text-[13px] font-semibold text-[#6f5a54]">Nama Lengkap *</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputClassName}
                    placeholder="Nama akun"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[13px] font-semibold text-[#6f5a54]">Email *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputClassName}
                    placeholder="admin@example.com"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[13px] font-semibold text-[#6f5a54]">
                    {dialog.mode === "create" ? "Password *" : "Password Baru"}
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className={inputClassName}
                    placeholder={
                      dialog.mode === "create"
                        ? "Minimal 6 karakter"
                        : "Kosongkan jika tidak diubah"
                    }
                    autoComplete="new-password"
                  />
                </label>
                <label className={`flex items-center gap-2 pt-1 ${dialog.mode === "edit" && dialog.row.id === currentAdminId ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    disabled={dialog.mode === "edit" && dialog.row.id === currentAdminId}
                    className="h-4 w-4 rounded border-[#ead7ce] text-[#8f1d22] focus:ring-[#c8716d] disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-[#2d1b18]">
                    Status akun aktif
                    {dialog.mode === "edit" && dialog.row.id === currentAdminId
                      ? <span className="ml-1 text-xs text-[#a16f63]">(tidak dapat diubah untuk akun sendiri)</span>
                      : null}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#f3dcd4] bg-[#fffaf7] px-6 py-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#ead7ce] bg-white px-5 text-sm font-semibold text-[#6f5a54] transition hover:border-[#c8716d] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#8f1d22] px-5 text-sm font-semibold text-white transition hover:bg-[#7a171c] disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan..." : dialog.mode === "create" ? "Buat Akun" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {dialog && dialog.mode === "delete" ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-4 border-b border-[#f3dcd4] px-6 py-5">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#fdecec] text-[#8f1d22]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-[#241716]">Hapus Akun</h4>
                <p className="mt-1 text-sm text-[#7a6059]">
                  Apakah Anda yakin ingin menghapus akun {ROLE_LABEL[dialog.row.role]} <span className="font-semibold text-[#241716]">{dialog.row.name}</span> ({dialog.row.email})? Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#f3dcd4] bg-[#fffaf7] px-6 py-4">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#ead7ce] bg-white px-5 text-sm font-semibold text-[#6f5a54] transition hover:border-[#c8716d] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#b91c1c] px-5 text-sm font-semibold text-white transition hover:bg-[#991b1b] disabled:opacity-60"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
