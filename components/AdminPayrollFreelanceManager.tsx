"use client";

import { useState, useCallback } from "react";
import type {
  FreelanceSheet,
  FreelanceJamRow,
  FreelancePengerjaanRow,
  FreelanceHarianRow,
  FreelanceCustomRow,
  FreelanceCustomItem,
} from "@/lib/payroll-freelance";

function formatCurrency(amount: number) {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
}

function formatHours(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} mnt`;
}

// ── Period selector ──────────────────────────────────────────────────────────

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

function PeriodSelector({
  month, year, onChange,
}: {
  month: number; year: number;
  onChange: (month: number, year: number) => void;
}) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-[#4a3430]">Periode:</span>
      <select
        value={month}
        onChange={(e) => onChange(Number(e.target.value), year)}
        className="h-10 rounded-xl border border-[#ead7ce] bg-white px-3 text-sm text-[#2d1b18] outline-none focus:border-[#c8716d]"
      >
        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
      </select>
      <select
        value={year}
        onChange={(e) => onChange(month, Number(e.target.value))}
        className="h-10 rounded-xl border border-[#ead7ce] bg-white px-3 text-sm text-[#2d1b18] outline-none focus:border-[#c8716d]"
      >
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

// ── Table wrapper ────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e2d0c8] bg-white shadow-sm overflow-hidden">
      <div className="bg-[#8f1d22] px-5 py-3">
        <p className="text-[13px] font-bold tracking-wide text-white">{title}</p>
        {subtitle && <p className="text-[11px] text-[#f5c6c8] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Table 1: Freelance Jam ───────────────────────────────────────────────────

function JamTable({ rows }: { rows: FreelanceJamRow[] }) {
  if (rows.length === 0) {
    return (
      <SectionCard title="Freelance Jam" subtitle="Otomatis dari absensi × rate per jam">
        <p className="px-5 py-6 text-sm text-[#9e7a72]">Tidak ada karyawan freelance tipe jam.</p>
      </SectionCard>
    );
  }
  const totalGaji = rows.reduce((s, r) => s + r.total, 0);
  return (
    <SectionCard title="Freelance Jam" subtitle="Otomatis dari absensi × rate per jam">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#fef9f0] text-[#7c3c24]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Nama</th>
              <th className="px-4 py-3 text-right font-semibold">Jam Kerja</th>
              <th className="px-4 py-3 text-right font-semibold">Rate/Jam</th>
              <th className="px-4 py-3 text-right font-semibold">Total Gaji</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf7f5]"}>
                <td className="px-4 py-2.5 text-[#9e7a72]">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-[#2d1b18]">{row.name}</td>
                <td className="px-4 py-2.5 text-right text-[#4a3430]">{formatHours(row.jamKerja)}</td>
                <td className="px-4 py-2.5 text-right text-[#4a3430]">{formatCurrency(row.ratePerJam)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[#2d1b18]">{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#fef3e4] font-bold text-[#7c3c24]">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right">TOTAL</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totalGaji)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Table 2: Freelance Pengerjaan ────────────────────────────────────────────

function PengerjaanTable({
  rows, bulan, tahun, onSaved,
}: {
  rows: FreelancePengerjaanRow[];
  bulan: number; tahun: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<{ [empId: number]: { harga: string; pcs: string } }>({});
  const [saving, setSaving] = useState<{ [empId: number]: boolean }>({});

  function startEdit(row: FreelancePengerjaanRow) {
    setEditing((prev) => ({
      ...prev,
      [row.employeeId]: {
        harga: String(row.hargaPerPcs || ""),
        pcs: String(row.jumlahPcs || ""),
      },
    }));
  }

  async function saveRow(row: FreelancePengerjaanRow) {
    const vals = editing[row.employeeId];
    if (!vals) return;
    setSaving((prev) => ({ ...prev, [row.employeeId]: true }));
    try {
      await fetch("/api/admin/freelance/pengerjaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          karyawanId: row.employeeId,
          bulan,
          tahun,
          hargaPerPcs: Number(vals.harga) || 0,
          jumlahPcs: Number(vals.pcs) || 0,
        }),
      });
      setEditing((prev) => { const next = { ...prev }; delete next[row.employeeId]; return next; });
      onSaved();
    } finally {
      setSaving((prev) => ({ ...prev, [row.employeeId]: false }));
    }
  }

  if (rows.length === 0) {
    return (
      <SectionCard title="Freelance Pengerjaan" subtitle="Harga/pcs × jumlah pcs">
        <p className="px-5 py-6 text-sm text-[#9e7a72]">Tidak ada karyawan freelance tipe pengerjaan.</p>
      </SectionCard>
    );
  }

  const totalGaji = rows.reduce((s, r) => {
    const ed = editing[r.employeeId];
    return s + (ed ? (Number(ed.harga) || 0) * (Number(ed.pcs) || 0) : r.total);
  }, 0);

  return (
    <SectionCard title="Freelance Pengerjaan" subtitle="Harga/pcs × jumlah pcs — klik baris untuk edit">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#fef9f0] text-[#7c3c24]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Nama</th>
              <th className="px-4 py-3 text-right font-semibold">Harga/Pcs</th>
              <th className="px-4 py-3 text-right font-semibold">Jumlah Pcs</th>
              <th className="px-4 py-3 text-right font-semibold">Total Gaji</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const ed = editing[row.employeeId];
              const isEditing = !!ed;
              const previewTotal = isEditing
                ? (Number(ed.harga) || 0) * (Number(ed.pcs) || 0)
                : row.total;
              return (
                <tr key={row.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf7f5]"}>
                  <td className="px-4 py-2.5 text-[#9e7a72]">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-[#2d1b18]">{row.name}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={ed.harga}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [row.employeeId]: { ...ed, harga: e.target.value } }))}
                        className="w-32 rounded-lg border border-[#ead7ce] px-2 py-1 text-right text-sm outline-none focus:border-[#c8716d]"
                      />
                    ) : (
                      <span className="text-[#4a3430]">{formatCurrency(row.hargaPerPcs)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={ed.pcs}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [row.employeeId]: { ...ed, pcs: e.target.value } }))}
                        className="w-28 rounded-lg border border-[#ead7ce] px-2 py-1 text-right text-sm outline-none focus:border-[#c8716d]"
                      />
                    ) : (
                      <span className="text-[#4a3430]">{row.jumlahPcs}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#2d1b18]">{formatCurrency(previewTotal)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => saveRow(row)} disabled={saving[row.employeeId]} className="rounded-lg bg-[#8f1d22] px-3 py-1 text-xs font-semibold text-white hover:bg-[#7a1a1e] disabled:opacity-50">
                          {saving[row.employeeId] ? "..." : "Simpan"}
                        </button>
                        <button onClick={() => setEditing((prev) => { const next = { ...prev }; delete next[row.employeeId]; return next; })} className="rounded-lg border border-[#e0c8c2] px-3 py-1 text-xs font-semibold text-[#4a3430] hover:bg-[#fdf7f5]">
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(row)} className="rounded-lg border border-[#e0c8c2] px-3 py-1 text-xs font-semibold text-[#7c3c24] hover:bg-[#fef9f0]">
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[#fef3e4] font-bold text-[#7c3c24]">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right">TOTAL</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totalGaji)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Table 3: Freelance Harian ────────────────────────────────────────────────

function HarianTable({
  rows, bulan, tahun, onSaved,
}: {
  rows: FreelanceHarianRow[];
  bulan: number; tahun: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<{ [empId: number]: string }>({});
  const [saving, setSaving] = useState<{ [empId: number]: boolean }>({});

  async function saveRow(row: FreelanceHarianRow) {
    const harga = editing[row.employeeId];
    if (harga === undefined) return;
    setSaving((prev) => ({ ...prev, [row.employeeId]: true }));
    try {
      await fetch("/api/admin/freelance/harian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karyawanId: row.employeeId, bulan, tahun, hargaPerHari: Number(harga) || 0 }),
      });
      setEditing((prev) => { const next = { ...prev }; delete next[row.employeeId]; return next; });
      onSaved();
    } finally {
      setSaving((prev) => ({ ...prev, [row.employeeId]: false }));
    }
  }

  if (rows.length === 0) {
    return (
      <SectionCard title="Freelance Harian" subtitle="Harga/hari × hari masuk (absensi)">
        <p className="px-5 py-6 text-sm text-[#9e7a72]">Tidak ada karyawan freelance tipe harian.</p>
      </SectionCard>
    );
  }

  const totalGaji = rows.reduce((s, r) => {
    const harga = editing[r.employeeId] !== undefined ? (Number(editing[r.employeeId]) || 0) : r.hargaPerHari;
    return s + harga * r.hariMasuk;
  }, 0);

  return (
    <SectionCard title="Freelance Harian" subtitle="Harga/hari × hari masuk (otomatis dari absensi)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#fef9f0] text-[#7c3c24]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Nama</th>
              <th className="px-4 py-3 text-right font-semibold">Harga/Hari</th>
              <th className="px-4 py-3 text-right font-semibold">Hari Masuk</th>
              <th className="px-4 py-3 text-right font-semibold">Total Gaji</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isEditing = row.employeeId in editing;
              const harga = isEditing ? (Number(editing[row.employeeId]) || 0) : row.hargaPerHari;
              const previewTotal = harga * row.hariMasuk;
              return (
                <tr key={row.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf7f5]"}>
                  <td className="px-4 py-2.5 text-[#9e7a72]">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-[#2d1b18]">{row.name}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editing[row.employeeId]}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [row.employeeId]: e.target.value }))}
                        className="w-32 rounded-lg border border-[#ead7ce] px-2 py-1 text-right text-sm outline-none focus:border-[#c8716d]"
                      />
                    ) : (
                      <span className="text-[#4a3430]">{formatCurrency(row.hargaPerHari)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[#4a3430]">{row.hariMasuk} hari</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#2d1b18]">{formatCurrency(previewTotal)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => saveRow(row)} disabled={saving[row.employeeId]} className="rounded-lg bg-[#8f1d22] px-3 py-1 text-xs font-semibold text-white hover:bg-[#7a1a1e] disabled:opacity-50">
                          {saving[row.employeeId] ? "..." : "Simpan"}
                        </button>
                        <button onClick={() => setEditing((prev) => { const next = { ...prev }; delete next[row.employeeId]; return next; })} className="rounded-lg border border-[#e0c8c2] px-3 py-1 text-xs font-semibold text-[#4a3430] hover:bg-[#fdf7f5]">
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditing((prev) => ({ ...prev, [row.employeeId]: String(row.hargaPerHari) }))} className="rounded-lg border border-[#e0c8c2] px-3 py-1 text-xs font-semibold text-[#7c3c24] hover:bg-[#fef9f0]">
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[#fef3e4] font-bold text-[#7c3c24]">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right">TOTAL</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totalGaji)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Table 4: Custom Pengerjaan ───────────────────────────────────────────────

function CustomItemsModal({
  row, bulan, tahun, onClose, onSaved,
}: {
  row: FreelanceCustomRow;
  bulan: number; tahun: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState(row.items);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [editingCell, setEditingCell] = useState<{ [key: string]: string }>({});

  async function addItem() {
    if (!newItem.trim()) return;
    setSaving((p) => ({ ...p, add: true }));
    try {
      const res = await fetch("/api/admin/freelance/custom-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karyawanId: row.employeeId, namaJenis: newItem.trim() }),
      });
      if (res.ok) {
        const item = await res.json() as FreelanceCustomItem;
        setItems((prev) => [...prev, { entryId: null, itemId: item.id, namaJenis: item.namaJenis, hargaPerPcs: 0, jumlahPcs: 0, total: 0 }]);
        setNewItem("");
        onSaved();
      }
    } finally {
      setSaving((p) => ({ ...p, add: false }));
    }
  }

  async function saveEntry(itemId: number) {
    const harga = editingCell[`h_${itemId}`];
    const pcs = editingCell[`p_${itemId}`];
    if (harga === undefined && pcs === undefined) return;
    setSaving((p) => ({ ...p, [`save_${itemId}`]: true }));
    const existing = items.find((it) => it.itemId === itemId);
    const finalHarga = harga !== undefined ? Number(harga) || 0 : existing?.hargaPerPcs ?? 0;
    const finalPcs = pcs !== undefined ? Number(pcs) || 0 : existing?.jumlahPcs ?? 0;
    try {
      await fetch("/api/admin/freelance/custom-pengerjaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karyawanId: row.employeeId, itemId, bulan, tahun, hargaPerPcs: finalHarga, jumlahPcs: finalPcs }),
      });
      setItems((prev) => prev.map((it) =>
        it.itemId === itemId ? { ...it, hargaPerPcs: finalHarga, jumlahPcs: finalPcs, total: finalHarga * finalPcs } : it,
      ));
      setEditingCell((p) => { const n = { ...p }; delete n[`h_${itemId}`]; delete n[`p_${itemId}`]; return n; });
      onSaved();
    } finally {
      setSaving((p) => ({ ...p, [`save_${itemId}`]: false }));
    }
  }

  async function deleteItem(itemId: number) {
    setSaving((p) => ({ ...p, [`del_${itemId}`]: true }));
    try {
      await fetch(`/api/admin/freelance/custom-items?id=${itemId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.itemId !== itemId));
      onSaved();
    } finally {
      setSaving((p) => ({ ...p, [`del_${itemId}`]: false }));
    }
  }

  const grandTotal = items.reduce((s, it) => {
    const h = editingCell[`h_${it.itemId}`] !== undefined ? (Number(editingCell[`h_${it.itemId}`]) || 0) : it.hargaPerPcs;
    const p = editingCell[`p_${it.itemId}`] !== undefined ? (Number(editingCell[`p_${it.itemId}`]) || 0) : it.jumlahPcs;
    return s + h * p;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[#8f1d22] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-white">{row.name}</p>
            <p className="text-xs text-[#f5c6c8]">Custom Pengerjaan</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5">
          <table className="w-full text-sm mb-4">
            <thead className="bg-[#fef9f0] text-[#7c3c24]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Jenis</th>
                <th className="px-3 py-2 text-right font-semibold">Harga/Pcs</th>
                <th className="px-3 py-2 text-right font-semibold">Qty/Pcs</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const h = editingCell[`h_${item.itemId}`] ?? String(item.hargaPerPcs);
                const p = editingCell[`p_${item.itemId}`] ?? String(item.jumlahPcs);
                const rowTotal = (Number(h) || 0) * (Number(p) || 0);
                const isSavingRow = saving[`save_${item.itemId}`];
                return (
                  <tr key={item.itemId} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf7f5]"}>
                    <td className="px-3 py-2 font-medium text-[#2d1b18]">{item.namaJenis}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={h}
                        onChange={(e) => setEditingCell((prev) => ({ ...prev, [`h_${item.itemId}`]: e.target.value }))}
                        className="w-28 rounded-lg border border-[#ead7ce] px-2 py-1 text-right text-sm outline-none focus:border-[#c8716d]"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={p}
                        onChange={(e) => setEditingCell((prev) => ({ ...prev, [`p_${item.itemId}`]: e.target.value }))}
                        className="w-24 rounded-lg border border-[#ead7ce] px-2 py-1 text-right text-sm outline-none focus:border-[#c8716d]"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[#2d1b18]">{formatCurrency(rowTotal)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => saveEntry(item.itemId)}
                          disabled={isSavingRow}
                          className="rounded-lg bg-[#8f1d22] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#7a1a1e] disabled:opacity-50"
                        >
                          {isSavingRow ? "..." : "Simpan"}
                        </button>
                        <button
                          onClick={() => deleteItem(item.itemId)}
                          disabled={saving[`del_${item.itemId}`]}
                          className="rounded-lg border border-[#f1c0c0] px-2.5 py-1 text-xs font-semibold text-[#b94040] hover:bg-[#fff2f0] disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#fef3e4] font-bold text-[#7c3c24]">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-right">TOTAL</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(grandTotal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div className="flex gap-2 items-center border-t border-[#ead7ce] pt-4">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
              placeholder="Nama jenis baru (e.g. STANDAR)"
              className="flex-1 h-9 rounded-xl border border-[#ead7ce] bg-white px-3 text-sm outline-none focus:border-[#c8716d]"
            />
            <button
              onClick={addItem}
              disabled={saving.add || !newItem.trim()}
              className="h-9 rounded-xl bg-[#558b2f] px-4 text-sm font-semibold text-white hover:bg-[#4a7a29] disabled:opacity-50"
            >
              {saving.add ? "..." : "+ Tambah Jenis"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomTable({
  rows, bulan, tahun, onSaved,
}: {
  rows: FreelanceCustomRow[];
  bulan: number; tahun: number;
  onSaved: () => void;
}) {
  const [openRow, setOpenRow] = useState<FreelanceCustomRow | null>(null);

  if (rows.length === 0) {
    return (
      <SectionCard title="Custom Pengerjaan" subtitle="Multi jenis pekerjaan per karyawan">
        <p className="px-5 py-6 text-sm text-[#9e7a72]">Tidak ada karyawan freelance tipe custom pengerjaan.</p>
      </SectionCard>
    );
  }

  const totalGaji = rows.reduce((s, r) => s + r.grandTotal, 0);

  return (
    <>
      {openRow && (
        <CustomItemsModal
          row={openRow}
          bulan={bulan}
          tahun={tahun}
          onClose={() => setOpenRow(null)}
          onSaved={() => { onSaved(); setOpenRow(null); }}
        />
      )}
      <SectionCard title="Custom Pengerjaan" subtitle="Klik nama karyawan untuk input harga & qty per jenis">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#fef9f0] text-[#7c3c24]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Nama</th>
                <th className="px-4 py-3 text-right font-semibold">Jumlah Jenis</th>
                <th className="px-4 py-3 text-right font-semibold">Total Gaji</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf7f5]"}>
                  <td className="px-4 py-2.5 text-[#9e7a72]">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-[#2d1b18]">{row.name}</td>
                  <td className="px-4 py-2.5 text-right text-[#4a3430]">{row.items.length} jenis</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#2d1b18]">{formatCurrency(row.grandTotal)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setOpenRow(row)}
                      className="rounded-lg border border-[#e0c8c2] px-3 py-1 text-xs font-semibold text-[#7c3c24] hover:bg-[#fef9f0]"
                    >
                      Detail / Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#fef3e4] font-bold text-[#7c3c24]">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">TOTAL</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totalGaji)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

// ── Main manager ──────────────────────────────────────────────────────────────

export default function AdminPayrollFreelanceManager({ initialSheet }: { initialSheet: FreelanceSheet }) {
  const [sheet, setSheet] = useState(initialSheet);
  const [loading, setLoading] = useState(false);

  async function loadSheet(month: number, year: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payroll-freelance?month=${month}&year=${year}`);
      if (res.ok) setSheet(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(month: number, year: number) {
    setSheet((prev) => ({ ...prev, periodMonth: month, periodYear: year }));
    loadSheet(month, year);
  }

  const reload = useCallback(() => {
    loadSheet(sheet.periodMonth, sheet.periodYear);
  }, [sheet.periodMonth, sheet.periodYear]);

  const totalAll =
    sheet.jam.reduce((s, r) => s + r.total, 0) +
    sheet.pengerjaan.reduce((s, r) => s + r.total, 0) +
    sheet.harian.reduce((s, r) => s + r.total, 0) +
    sheet.custom.reduce((s, r) => s + r.grandTotal, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e2d0c8] bg-white p-4 shadow-sm">
        <PeriodSelector month={sheet.periodMonth} year={sheet.periodYear} onChange={handlePeriodChange} />
        <div className="text-right">
          <p className="text-xs text-[#9e7a72] font-medium uppercase tracking-wide">Total Payroll Freelance</p>
          <p className="text-2xl font-bold text-[#8f1d22]">{formatCurrency(totalAll)}</p>
        </div>
      </div>

      {loading && <p className="text-center text-sm text-[#9e7a72] py-4">Memuat data...</p>}

      {!loading && (
        <div className="space-y-5">
          <JamTable rows={sheet.jam} />
          <PengerjaanTable rows={sheet.pengerjaan} bulan={sheet.periodMonth} tahun={sheet.periodYear} onSaved={reload} />
          <HarianTable rows={sheet.harian} bulan={sheet.periodMonth} tahun={sheet.periodYear} onSaved={reload} />
          <CustomTable rows={sheet.custom} bulan={sheet.periodMonth} tahun={sheet.periodYear} onSaved={reload} />
        </div>
      )}
    </div>
  );
}
