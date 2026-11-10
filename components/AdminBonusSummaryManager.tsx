"use client";

import { Fragment, useMemo, useState, useTransition } from "react";

import type { BonusSummarySheet, BonusSummaryRow } from "@/lib/bonus-summary";

type PeriodOption = { month: number; year: number; label: string };

function formatRupiah(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function formatInput(v: string) {
  const digits = v.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}
function parseInput(v: string) {
  const digits = v.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export default function AdminBonusSummaryManager({
  initialSheet,
  periodOptions,
}: {
  initialSheet: BonusSummarySheet;
  periodOptions: PeriodOption[];
}) {
  const [sheet, setSheet] = useState(initialSheet);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const period = { month: sheet.periodMonth, year: sheet.periodYear };
  const selectedPeriod = `${sheet.periodYear}-${String(sheet.periodMonth).padStart(2, "0")}`;

  const [ava, setAva] = useState(sheet.omzet.avaSportivo ? sheet.omzet.avaSportivo.toLocaleString("id-ID") : "");
  const [ayres, setAyres] = useState(sheet.omzet.ayres ? sheet.omzet.ayres.toLocaleString("id-ID") : "");
  const [gabungan, setGabungan] = useState(sheet.omzet.gabungan ? sheet.omzet.gabungan.toLocaleString("id-ID") : "");

  function flash(type: "success" | "error", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2500);
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/bonus-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: period.month, year: period.year, ...body }),
    });
    const data = (await res.json()) as { message?: string; sheet?: BonusSummarySheet };
    if (!res.ok) throw new Error(data.message ?? "Gagal.");
    if (data.sheet) setSheet(data.sheet);
    return data;
  }

  function changePeriod(value: string) {
    const [y, m] = value.split("-").map(Number);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/bonus-summary?month=${m}&year=${y}`);
        const data = (await res.json()) as BonusSummarySheet;
        setSheet(data);
        setAva(data.omzet.avaSportivo ? data.omzet.avaSportivo.toLocaleString("id-ID") : "");
        setAyres(data.omzet.ayres ? data.omzet.ayres.toLocaleString("id-ID") : "");
        setGabungan(data.omzet.gabungan ? data.omzet.gabungan.toLocaleString("id-ID") : "");
      } catch {
        flash("error", "Gagal memuat periode.");
      }
    });
  }

  function saveOmzet() {
    startTransition(async () => {
      try {
        await post({
          action: "set_omzet",
          omzet: { avaSportivo: parseInput(ava), ayres: parseInput(ayres), gabungan: parseInput(gabungan) },
        });
        flash("success", "Omzet tersimpan.");
      } catch (e) {
        flash("error", e instanceof Error ? e.message : "Gagal.");
      }
    });
  }

  function toggle(row: BonusSummaryRow, field: "team" | "company") {
    const value = field === "team" ? !row.teamApproved : !row.companyApproved;
    startTransition(async () => {
      try {
        await post({ action: "set_distribution", karyawanId: row.employeeId, field, value });
      } catch (e) {
        flash("error", e instanceof Error ? e.message : "Gagal.");
      }
    });
  }

  function toggleDivision(division: string, field: "team" | "company", value: boolean) {
    startTransition(async () => {
      try {
        await post({ action: "set_division_distribution", division, field, value });
        flash("success", `${field === "team" ? "Team" : "Company"} se-tim "${division}" diperbarui.`);
      } catch (e) {
        flash("error", e instanceof Error ? e.message : "Gagal.");
      }
    });
  }

  // Grup per divisi (tim).
  const grouped = useMemo(() => {
    const out: { division: string; rows: BonusSummaryRow[] }[] = [];
    let cur: string | null = null;
    for (const r of sheet.rows) {
      if (r.division !== cur) {
        out.push({ division: r.division, rows: [] });
        cur = r.division;
      }
      out[out.length - 1].rows.push(r);
    }
    return out;
  }, [sheet.rows]);

  const inputCls =
    "h-11 w-full rounded-2xl border border-[#e2cfc7] bg-white px-4 text-sm text-[#241716] outline-none focus:border-[#c97f5b]";

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed right-6 top-24 z-50 rounded-2xl px-4 py-3 text-sm shadow-lg ${
            toast.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[#ead7ce] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Periode</p>
            <p className="mt-1 text-xl font-semibold text-[#241716]">{sheet.periodLabel}</p>
            <p className="text-xs text-[#9e7467]">{sheet.rangeLabel}</p>
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => changePeriod(e.target.value)}
            disabled={isPending}
            className="h-11 rounded-2xl border border-[#e2cfc7] bg-white px-4 text-sm"
          >
            {periodOptions.map((p) => (
              <option key={`${p.year}-${p.month}`} value={`${p.year}-${String(p.month).padStart(2, "0")}`}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#6f5a54]">Omzet AVA Sportivo</span>
            <input value={ava} onChange={(e) => setAva(formatInput(e.target.value))} inputMode="numeric" className={`${inputCls} mt-1`} placeholder="0" />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-[#6f5a54]">Omzet Ayres</span>
            <input value={ayres} onChange={(e) => setAyres(formatInput(e.target.value))} inputMode="numeric" className={`${inputCls} mt-1`} placeholder="0" />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-[#6f5a54]">Omzet Gabungan</span>
            <input value={gabungan} onChange={(e) => setGabungan(formatInput(e.target.value))} inputMode="numeric" className={`${inputCls} mt-1`} placeholder="0" />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-[#9e7467]">
            Nominal bonus mengikuti rumus pembagian (menyusul). Saat ini kolom bonus = Rp 0.
          </p>
          <button
            type="button"
            onClick={saveOmzet}
            disabled={isPending}
            className="h-11 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Simpan Omzet"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#ead7ce] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.1em] text-[#9e7467]">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Telat</th>
                <th className="px-4 py-3">Masuk / Hari Kerja</th>
                <th className="px-4 py-3">Personal (syarat)</th>
                <th className="px-4 py-3 text-center">Team (HR)</th>
                <th className="px-4 py-3 text-center">Company (HR)</th>
                <th className="px-4 py-3 text-right">Bonus Personal</th>
                <th className="px-4 py-3 text-right">Bonus Team</th>
                <th className="px-4 py-3 text-right">Bonus Company</th>
              </tr>
            </thead>
            <tbody>
              {sheet.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#9e7467]">Belum ada karyawan.</td>
                </tr>
              ) : (
                grouped.map((g) => {
                  const allTeam = g.rows.every((r) => r.teamApproved);
                  const allCompany = g.rows.every((r) => r.companyApproved);
                  return (
                    <Fragment key={`grp-${g.division}`}>
                      <tr className="bg-[#eafafb] align-middle">
                        <td colSpan={5} className="px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-[#0d7f86]">
                          Tim: {g.division}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => toggleDivision(g.division, "team", !allTeam)} disabled={isPending}
                            className="rounded-full border border-[#0d7f86] px-2 py-1 text-[11px] font-semibold text-[#0d7f86] disabled:opacity-50">
                            {allTeam ? "Batal team" : "Centang team se-tim"}
                          </button>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => toggleDivision(g.division, "company", !allCompany)} disabled={isPending}
                            className="rounded-full border border-[#0d7f86] px-2 py-1 text-[11px] font-semibold text-[#0d7f86] disabled:opacity-50">
                            {allCompany ? "Batal company" : "Centang company se-tim"}
                          </button>
                        </td>
                        <td colSpan={3} />
                      </tr>
                      {g.rows.map((r) => (
                        <tr key={r.employeeId} className="border-b border-[#f1e5de]">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#241716]">{r.name}</div>
                            <div className="text-xs text-[#9e7a72]">{r.nip}</div>
                          </td>
                          <td className="px-4 py-3 tabular-nums">{r.lateCount}×</td>
                          <td className="px-4 py-3 tabular-nums">{r.presentDays} / {r.workDays}</td>
                          <td className="px-4 py-3">
                            {r.personalEligible ? (
                              <span className="rounded-full bg-[#def8eb] px-2.5 py-1 text-xs font-semibold text-[#17603b]">Layak cair</span>
                            ) : (
                              <span className="rounded-full bg-[#ffe4e4] px-2.5 py-1 text-xs font-semibold text-[#8b2626]">Tidak (telat {`>`}1 / tak penuh)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={r.teamApproved} onChange={() => toggle(r, "team")} disabled={isPending} className="h-4 w-4 accent-[#0d7f86]" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={r.companyApproved} onChange={() => toggle(r, "company")} disabled={isPending} className="h-4 w-4 accent-[#0d7f86]" />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(r.bonusPersonal)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(r.bonusTeam)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(r.bonusCompany)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
