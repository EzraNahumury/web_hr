"use client";

import { useMemo, useState, useTransition } from "react";

type TargetType = "jabatan" | "departemen" | "penempatan" | "custom";

type Roster = {
  id: number;
  nama: string;
  noKaryawan: string | null;
  penempatan: string;
  departemen: string | null;
  subDivisi: string | null;
  jabatan: string | null;
};

type Group = {
  id: number;
  name: string;
  targetType: TargetType;
  targetValue: string | null;
  sort: number;
  shiftCodes: string[];
  memberIds: number[];
};

type Props = {
  initialGroups: Group[];
  roster: Roster[];
  selectableShifts: { code: string; label: string }[];
  jabatanOptions: string[];
  departemenOptions: string[];
  penempatanOptions: string[];
};

type FormState = {
  id: number | null;
  name: string;
  targetType: TargetType;
  targetValue: string;
  shiftCodes: string[];
  checked: Set<number>;
};

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

export default function AdminShiftGroups({
  initialGroups,
  roster,
  selectableShifts,
  jabatanOptions,
  departemenOptions,
  penempatanOptions,
}: Props) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [form, setForm] = useState<FormState | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [conflicts, setConflicts] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const shiftLabel = useMemo(
    () => new Map(selectableShifts.map((s) => [s.code, s.label] as const)),
    [selectableShifts],
  );

  function targetValuesFor(type: TargetType): string[] {
    if (type === "jabatan") return jabatanOptions;
    if (type === "departemen") return departemenOptions;
    if (type === "penempatan") return penempatanOptions;
    return [];
  }

  // Karyawan yang cocok dengan target form saat ini (untuk grup non-custom).
  function matchingRoster(f: FormState): Roster[] {
    if (f.targetType === "custom") return roster;
    const tv = norm(f.targetValue);
    if (!tv) return [];
    return roster.filter((e) => {
      if (f.targetType === "jabatan") return norm(e.jabatan) === tv;
      if (f.targetType === "departemen") return norm(e.departemen) === tv;
      return norm(e.penempatan) === tv;
    });
  }

  function defaultCheckedFor(type: TargetType, targetValue: string): Set<number> {
    // custom → tidak ada yang tercentang; target-based → semua yang match tercentang.
    if (type === "custom") return new Set();
    const tv = norm(targetValue);
    if (!tv) return new Set();
    return new Set(
      roster
        .filter((e) => {
          if (type === "jabatan") return norm(e.jabatan) === tv;
          if (type === "departemen") return norm(e.departemen) === tv;
          return norm(e.penempatan) === tv;
        })
        .map((e) => e.id),
    );
  }

  function openCreate() {
    setMessage(null);
    setForm({
      id: null,
      name: "",
      targetType: "penempatan",
      targetValue: "",
      shiftCodes: [],
      checked: new Set(),
    });
  }

  function openEdit(g: Group) {
    setMessage(null);
    let checked: Set<number>;
    if (g.targetType === "custom") {
      checked = new Set(g.memberIds);
    } else {
      const tv = norm(g.targetValue);
      const matching = roster.filter((e) => {
        if (g.targetType === "jabatan") return norm(e.jabatan) === tv;
        if (g.targetType === "departemen") return norm(e.departemen) === tv;
        return norm(e.penempatan) === tv;
      });
      const excluded = new Set(g.memberIds);
      checked = new Set(matching.filter((e) => !excluded.has(e.id)).map((e) => e.id));
    }
    setForm({
      id: g.id,
      name: g.name,
      targetType: g.targetType,
      targetValue: g.targetValue ?? "",
      shiftCodes: [...g.shiftCodes],
      checked,
    });
  }

  function changeTarget(type: TargetType, value: string) {
    if (!form) return;
    setForm({ ...form, targetType: type, targetValue: value, checked: defaultCheckedFor(type, value) });
  }

  function toggleShift(code: string) {
    if (!form) return;
    const has = form.shiftCodes.includes(code);
    setForm({
      ...form,
      shiftCodes: has ? form.shiftCodes.filter((c) => c !== code) : [...form.shiftCodes, code],
    });
  }

  function toggleMember(id: number) {
    if (!form) return;
    const next = new Set(form.checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setForm({ ...form, checked: next });
  }

  async function openPopup() {
    if (!form) return;
    setPopupOpen(true);
    // Ambil daftar konflik: karyawan yang sudah dipegang grup LAIN.
    const shown = (form.targetType === "custom" ? roster : matchingRoster(form)).map((e) => e.id);
    try {
      const res = await fetch("/api/admin/shift-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "conflicts", id: form.id, candidateIds: shown }),
      });
      const data = (await res.json()) as { conflicts?: Record<number, string> };
      setConflicts(data.conflicts ?? {});
    } catch {
      setConflicts({});
    }
  }

  function computeMemberIds(f: FormState): number[] {
    if (f.targetType === "custom") return Array.from(f.checked);
    // target-based: yang TIDAK tercentang (di antara yang match) = pengecualian.
    const matching = matchingRoster(f);
    return matching.filter((e) => !f.checked.has(e.id)).map((e) => e.id);
  }

  function save() {
    if (!form) return;
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Nama grup wajib diisi." });
      return;
    }
    if (form.targetType !== "custom" && !form.targetValue) {
      setMessage({ type: "error", text: "Pilih nilai target dulu." });
      return;
    }
    if (form.shiftCodes.length === 0) {
      setMessage({ type: "error", text: "Pilih minimal 1 shift untuk dropdown grup." });
      return;
    }
    const memberIds = computeMemberIds(form);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/shift-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: form.id ? "update" : "create",
            id: form.id,
            name: form.name.trim(),
            targetType: form.targetType,
            targetValue: form.targetType === "custom" ? null : form.targetValue,
            shiftCodes: form.shiftCodes,
            memberIds,
          }),
        });
        const data = (await res.json()) as { message?: string; groups?: Group[] };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal." });
          return;
        }
        if (data.groups) setGroups(data.groups);
        setMessage({ type: "success", text: data.message ?? "Tersimpan." });
        setForm(null);
        setPopupOpen(false);
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  function remove(g: Group) {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/shift-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", id: g.id }),
        });
        const data = (await res.json()) as { message?: string; groups?: Group[] };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal." });
          return;
        }
        if (data.groups) setGroups(data.groups);
        setMessage({ type: "success", text: "Grup dihapus." });
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  function targetLabel(g: Group) {
    if (g.targetType === "custom") return "Custom (pilih karyawan)";
    return `${g.targetType[0].toUpperCase()}${g.targetType.slice(1)}: ${g.targetValue}`;
  }

  const popupList = form
    ? form.targetType === "custom"
      ? roster
      : matchingRoster(form)
    : [];
  const conflictCount = popupList.filter((e) => conflicts[e.id]).length;

  return (
    <div className="space-y-5">
      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            message.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#ead7ce] bg-white px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Grup Shift</p>
          <p className="mt-1 max-w-2xl text-sm text-[#7a6059]">
            Tiap grup menentukan isi dropdown shift untuk sekelompok karyawan. Karyawan tanpa grup
            memakai perilaku bawaan penempatannya. (Fase 1: pilih dari shift yang sudah ada.)
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="h-11 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(143,29,34,0.25)] transition hover:bg-[#a12228]"
        >
          + Tambah Grup
        </button>
      </div>

      {/* Daftar grup */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <p className="rounded-[24px] border border-[#ead7ce] bg-white px-6 py-8 text-center text-sm text-[#8a6f68]">
            Belum ada grup. Klik &ldquo;Tambah Grup&rdquo;.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="rounded-[24px] border border-[#ead7ce] bg-white px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[#241716]">{g.name}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#a16f63]">
                    {targetLabel(g)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.shiftCodes.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-[#e2cfc7] bg-[#fff7f3] px-3 py-1 text-xs font-semibold text-[#7a6059]"
                      >
                        {shiftLabel.get(c) ?? c}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[#9e7467]">
                    {g.targetType === "custom"
                      ? `${g.memberIds.length} karyawan dipilih`
                      : `${g.memberIds.length} pengecualian`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(g)}
                    className="rounded-full border border-[#e2cfc7] px-4 py-1.5 text-xs font-semibold text-[#8f1d22] transition hover:bg-[#fff2f0]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(g)}
                    disabled={isPending}
                    className="rounded-full border border-[#f1c0c0] px-3 py-1.5 text-xs font-semibold text-[#b94040] transition hover:bg-[#fff2f0] disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form grup (modal sederhana) */}
      {form ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/30 p-4">
          <div className="mt-8 w-full max-w-2xl rounded-[24px] border border-[#ead7ce] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <h2 className="text-lg font-semibold text-[#241716]">
              {form.id ? "Edit Grup Shift" : "Tambah Grup Shift"}
            </h2>

            <label className="mt-4 block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6059]">Nama grup</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="mis. Ayres Produksi"
                className="mt-1 h-11 w-full rounded-2xl border border-[#e2cfc7] bg-white px-4 text-sm text-[#241716] outline-none focus:border-[#c97f5b]"
              />
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6059]">Berdasarkan</span>
                <select
                  value={form.targetType}
                  onChange={(e) => changeTarget(e.target.value as TargetType, "")}
                  className="mt-1 h-11 w-full rounded-2xl border border-[#e2cfc7] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]"
                >
                  <option value="jabatan">Jabatan</option>
                  <option value="departemen">Departemen</option>
                  <option value="penempatan">Penempatan</option>
                  <option value="custom">Custom (pilih karyawan)</option>
                </select>
              </label>
              {form.targetType !== "custom" ? (
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6059]">Nilai</span>
                  <select
                    value={form.targetValue}
                    onChange={(e) => changeTarget(form.targetType, e.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-[#e2cfc7] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#c97f5b]"
                  >
                    <option value="">Pilih...</option>
                    {targetValuesFor(form.targetType).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6059]">
                Isi dropdown shift
              </span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {selectableShifts.map((s) => (
                  <label
                    key={s.code}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      form.shiftCodes.includes(s.code)
                        ? "border-[#c97f5b] bg-[#fff2ec] text-[#241716]"
                        : "border-[#e2cfc7] bg-white text-[#7a6059]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.shiftCodes.includes(s.code)}
                      onChange={() => toggleShift(s.code)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#ead7ce] bg-[#fffaf8] px-4 py-3">
              <div className="text-sm text-[#7a6059]">
                {form.targetType === "custom" ? (
                  <>Karyawan dipilih: <b className="text-[#241716]">{form.checked.size}</b></>
                ) : (
                  <>
                    Diterapkan ke <b className="text-[#241716]">{form.checked.size}</b> karyawan
                    {matchingRoster(form).length - form.checked.size > 0 ? (
                      <> · {matchingRoster(form).length - form.checked.size} dikecualikan</>
                    ) : null}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={openPopup}
                disabled={form.targetType !== "custom" && !form.targetValue}
                className="rounded-xl border border-[#c97f5b] bg-white px-4 py-2 text-sm font-semibold text-[#8f1d22] transition hover:bg-[#fff2ec] disabled:opacity-40"
              >
                {form.targetType === "custom" ? "Pilih Karyawan" : "Atur Pengecualian"}
              </button>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setForm(null);
                  setPopupOpen(false);
                }}
                className="h-11 rounded-2xl border border-[#e2cfc7] px-5 text-sm font-semibold text-[#7a6059] transition hover:bg-[#faf3ef]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="h-11 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white transition hover:bg-[#a12228] disabled:opacity-50"
              >
                {isPending ? "Menyimpan..." : "Simpan Grup"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Popup pilih karyawan / pengecualian */}
      {form && popupOpen ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-8 w-full max-w-xl rounded-[24px] border border-[#ead7ce] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#241716]">
                {form.targetType === "custom" ? "Pilih Karyawan" : "Atur Pengecualian"}
              </h3>
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="rounded-full px-3 py-1 text-sm text-[#8a6f68] hover:bg-[#faf3ef]"
              >
                Selesai
              </button>
            </div>
            <p className="mt-1 text-xs text-[#8a6f68]">
              {form.targetType === "custom"
                ? "Centang karyawan yang masuk grup ini."
                : "Semua tercentang = ikut grup. Hilangkan centang untuk mengecualikan."}
              {conflictCount > 0 ? (
                <span className="ml-1 font-semibold text-[#b94040]">
                  · {conflictCount} sudah di grup lain
                </span>
              ) : null}
            </p>

            {popupList.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#8a6f68]">Tidak ada karyawan cocok.</p>
            ) : (
              <ul className="mt-3 max-h-[50vh] divide-y divide-[#f1e5de] overflow-y-auto">
                {popupList.map((e) => {
                  const conflict = conflicts[e.id];
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={form.checked.has(e.id)}
                        onChange={() => toggleMember(e.id)}
                        className="h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#241716]">{e.nama}</p>
                        <p className="truncate text-[11px] text-[#8a6f68]">
                          {e.penempatan}
                          {e.jabatan ? ` · ${e.jabatan}` : ""}
                          {e.noKaryawan ? ` · ${e.noKaryawan}` : ""}
                        </p>
                      </div>
                      {conflict ? (
                        <span className="shrink-0 rounded-full bg-[#fff4f4] px-2.5 py-1 text-[10px] font-semibold text-[#b94040]">
                          di grup: {conflict}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="h-10 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white transition hover:bg-[#a12228]"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
