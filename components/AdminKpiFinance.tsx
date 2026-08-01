"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { KpiGroup } from "@/lib/kpi-rnd";
import type { FinanceEmployee, KpiFinanceInputValue, KpiFinanceOmzet } from "@/lib/kpi-finance";
import { computeKpiPerhitungan } from "@/lib/kpi-formula";

type Props = {
  month: number;
  year: number;
  periodLabel: string;
  hariKerja: number;
  employees: FinanceEmployee[];
  selectedEmployee: FinanceEmployee | null;
  template: KpiGroup[];
  inputs: Record<string, KpiFinanceInputValue>;
  omzet: KpiFinanceOmzet;
};

type RowState = {
  aktualData: string;
  hasilOverride: "terpenuhi" | "tidak" | null;
};

function digitsOnly(v: string) {
  return v.replace(/[^\d]/g, "");
}
function formatGrouped(v: string) {
  const d = digitsOnly(v);
  return d ? Number(d).toLocaleString("id-ID") : "";
}
function toInt(v: string) {
  const d = digitsOnly(v);
  return d ? Number(d) : 0;
}
function sanitizeDecimal(v: string) {
  let s = v.replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  return s;
}
function toNum(v: string) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function buildInitialState(
  template: KpiGroup[],
  inputs: Record<string, KpiFinanceInputValue>,
): Record<string, RowState> {
  const state: Record<string, RowState> = {};
  for (const g of template) {
    for (const item of g.items) {
      const saved = inputs[item.key];
      state[item.key] = { aktualData: saved?.aktualData ?? "", hasilOverride: saved?.hasilOverride ?? null };
    }
  }
  return state;
}

export default function AdminKpiFinance({
  month,
  year,
  periodLabel,
  hariKerja,
  employees,
  selectedEmployee,
  template,
  inputs,
  omzet,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const stateKey = `${selectedEmployee?.id ?? 0}-${month}-${year}`;
  const [rows, setRows] = useState<Record<string, RowState>>(() => buildInitialState(template, inputs));
  const [hariKerjaStr, setHariKerjaStr] = useState(String(hariKerja));
  const [omzetTargetStr, setOmzetTargetStr] = useState(omzet.target > 0 ? String(Math.round(omzet.target)) : "");
  const [omzetRealisasiStr, setOmzetRealisasiStr] = useState(omzet.realisasi > 0 ? String(Math.round(omzet.realisasi)) : "");
  const [loadedKey, setLoadedKey] = useState(stateKey);
  if (loadedKey !== stateKey) {
    setRows(buildInitialState(template, inputs));
    setHariKerjaStr(String(hariKerja));
    setOmzetTargetStr(omzet.target > 0 ? String(Math.round(omzet.target)) : "");
    setOmzetRealisasiStr(omzet.realisasi > 0 ? String(Math.round(omzet.realisasi)) : "");
    setLoadedKey(stateKey);
  }

  function setRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  const hariKerjaNum = Math.max(1, Math.round(toNum(hariKerjaStr)) || 0);
  const omzetTargetNum = toInt(omzetTargetStr);
  const omzetRealisasiNum = toInt(omzetRealisasiStr);

  const computed = useMemo(() => {
    let totalBobot = 0;
    let totalHasilBobot = 0;
    const perRow: Record<string, { perhitungan: number; hasilBobot: number; hasilEffective: "terpenuhi" | "tidak" }> = {};
    for (const g of template) {
      for (const item of g.items) {
        const st = rows[item.key];
        const aktual = st ? toNum(st.aktualData) : 0;
        const perhitungan =
          item.formula?.type === "omzet"
            ? omzetTargetNum > 0 ? (omzetRealisasiNum / omzetTargetNum) * 100 : 0
            : computeKpiPerhitungan(item.formula, aktual, hariKerjaNum);
        const hasilBobot = Math.min((perhitungan / 100) * item.bobot, item.bobot);
        const hasilAuto: "terpenuhi" | "tidak" = hasilBobot >= item.bobot - 1e-9 ? "terpenuhi" : "tidak";
        const hasilEffective = st?.hasilOverride ?? hasilAuto;
        perRow[item.key] = { perhitungan, hasilBobot, hasilEffective };
        totalBobot += item.bobot;
        totalHasilBobot += hasilBobot;
      }
    }
    return { totalBobot, totalHasilBobot, perRow };
  }, [rows, template, hariKerjaNum, omzetTargetNum, omzetRealisasiNum]);

  function handlePeriodChange(e: React.ChangeEvent<HTMLInputElement>) {
    const [y, m] = e.target.value.split("-").map(Number);
    const params = new URLSearchParams(searchParams.toString());
    if (m && y) {
      params.set("month", String(m));
      params.set("year", String(y));
    }
    setMessage(null);
    router.push(`/admin/kpi/finance?${params.toString()}`);
  }

  function handleEmployeeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("emp", e.target.value);
    params.set("month", String(month));
    params.set("year", String(year));
    setMessage(null);
    router.push(`/admin/kpi/finance?${params.toString()}`);
  }

  function handleSave() {
    if (!selectedEmployee) return;
    setMessage(null);
    const payloadRows = template.flatMap((g) =>
      g.items.map((item) => {
        const st = rows[item.key];
        const c = computed.perRow[item.key];
        return {
          key: item.key,
          aktualData: st?.aktualData ?? "",
          perhitungan: c ? c.perhitungan : 0,
          hasilOverride: st?.hasilOverride ?? null,
        };
      }),
    );
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/kpi/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: selectedEmployee.id,
            month,
            year,
            hariKerja: hariKerjaNum,
            placementKey: selectedEmployee.placementKey,
            omzetTarget: omzetTargetNum,
            omzetRealisasi: omzetRealisasiNum,
            rows: payloadRows,
          }),
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) {
          setMessage({ type: "error", text: data.message ?? "Gagal menyimpan." });
          return;
        }
        setMessage({ type: "success", text: data.message ?? "Tersimpan." });
        router.refresh();
      } catch {
        setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  const currentPeriodValue = `${year}-${String(month).padStart(2, "0")}`;

  const th = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#0f5c52] whitespace-nowrap border border-[#bfe4dd] bg-[#d6f2ec] text-center align-middle";
  const thHasil = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white whitespace-nowrap border border-[#0d9488] bg-[#0f766e] text-center align-middle";
  const td = "px-3 py-2 text-xs text-[#12332e] border border-[#dcefe9] align-top";
  const tdBorder = "px-3 py-2 text-xs text-[#12332e] border border-[#dcefe9] align-middle text-center";

  const placementLabel =
    selectedEmployee?.placementKey === "ayres" ? "AYRES" :
    selectedEmployee?.placementKey === "toko" ? "Toko" :
    (selectedEmployee?.penempatan || "-");

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#cdeae3] bg-[linear-gradient(180deg,#fbfffe_0%,#effbf8_100%)] p-6 shadow-[0_16px_48px_rgba(15,118,110,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#bfe4dd] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
              KPI Finance
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#0d2b27]">
              Penilaian KPI — {periodLabel}
            </h3>
            <p className="mt-1 text-sm text-[#5c837c]">
              Isi <span className="font-semibold">Aktual Data</span> tiap baris. Baris <span className="font-semibold">Pencapaian omzet</span> isi
              Realisasi &amp; Target → Perhitungan = Realisasi ÷ Target. Hasil Bobot = Bobot × Perhitungan (maks = Bobot).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[#cdeae3] bg-white px-3 text-sm text-[#0d2b27]">
              <span className="font-semibold text-[#0f766e]">Hari Kerja</span>
              <input
                value={hariKerjaStr}
                onChange={(e) => setHariKerjaStr(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="h-7 w-14 rounded-lg border border-[#cdeae3] bg-white px-2 text-center text-sm outline-none focus:border-[#0f766e]"
                placeholder="23"
              />
            </label>
            <input
              type="month"
              value={currentPeriodValue}
              onChange={handlePeriodChange}
              className="h-10 rounded-xl border border-[#cdeae3] bg-white px-3 text-sm text-[#0d2b27] outline-none focus:border-[#0f766e]"
            />
            {employees.length > 0 && selectedEmployee ? (
              <select
                value={String(selectedEmployee.id)}
                onChange={handleEmployeeChange}
                className="h-10 rounded-xl border border-[#cdeae3] bg-white px-3 text-sm font-medium text-[#0d2b27] outline-none focus:border-[#0f766e]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nama.toUpperCase()} — {emp.penempatan || "-"}
                  </option>
                ))}
              </select>
            ) : null}
            {selectedEmployee ? (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="h-10 rounded-xl bg-[#0f766e] px-5 text-sm font-semibold text-white hover:bg-[#0d655e] disabled:opacity-50"
              >
                {isPending ? "Menyimpan..." : "Simpan Penilaian"}
              </button>
            ) : null}
          </div>
        </div>

        {selectedEmployee ? (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#cdeae3] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Karyawan</p>
              <p className="mt-1 text-lg font-semibold uppercase text-[#0d2b27]">{selectedEmployee.nama}</p>
              <p className="text-xs text-[#5c837c]">{selectedEmployee.jabatan || "-"} · {selectedEmployee.departemen || "-"}</p>
            </div>
            <div className="rounded-2xl border border-[#cdeae3] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Penempatan</p>
              <p className="mt-1 text-lg font-semibold text-[#0d2b27]">{placementLabel}</p>
            </div>
            <div className="rounded-2xl border border-[#cdeae3] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Total Bobot</p>
              <p className="mt-1 text-lg font-semibold text-[#0d2b27]">{computed.totalBobot}%</p>
            </div>
            <div className="rounded-2xl border border-[#d1fae5] bg-[#ecfdf5] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#059669]">Skor KPI (Hasil Bobot)</p>
              <p className="mt-1 text-lg font-semibold text-[#047857]">{computed.totalHasilBobot.toFixed(2)}%</p>
            </div>
          </div>
        ) : null}

        {message ? (
          <p className={`mt-4 rounded-xl px-4 py-2.5 text-sm ${message.type === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {message.text}
          </p>
        ) : null}
      </section>

      {!selectedEmployee ? (
        <div className="rounded-[28px] border border-[#cdeae3] bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-base font-semibold text-[#0d2b27]">Belum ada karyawan Staff Finance</p>
          <p className="mt-2 text-sm text-[#5c837c]">
            Tidak ditemukan karyawan aktif dengan jabatan <span className="font-semibold">Staff</span> &amp; departemen{" "}
            <span className="font-semibold">Finance</span>. Set data karyawan di menu Data Karyawan.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-[#cdeae3] bg-white shadow-[0_8px_28px_rgba(15,118,110,0.06)]">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="border-collapse text-left" style={{ minWidth: "1600px" }}>
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className={th} rowSpan={2}>No</th>
                  <th className={th} rowSpan={2}>Tugas</th>
                  <th className={th} rowSpan={2}>KPI</th>
                  <th className={th} rowSpan={2}>Cara Ukur</th>
                  <th className={th} rowSpan={2}>Cara Perhitungan</th>
                  <th className={th} rowSpan={2}>Bobot Penilaian KPI</th>
                  <th className={th} rowSpan={2}>Total</th>
                  <th className={thHasil} colSpan={4}>Hasil — {periodLabel}</th>
                </tr>
                <tr>
                  <th className={thHasil}>Aktual Data</th>
                  <th className={thHasil}>Perhitungan</th>
                  <th className={thHasil}>Hasil Bobot</th>
                  <th className={thHasil}>Hasil</th>
                </tr>
              </thead>
              <tbody>
                {template.map((g) =>
                  g.items.map((item, idx) => {
                    const st = rows[item.key] ?? { aktualData: "", hasilOverride: null };
                    const c = computed.perRow[item.key] ?? { perhitungan: 0, hasilBobot: 0, hasilEffective: "tidak" as const };
                    const terpenuhi = c.hasilEffective === "terpenuhi";
                    const isOmzet = item.formula?.type === "omzet";
                    return (
                      <tr key={item.key} className="hover:bg-[#f4fdfb]">
                        {idx === 0 ? (
                          <>
                            <td className={`${tdBorder} bg-[#effbf8] font-semibold text-[#0f5c52]`} rowSpan={g.items.length}>{g.no}</td>
                            <td className={`${td} bg-[#effbf8] font-semibold text-[#0f5c52] min-w-[150px] max-w-[200px] whitespace-normal`} rowSpan={g.items.length}>{g.tugas}</td>
                          </>
                        ) : null}
                        <td className={`${td} min-w-[190px] max-w-[250px] whitespace-normal`}>{item.kpi}</td>
                        <td className={`${td} min-w-[160px] max-w-[220px] whitespace-normal text-[#4a6b65]`}>{item.caraUkur}</td>
                        <td className={`${td} min-w-[160px] max-w-[220px] whitespace-normal text-[#4a6b65]`}>{item.caraPerhitungan}</td>
                        <td className={`${tdBorder} font-semibold`}>{item.bobot}%</td>
                        {idx === 0 ? (
                          <td className={`${tdBorder} bg-[#effbf8] font-semibold text-[#0f5c52]`} rowSpan={g.items.length}>{g.total}%</td>
                        ) : null}
                        {/* Aktual Data */}
                        {isOmzet ? (
                          <td className={`${tdBorder} bg-[#fffbe8] p-1`}>
                            <div className="flex flex-col gap-1 min-w-[150px]">
                              <label className="flex items-center gap-1 text-[10px] text-[#7a6b30]">
                                <span className="w-14 text-left font-semibold">Realisasi</span>
                                <input
                                  value={formatGrouped(omzetRealisasiStr)}
                                  onChange={(e) => setOmzetRealisasiStr(digitsOnly(e.target.value))}
                                  inputMode="numeric"
                                  className="h-8 flex-1 rounded-lg border border-[#e6dca8] bg-white px-2 text-right text-[11px] outline-none focus:border-[#0f766e]"
                                  placeholder="0"
                                />
                              </label>
                              <label className="flex items-center gap-1 text-[10px] text-[#7a6b30]">
                                <span className="w-14 text-left font-semibold">Target</span>
                                <input
                                  value={formatGrouped(omzetTargetStr)}
                                  onChange={(e) => setOmzetTargetStr(digitsOnly(e.target.value))}
                                  inputMode="numeric"
                                  className="h-8 flex-1 rounded-lg border border-[#e6dca8] bg-white px-2 text-right text-[11px] outline-none focus:border-[#0f766e]"
                                  placeholder="0"
                                />
                              </label>
                            </div>
                          </td>
                        ) : (
                          <td className={`${tdBorder} bg-[#fffbe8] p-1`}>
                            <input
                              value={st.aktualData}
                              onChange={(e) => setRow(item.key, { aktualData: sanitizeDecimal(e.target.value) })}
                              inputMode="decimal"
                              className="h-9 w-24 rounded-lg border border-[#e6dca8] bg-white px-2 text-center text-xs outline-none focus:border-[#0f766e]"
                              placeholder="0"
                            />
                          </td>
                        )}
                        {/* Perhitungan */}
                        <td className={`${tdBorder} tabular-nums text-[#4a6b65]`}>{c.perhitungan.toFixed(2)}%</td>
                        {/* Hasil Bobot */}
                        <td className={`${tdBorder} tabular-nums font-medium`}>{c.hasilBobot.toFixed(2)}%</td>
                        {/* Hasil */}
                        <td className={`${tdBorder} p-1`}>
                          <select
                            value={st.hasilOverride ?? "auto"}
                            onChange={(e) =>
                              setRow(item.key, {
                                hasilOverride: e.target.value === "terpenuhi" ? "terpenuhi" : e.target.value === "tidak" ? "tidak" : null,
                              })
                            }
                            className={`h-9 w-full min-w-[130px] rounded-lg border px-2 text-xs font-semibold outline-none ${terpenuhi ? "border-emerald-300 bg-emerald-500 text-white" : "border-red-300 bg-red-500 text-white"}`}
                          >
                            <option value="auto" className="bg-white text-[#0d2b27]">Otomatis ({terpenuhi ? "Terpenuhi" : "Tidak terpenuhi"})</option>
                            <option value="terpenuhi" className="bg-white text-[#0d2b27]">Terpenuhi</option>
                            <option value="tidak" className="bg-white text-[#0d2b27]">Tidak terpenuhi</option>
                          </select>
                        </td>
                      </tr>
                    );
                  }),
                )}
                <tr className="bg-[#d6f2ec] font-semibold text-[#0f5c52]">
                  <td className={tdBorder} colSpan={5}>TOTAL</td>
                  <td className={tdBorder}>{computed.totalBobot}%</td>
                  <td className={tdBorder}>{computed.totalBobot}%</td>
                  <td className={tdBorder} colSpan={2}></td>
                  <td className={`${tdBorder} bg-[#d1fae5] text-[#047857]`}>{computed.totalHasilBobot.toFixed(2)}%</td>
                  <td className={tdBorder}></td>
                </tr>
              </tbody>
            </table>
          </div>
          {selectedEmployee.placementKey !== "ayres" && selectedEmployee.placementKey !== "toko" ? (
            <p className="border-t border-[#dcefe9] bg-[#f4fdfb] px-4 py-2 text-[11px] text-[#5c837c]">
              Catatan: penempatan "{selectedEmployee.penempatan || "-"}" belum punya target omzet default — silakan isi Target omzet manual.
            </p>
          ) : null}
          <p className="border-t border-[#dcefe9] bg-white px-4 py-2 text-[11px] text-[#5c837c]">
            Omzet ({placementLabel}): Realisasi {formatRupiah(omzetRealisasiNum)} ÷ Target {formatRupiah(omzetTargetNum)}. Nilai omzet berlaku untuk semua Staff Finance di penempatan yang sama pada periode ini.
          </p>
        </section>
      )}
    </div>
  );
}
