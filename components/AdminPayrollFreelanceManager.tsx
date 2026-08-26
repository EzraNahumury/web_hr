"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

function PeriodSelector({
  month, year, onChange,
}: {
  month: number; year: number;
  onChange: (month: number, year: number) => void;
}) {
  const value = `${year}-${String(month).padStart(2, "0")}`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-[#4a3430]">Periode:</span>
      <input
        type="month"
        value={value}
        onChange={(e) => {
          const [y, m] = e.target.value.split("-");
          if (y && m) onChange(Number(m), Number(y));
        }}
        className="h-10 rounded-xl border border-[#ead7ce] bg-white px-3 text-sm text-[#2d1b18] outline-none focus:border-[#c8716d]"
      />
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

type AbsensiDetailItem = {
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  menit_kerja: number;
};

function JamDetailModal({
  name, bulan, tahun, employeeId, onClose,
}: {
  name: string; bulan: number; tahun: number; employeeId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<AbsensiDetailItem[] | null>(null);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const dirtyRef = useRef(false);

  // Refresh data induk (Total Gaji + payroll) saat modal ditutup bila ada perubahan jam.
  function handleClose() {
    if (dirtyRef.current) router.refresh();
    onClose();
  }

  useEffect(() => {
    setRows(null);
    fetch(`/api/admin/freelance/jam?karyawanId=${employeeId}&bulan=${bulan}&tahun=${tahun}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, [employeeId, bulan, tahun]);

  function calcMenit(masuk: string | null, pulang: string | null): number {
    if (masuk && pulang) {
      const m = Number(masuk.slice(0, 2)) * 60 + Number(masuk.slice(3, 5));
      const p = Number(pulang.slice(0, 2)) * 60 + Number(pulang.slice(3, 5));
      return Math.max(0, p - m);
    }
    return masuk ? 480 : 0;
  }

  function onJamChange(idx: number, field: "jam_masuk" | "jam_pulang", value: string) {
    setRows((cur) => {
      if (!cur) return cur;
      const next = [...cur];
      const r = { ...next[idx], [field]: value || null };
      r.menit_kerja = calcMenit(r.jam_masuk, r.jam_pulang);
      next[idx] = r;
      return next;
    });
  }

  async function saveRow(r: AbsensiDetailItem) {
    setMsg(null);
    setSavingDate(r.tanggal);
    try {
      const res = await fetch("/api/admin/freelance/jam", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          karyawanId: employeeId,
          tanggal: r.tanggal,
          jamMasuk: r.jam_masuk,
          jamPulang: r.jam_pulang,
        }),
      });
      const data = (await res.json()) as { message?: string; menitKerja?: number };
      if (!res.ok) {
        setMsg({ type: "error", text: data.message ?? "Gagal menyimpan." });
        return;
      }
      dirtyRef.current = true;
      setMsg({ type: "success", text: `Jam ${r.tanggal} tersimpan.` });
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setSavingDate(null);
    }
  }

  // Jumlahkan menit persis dulu, baru CEIL sekali ke total
  const totalMenitReal = (rows ?? []).reduce((s, r) => s + Number(r.menit_kerja), 0);
  const totalMenitBulat = Math.ceil(totalMenitReal / 30) * 30;
  const totalJam = Math.floor(totalMenitBulat / 60);
  const sisaMenit = totalMenitBulat % 60;

  function fmtMenit(m: number) {
    const h = Math.floor(m / 60);
    const mn = m % 60;
    if (mn === 0) return `${h} jam`;
    return `${h} jam ${mn} mnt`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between rounded-t-2xl bg-[#8f1d22] px-5 py-4">
          <div>
            <p className="font-semibold text-white">{name}</p>
            <p className="text-xs text-[#f7c6c6]">Detail absensi periode ini</p>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-[#f0e2dc] bg-[#fffaf8] px-5 py-2">
          <p className="text-[11px] text-[#9e7a72]">Klik jam masuk/pulang untuk mengubah — otomatis tersimpan.</p>
          {msg ? (
            <p className={`text-[11px] font-semibold ${msg.type === "success" ? "text-[#17603b]" : "text-[#b94040]"}`}>
              {savingDate ? "Menyimpan..." : msg.text}
            </p>
          ) : savingDate ? (
            <p className="text-[11px] font-semibold text-[#9e7a72]">Menyimpan...</p>
          ) : null}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {rows === null ? (
            <p className="px-5 py-6 text-center text-sm text-[#9e7a72]">Memuat...</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-[#9e7a72]">Tidak ada data absensi.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#fef9f0] text-[#7c3c24] sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">#</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Tanggal</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Jam Masuk</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Jam Pulang</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.tanggal} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf7f5]"}>
                    <td className="px-4 py-2 text-[#9e7a72]">{i + 1}</td>
                    <td className="px-4 py-2 text-[#2d1b18]">{r.tanggal}</td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="time"
                        value={r.jam_masuk ?? ""}
                        onChange={(e) => onJamChange(i, "jam_masuk", e.target.value)}
                        onBlur={() => saveRow(r)}
                        disabled={savingDate === r.tanggal}
                        className="w-24 rounded-lg border border-[#e0c8c2] bg-white px-2 py-1 text-center text-sm text-[#4a3430] outline-none focus:border-[#8f1d22] disabled:opacity-50"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="time"
                        value={r.jam_pulang ?? ""}
                        onChange={(e) => onJamChange(i, "jam_pulang", e.target.value)}
                        onBlur={() => saveRow(r)}
                        disabled={savingDate === r.tanggal}
                        className="w-24 rounded-lg border border-[#e0c8c2] bg-white px-2 py-1 text-center text-sm text-[#4a3430] outline-none focus:border-[#8f1d22] disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-[#4a3430]">{fmtMenit(Number(r.menit_kerja))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#fef3e4] font-bold text-[#7c3c24]">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right">TOTAL</td>
                  <td className="px-4 py-2.5 text-right">{totalJam} jam {sisaMenit > 0 ? `${sisaMenit} mnt` : ""}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <div className="border-t border-[#ead7ce] px-5 py-3 text-right">
          <button onClick={handleClose} className="rounded-xl border border-[#e0c8c2] px-4 py-2 text-sm font-semibold text-[#4a3430] hover:bg-[#fdf7f5]">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function JamTable({
  rows, bulan, tahun, onSaved,
}: {
  rows: FreelanceJamRow[];
  bulan: number; tahun: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<{ [empId: number]: string }>({});
  const [saving, setSaving] = useState<{ [empId: number]: boolean }>({});
  const [detail, setDetail] = useState<{ employeeId: number; name: string } | null>(null);

  async function saveRate(row: FreelanceJamRow) {
    const rate = editing[row.employeeId];
    if (rate === undefined) return;
    setSaving((p) => ({ ...p, [row.employeeId]: true }));
    try {
      await fetch("/api/admin/freelance/jam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karyawanId: row.employeeId, bulan, tahun, ratePerJam: Number(rate) || 0 }),
      });
      setEditing((p) => { const n = { ...p }; delete n[row.employeeId]; return n; });
      onSaved();
    } finally {
      setSaving((p) => ({ ...p, [row.employeeId]: false }));
    }
  }

  if (rows.length === 0) {
    return (
      <SectionCard title="Freelance Jam" subtitle="Otomatis dari absensi × rate per jam">
        <p className="px-5 py-6 text-sm text-[#9e7a72]">Tidak ada karyawan freelance tipe jam.</p>
      </SectionCard>
    );
  }

  const totalGaji = rows.reduce((s, r) => {
    const rate = editing[r.employeeId] !== undefined ? (Number(editing[r.employeeId]) || 0) : r.ratePerJam;
    return s + r.jamKerja * rate;
  }, 0);

  return (
    <>
    <SectionCard title="Freelance Jam" subtitle="Otomatis dari absensi × rate per jam — klik Edit untuk set rate">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#fef9f0] text-[#7c3c24]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Nama</th>
              <th className="px-4 py-3 text-right font-semibold">Jam Kerja</th>
              <th className="px-4 py-3 text-right font-semibold">Rate/Jam</th>
              <th className="px-4 py-3 text-right font-semibold">Total Gaji</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isEditing = row.employeeId in editing;
              const rate = isEditing ? (Number(editing[row.employeeId]) || 0) : row.ratePerJam;
              return (
                <tr key={row.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf7f5]"}>
                  <td className="px-4 py-2.5 text-[#9e7a72]">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-[#2d1b18]">{row.name}</td>
                  <td className="px-4 py-2.5 text-right text-[#4a3430]">{formatHours(row.jamKerja)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editing[row.employeeId]}
                        onChange={(e) => setEditing((p) => ({ ...p, [row.employeeId]: e.target.value }))}
                        className="w-32 rounded-lg border border-[#ead7ce] px-2 py-1 text-right text-sm outline-none focus:border-[#c8716d]"
                        placeholder="Rate/jam"
                      />
                    ) : (
                      <span className="text-[#4a3430]">{formatCurrency(row.ratePerJam)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#2d1b18]">{formatCurrency(row.jamKerja * rate)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setDetail({ employeeId: row.employeeId, name: row.name })} className="rounded-lg border border-[#c8e0f7] bg-[#f0f7ff] px-3 py-1 text-xs font-semibold text-[#1e4d8c] hover:bg-[#dceeff]">
                        Detail
                      </button>
                      {isEditing ? (
                        <>
                          <button onClick={() => saveRate(row)} disabled={saving[row.employeeId]} className="rounded-lg bg-[#8f1d22] px-3 py-1 text-xs font-semibold text-white hover:bg-[#7a1a1e] disabled:opacity-50">
                            {saving[row.employeeId] ? "..." : "Simpan"}
                          </button>
                          <button onClick={() => setEditing((p) => { const n = { ...p }; delete n[row.employeeId]; return n; })} className="rounded-lg border border-[#e0c8c2] px-3 py-1 text-xs font-semibold text-[#4a3430] hover:bg-[#fdf7f5]">
                            Batal
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setEditing((p) => ({ ...p, [row.employeeId]: String(row.ratePerJam) }))} className="rounded-lg border border-[#e0c8c2] px-3 py-1 text-xs font-semibold text-[#7c3c24] hover:bg-[#fef9f0]">
                          Edit
                        </button>
                      )}
                    </div>
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
    {detail && (
      <JamDetailModal
        employeeId={detail.employeeId}
        name={detail.name}
        bulan={bulan}
        tahun={tahun}
        onClose={() => setDetail(null)}
      />
    )}
    </>
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

  const [saveError, setSaveError] = useState<string | null>(null);

  // Simpan SEMUA baris sekali klik (harga/qty semua jenis) — tidak perlu klik per baris.
  async function saveAll() {
    setSaveError(null);
    setSaving((p) => ({ ...p, saveAll: true }));
    const nextItems = items.map((it) => {
      const hRaw = editingCell[`h_${it.itemId}`];
      const pRaw = editingCell[`p_${it.itemId}`];
      const harga = hRaw !== undefined ? Number(hRaw) || 0 : it.hargaPerPcs;
      const pcs = pRaw !== undefined ? Number(pRaw) || 0 : it.jumlahPcs;
      return { ...it, hargaPerPcs: harga, jumlahPcs: pcs, total: harga * pcs };
    });
    try {
      const results = await Promise.all(
        nextItems.map((it) =>
          fetch("/api/admin/freelance/custom-pengerjaan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ karyawanId: row.employeeId, itemId: it.itemId, bulan, tahun, hargaPerPcs: it.hargaPerPcs, jumlahPcs: it.jumlahPcs }),
          }),
        ),
      );
      if (results.some((r) => !r.ok)) {
        setSaveError("Sebagian data gagal disimpan. Coba lagi.");
        return;
      }
      setItems(nextItems);
      setEditingCell({});
      onSaved();
      onClose();
    } catch {
      setSaveError("Gagal menyimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving((p) => ({ ...p, saveAll: false }));
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
                      <div className="flex justify-end">
                        <button
                          onClick={() => deleteItem(item.itemId)}
                          disabled={saving[`del_${item.itemId}`]}
                          className="rounded-lg border border-[#f1c0c0] px-2.5 py-1 text-xs font-semibold text-[#b94040] hover:bg-[#fff2f0] disabled:opacity-50"
                          title="Hapus jenis"
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

          {saveError ? (
            <p className="mt-3 rounded-lg bg-[#fdecec] px-3 py-2 text-xs font-medium text-[#b94040]">{saveError}</p>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#ead7ce] pt-4">
            <button
              onClick={onClose}
              disabled={saving.saveAll}
              className="h-10 rounded-xl border border-[#ead7ce] px-5 text-sm font-semibold text-[#7c3c24] hover:bg-[#fdf7f5] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={saveAll}
              disabled={saving.saveAll || items.length === 0}
              className="h-10 rounded-xl bg-[#8f1d22] px-6 text-sm font-semibold text-white hover:bg-[#7a1a1e] disabled:opacity-50"
            >
              {saving.saveAll ? "Menyimpan..." : "Simpan"}
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
          <JamTable rows={sheet.jam} bulan={sheet.periodMonth} tahun={sheet.periodYear} onSaved={reload} />
          <PengerjaanTable rows={sheet.pengerjaan} bulan={sheet.periodMonth} tahun={sheet.periodYear} onSaved={reload} />
          <HarianTable rows={sheet.harian} bulan={sheet.periodMonth} tahun={sheet.periodYear} onSaved={reload} />
          <CustomTable rows={sheet.custom} bulan={sheet.periodMonth} tahun={sheet.periodYear} onSaved={reload} />
        </div>
      )}
    </div>
  );
}
