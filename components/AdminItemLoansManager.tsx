"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ItemLoanRecord } from "@/lib/item-loans";

type EmployeeOption = { id: number; name: string; nip: string };

type Props = {
  initialRows: ItemLoanRecord[];
  employees: EmployeeOption[];
  readOnly?: boolean;
};

export default function AdminItemLoansManager({ initialRows, employees, readOnly = false }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeOption[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [empOpen, setEmpOpen] = useState(false);
  const [items, setItems] = useState<string[]>([""]);
  const [loanDate, setLoanDate] = useState("");
  const [note, setNote] = useState("");
  const empRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (empRef.current && !empRef.current.contains(e.target as Node)) setEmpOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectedIds = useMemo(() => new Set(selectedEmployees.map((e) => e.id)), [selectedEmployees]);

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return employees.filter(
      (e) =>
        !selectedIds.has(e.id) &&
        (!q || e.name.toLowerCase().includes(q) || e.nip.toLowerCase().includes(q)),
    );
  }, [empSearch, employees, selectedIds]);

  function addEmployee(e: EmployeeOption) {
    setSelectedEmployees((prev) => (prev.some((x) => x.id === e.id) ? prev : [...prev, e]));
    setEmpSearch("");
  }
  function removeEmployee(id: number) {
    setSelectedEmployees((prev) => prev.filter((e) => e.id !== id));
  }

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? value : it)));
  }
  function addItemField() {
    setItems((prev) => [...prev, ""]);
  }
  function removeItemField(index: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function resetForm() {
    setEditingId(null);
    setSelectedEmployees([]);
    setEmpSearch("");
    setItems([""]);
    setLoanDate("");
    setNote("");
  }

  function startEdit(r: ItemLoanRecord) {
    setEditingId(r.id);
    setSelectedEmployees(r.employees.map((e) => ({ id: e.id, name: e.name, nip: e.nip })));
    setItems(r.items.length > 0 ? [...r.items] : [""]);
    setLoanDate(r.loanDate ?? "");
    setNote(r.note ?? "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSubmit() {
    const cleanItems = items.map((s) => s.trim()).filter(Boolean);
    if (selectedEmployees.length === 0) {
      setToast({ type: "error", text: "Pilih minimal satu karyawan." });
      return;
    }
    if (cleanItems.length === 0) {
      setToast({ type: "error", text: "Isi minimal satu barang yang dipinjam." });
      return;
    }
    const payload = {
      employeeIds: selectedEmployees.map((e) => e.id),
      items: cleanItems,
      loanDate: loanDate || null,
      note: note || null,
    };
    startTransition(async () => {
      try {
        const res = await fetch(
          editingId ? `/api/admin/item-loans/${editingId}` : "/api/admin/item-loans",
          {
            method: editingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const result = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(result.message || "Gagal menyimpan.");
        setToast({ type: "success", text: result.message || "Tersimpan." });
        resetForm();
        router.refresh();
      } catch (error) {
        setToast({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan." });
      }
    });
  }

  function handleDelete(id: number) {
    setDeletingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/item-loans/${id}`, { method: "DELETE" });
        const result = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(result.message || "Gagal menghapus.");
        setRows((prev) => prev.filter((r) => r.id !== id));
        if (editingId === id) resetForm();
        setToast({ type: "success", text: result.message || "Data dihapus." });
      } catch (error) {
        setToast({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan." });
      } finally {
        setDeletingId(null);
      }
    });
  }

  const inputClass =
    "h-11 w-full rounded-2xl border border-[#e2cfc7] bg-white px-4 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_3px_rgba(201,127,91,0.14)]";

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed right-6 top-24 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-[#cfe8d4] bg-[#f2fbf4] text-[#267344]"
              : "border-[#f2c4c4] bg-[#fff4f4] text-[#b13232]"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      {/* Form (disembunyikan saat read-only) */}
      {!readOnly && (
      <section ref={formRef} className="rounded-[28px] border border-[#ead7ce] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#241716]">
            {editingId ? "Edit Peminjaman Barang" : "Catat Peminjaman Barang"}
          </h2>
          {editingId ? (
            <span className="inline-flex rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-semibold text-[#8f1d22]">Mode Edit #{editingId}</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[#7a6059]">Pilih karyawan (bisa lebih dari 1), isi barang yang dipinjam (bisa lebih dari 1), tanggal, dan keterangan.</p>

        {/* Employees (multi) */}
        <div className="mt-5">
          <label className="block text-[13px] font-semibold text-[#6f5a54]">Nama Karyawan (bisa lebih dari 1)</label>
          {selectedEmployees.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedEmployees.map((e) => (
                <span key={e.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0e8] px-3 py-1.5 text-xs font-semibold text-[#8f1d22]">
                  {e.name} <span className="text-[#b98d84]">· {e.nip}</span>
                  <button type="button" onClick={() => removeEmployee(e.id)} className="text-[#b98d84] hover:text-[#8f1d22]" title="Hapus karyawan">✕</button>
                </span>
              ))}
            </div>
          ) : null}
          <div ref={empRef} className="relative mt-2">
            <input
              type="text"
              value={empSearch}
              onChange={(e) => { setEmpSearch(e.target.value); setEmpOpen(true); }}
              onFocus={() => setEmpOpen(true)}
              placeholder="Cari nama / NIP karyawan, lalu klik untuk menambah..."
              className={inputClass}
            />
            {empOpen ? (
              <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-[#e2cfc7] bg-white shadow-xl">
                {filteredEmployees.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[#9e7a72]">Tidak ada karyawan lain.</p>
                ) : (
                  filteredEmployees.slice(0, 50).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => addEmployee(e)}
                      className="block w-full px-4 py-2.5 text-left text-sm text-[#241716] hover:bg-[#fff0e8]"
                    >
                      {e.name} <span className="text-[#9e7a72]">· {e.nip}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Date */}
        <div className="mt-4 max-w-xs">
          <label className="block text-[13px] font-semibold text-[#6f5a54]">Tanggal Peminjaman</label>
          <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className={`${inputClass} mt-2`} />
        </div>

        {/* Items */}
        <div className="mt-4">
          <label className="block text-[13px] font-semibold text-[#6f5a54]">Barang yang Dipinjam</label>
          <div className="mt-2 space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={it}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder={`Barang ${i + 1} (mis. Laptop, Kunci, Kendaraan)`}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeItemField(i)}
                  disabled={items.length <= 1}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#f1c0c0] text-[#b94040] transition hover:bg-[#fff2f0] disabled:opacity-40"
                  title="Hapus barang"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItemField}
            className="mt-2 rounded-full border border-[#c8e0c9] bg-[#f0f7f0] px-4 py-1.5 text-sm font-semibold text-[#3f6b45] transition hover:bg-[#e6f2e7]"
          >
            + Tambah Barang
          </button>
        </div>

        {/* Note */}
        <div className="mt-4">
          <label className="block text-[13px] font-semibold text-[#6f5a54]">Keterangan (opsional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Contoh: dipinjam untuk keperluan dinas luar"
            className="mt-2 w-full rounded-2xl border border-[#e2cfc7] bg-white px-4 py-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b] focus:shadow-[0_0_0_3px_rgba(201,127,91,0.14)]"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="h-11 rounded-full border border-[#e2cfc7] bg-white px-5 text-sm font-semibold text-[#5a443d] transition hover:bg-[#fdf6f1]"
          >
            {editingId ? "Batal Edit" : "Reset"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-11 rounded-full bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(143,29,34,0.22)] transition hover:bg-[#7a181d] disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : editingId ? "Update Peminjaman" : "Simpan Peminjaman"}
          </button>
        </div>
      </section>
      )}

      {/* Table */}
      <section className="overflow-hidden rounded-[28px] border border-[#ead7ce] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.14em] text-[#9e7467]">
                <th className="px-5 py-4">No</th>
                <th className="px-5 py-4">Nama</th>
                <th className="px-5 py-4">Barang Dipinjam</th>
                <th className="px-5 py-4">Tgl Peminjaman</th>
                <th className="px-5 py-4">Keterangan</th>
                {!readOnly ? <th className="px-5 py-4 text-right">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 5 : 6} className="px-5 py-10 text-center text-sm text-[#8a6f68]">
                    Belum ada catatan peminjaman barang.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-[#f1e5de] last:border-b-0 align-top">
                    <td className="px-5 py-4 text-[#7a6059]">{i + 1}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        {r.employees.map((e) => (
                          <div key={e.id}>
                            <div className="font-semibold text-[#241716]">{e.name}</div>
                            <div className="text-xs text-[#9e7a72]">{e.nip}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {r.items.map((it, idx) => (
                          <span key={idx} className="inline-flex rounded-full bg-[#f0f7ff] px-2.5 py-1 text-xs font-medium text-[#2f5d8a] ring-1 ring-[#c8e0f7]">
                            {it}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-[#241716]">{r.loanDate || "-"}</td>
                    <td className="px-5 py-4 text-[#5a443d]">{r.note || "-"}</td>
                    {!readOnly ? (
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="rounded-full border border-[#c8e0f7] bg-[#f0f7ff] px-3 py-1.5 text-xs font-semibold text-[#2f5d8a] transition hover:bg-[#e3f0fc]"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="rounded-full border border-[#f1c0c0] px-3 py-1.5 text-xs font-semibold text-[#b94040] transition hover:bg-[#fff2f0] disabled:opacity-50"
                        >
                          {deletingId === r.id ? "..." : "Hapus"}
                        </button>
                      </div>
                    </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
