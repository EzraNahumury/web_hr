"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { KpiGroup } from "@/lib/kpi-rnd";
import { CS_TYPE_LABEL, type KpiSalesRetailInputValue, type SalesRetailEmployee } from "@/lib/kpi-sales-retail";
import { computeKpiPerhitungan } from "@/lib/kpi-formula";

type Props = {
  month: number;
  year: number;
  periodLabel: string;
  hariKerja: number;
  employees: SalesRetailEmployee[];
  selectedEmployee: SalesRetailEmployee | null;
  template: KpiGroup[];
  inputs: Record<string, KpiSalesRetailInputValue>;
};

type RowState = { aktualData: string; hasilOverride: "terpenuhi" | "tidak" | null };

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

// Label kelompok KPI: Purchase (sub divisi) atau tipe CS.
function kindLabel(emp: SalesRetailEmployee): string {
  if ((emp.subDivisi ?? "").trim().toLowerCase() === "purchase") return "Purchase";
  return emp.csType ? CS_TYPE_LABEL[emp.csType] : "Tipe CS belum diset";
}

function buildInitialState(template: KpiGroup[], inputs: Record<string, KpiSalesRetailInputValue>) {
  const state: Record<string, RowState> = {};
  for (const g of template) {
    for (const item of g.items) {
      const saved = inputs[item.key];
      state[item.key] = { aktualData: saved?.aktualData ?? "", hasilOverride: saved?.hasilOverride ?? null };
    }
  }
  return state;
}

export default function AdminKpiSalesRetail({
  month,
  year,
  periodLabel,
  hariKerja,
  employees,
  selectedEmployee,
  template,
  inputs,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const stateKey = `${selectedEmployee?.id ?? 0}-${month}-${year}`;
  const [rows, setRows] = useState<Record<string, RowState>>(() => buildInitialState(template, inputs));
  const [hariKerjaStr, setHariKerjaStr] = useState(String(hariKerja));
  const [loadedKey, setLoadedKey] = useState(stateKey);
  if (loadedKey !== stateKey) {
    setRows(buildInitialState(template, inputs));
    setHariKerjaStr(String(hariKerja));
    setLoadedKey(stateKey);
  }

  function setRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  const hariKerjaNum = Math.max(1, Math.round(toNum(hariKerjaStr)) || 0);

  const computed = useMemo(() => {
    let totalBobot = 0;
    let totalHasilBobot = 0;
    const perRow: Record<string, { perhitungan: number; hasilBobot: number; hasilEffective: "terpenuhi" | "tidak" }> = {};
    for (const g of template) {
      for (const item of g.items) {
        const st = rows[item.key];
        const aktual = st ? toNum(st.aktualData) : 0;
        const perhitungan = computeKpiPerhitungan(item.formula, aktual, hariKerjaNum);
        const hasilBobot = Math.min((perhitungan / 100) * item.bobot, item.bobot);
        const hasilAuto: "terpenuhi" | "tidak" = hasilBobot >= item.bobot - 1e-9 ? "terpenuhi" : "tidak";
        const hasilEffective = st?.hasilOverride ?? hasilAuto;
        perRow[item.key] = { perhitungan, hasilBobot, hasilEffective };
        totalBobot += item.bobot;
        totalHasilBobot += hasilBobot;
      }
    }
    return { totalBobot, totalHasilBobot, perRow };
  }, [rows, template, hariKerjaNum]);

  function handlePeriodChange(e: React.ChangeEvent<HTMLInputElement>) {
    const [y, m] = e.target.value.split("-").map(Number);
    const params = new URLSearchParams(searchParams.toString());
    if (m && y) {
      params.set("month", String(m));
      params.set("year", String(y));
    }
    setMessage(null);
    router.push(`/admin/kpi/sales-retail?${params.toString()}`);
  }

  function handleEmployeeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("emp", e.target.value);
    params.set("month", String(month));
    params.set("year", String(year));
    setMessage(null);
    router.push(`/admin/kpi/sales-retail?${params.toString()}`);
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
        const res = await fetch("/api/admin/kpi/sales-retail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: selectedEmployee.id, month, year, hariKerja: hariKerjaNum, rows: payloadRows }),
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

  const th = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b3a12] whitespace-nowrap border border-[#f0d9bf] bg-[#fbe8d3] text-center align-middle";
  const thHasil = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white whitespace-nowrap border border-[#c2762e] bg-[#b15a1a] text-center align-middle";
  const td = "px-3 py-2 text-xs text-[#3a2513] border border-[#f2e2d0] align-top";
  const tdBorder = "px-3 py-2 text-xs text-[#3a2513] border border-[#f2e2d0] align-middle text-center";

  const isPurchase = (selectedEmployee?.subDivisi ?? "").trim().toLowerCase() === "purchase";
  const csLabel = selectedEmployee ? kindLabel(selectedEmployee) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#f0dcc4] bg-[linear-gradient(180deg,#fffdfb_0%,#fdf3e8_100%)] p-6 shadow-[0_16px_48px_rgba(177,90,26,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#f0d9bf] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b15a1a]">
              KPI Sales & Retail
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#3a2513]">
              Penilaian KPI — {periodLabel}
            </h3>
            <p className="mt-1 text-sm text-[#8a6a4a]">
              Customer Service. Isi <span className="font-semibold">Aktual Data</span> tiap baris; Perhitungan mengikuti rumus per baris
              (absensi ÷ Hari Kerja, "0-1" = rasio, "0-100" penilaian, "0-∞" jumlah = 0 berarti 100%, omzet ÷ target).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[#f0dcc4] bg-white px-3 text-sm text-[#3a2513]">
              <span className="font-semibold text-[#b15a1a]">Hari Kerja</span>
              <input
                value={hariKerjaStr}
                onChange={(e) => setHariKerjaStr(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="h-7 w-14 rounded-lg border border-[#f0dcc4] bg-white px-2 text-center text-sm outline-none focus:border-[#b15a1a]"
                placeholder="23"
              />
            </label>
            <input
              type="month"
              value={currentPeriodValue}
              onChange={handlePeriodChange}
              className="h-10 rounded-xl border border-[#f0dcc4] bg-white px-3 text-sm text-[#3a2513] outline-none focus:border-[#b15a1a]"
            />
            {employees.length > 0 && selectedEmployee ? (
              <select
                value={String(selectedEmployee.id)}
                onChange={handleEmployeeChange}
                className="h-10 rounded-xl border border-[#f0dcc4] bg-white px-3 text-sm font-medium text-[#3a2513] outline-none focus:border-[#b15a1a]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nama.toUpperCase()} — {kindLabel(emp)}
                  </option>
                ))}
              </select>
            ) : null}
            {selectedEmployee ? (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="h-10 rounded-xl bg-[#b15a1a] px-5 text-sm font-semibold text-white hover:bg-[#984c13] disabled:opacity-50"
              >
                {isPending ? "Menyimpan..." : "Simpan Penilaian"}
              </button>
            ) : null}
          </div>
        </div>

        {selectedEmployee ? (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#f0dcc4] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#b15a1a]">Karyawan</p>
              <p className="mt-1 text-lg font-semibold uppercase text-[#3a2513]">{selectedEmployee.nama}</p>
              <p className="text-xs text-[#8a6a4a]">{selectedEmployee.jabatan || "-"} · {selectedEmployee.penempatan || "-"}</p>
            </div>
            <div className="rounded-2xl border border-[#f0dcc4] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#b15a1a]">{isPurchase ? "Sub Divisi" : "Tipe CS"}</p>
              <p className="mt-1 text-lg font-semibold text-[#3a2513]">{isPurchase ? "Purchase" : (selectedEmployee?.csType ? csLabel : "Belum diset (default CS Selling)")}</p>
            </div>
            <div className="rounded-2xl border border-[#f0dcc4] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#b15a1a]">Total Bobot</p>
              <p className="mt-1 text-lg font-semibold text-[#3a2513]">{computed.totalBobot}%</p>
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
        <div className="rounded-[28px] border border-[#f0dcc4] bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-base font-semibold text-[#3a2513]">Belum ada karyawan Customer Service / Purchase</p>
          <p className="mt-2 text-sm text-[#8a6a4a]">
            Tidak ditemukan karyawan aktif dengan sub divisi <span className="font-semibold">Customer Service</span> atau{" "}
            <span className="font-semibold">Purchase</span>. Set sub divisi (dan tipe CS untuk Customer Service) di menu Data Karyawan.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-[#f0dcc4] bg-white shadow-[0_8px_28px_rgba(177,90,26,0.06)]">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="border-collapse text-left" style={{ minWidth: "1600px" }}>
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className={th} rowSpan={2}>No</th>
                  <th className={th} rowSpan={2}>Tugas</th>
                  <th className={th} rowSpan={2}>KPI</th>
                  <th className={th} rowSpan={2}>Cara Ukur</th>
                  <th className={th} rowSpan={2}>Cara Pengisian</th>
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
                    return (
                      <tr key={item.key} className="hover:bg-[#fdf6ee]">
                        {idx === 0 ? (
                          <>
                            <td className={`${tdBorder} bg-[#fdf3e8] font-semibold text-[#6b3a12]`} rowSpan={g.items.length}>{g.no}</td>
                            <td className={`${td} bg-[#fdf3e8] font-semibold text-[#6b3a12] min-w-[150px] max-w-[210px] whitespace-normal`} rowSpan={g.items.length}>{g.tugas}</td>
                          </>
                        ) : null}
                        <td className={`${td} min-w-[200px] max-w-[260px] whitespace-normal`}>{item.kpi}</td>
                        <td className={`${td} min-w-[170px] max-w-[230px] whitespace-normal text-[#6a4e35]`}>{item.caraUkur}</td>
                        <td className={`${td} min-w-[170px] max-w-[230px] whitespace-normal text-[#6a4e35]`}>{item.caraPerhitungan}</td>
                        <td className={`${tdBorder} font-semibold`}>{item.bobot}%</td>
                        {idx === 0 ? (
                          <td className={`${tdBorder} bg-[#fdf3e8] font-semibold text-[#6b3a12]`} rowSpan={g.items.length}>{g.total}%</td>
                        ) : null}
                        <td className={`${tdBorder} bg-[#fffbe8] p-1`}>
                          <input
                            value={st.aktualData}
                            onChange={(e) => setRow(item.key, { aktualData: sanitizeDecimal(e.target.value) })}
                            inputMode="decimal"
                            className="h-9 w-28 rounded-lg border border-[#e6dca8] bg-white px-2 text-center text-xs outline-none focus:border-[#b15a1a]"
                            placeholder="0"
                          />
                        </td>
                        <td className={`${tdBorder} tabular-nums text-[#6a4e35]`}>{c.perhitungan.toFixed(2)}%</td>
                        <td className={`${tdBorder} tabular-nums font-medium`}>{c.hasilBobot.toFixed(2)}%</td>
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
                            <option value="auto" className="bg-white text-[#3a2513]">Otomatis ({terpenuhi ? "Terpenuhi" : "Tidak terpenuhi"})</option>
                            <option value="terpenuhi" className="bg-white text-[#3a2513]">Terpenuhi</option>
                            <option value="tidak" className="bg-white text-[#3a2513]">Tidak terpenuhi</option>
                          </select>
                        </td>
                      </tr>
                    );
                  }),
                )}
                <tr className="bg-[#fbe8d3] font-semibold text-[#6b3a12]">
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
        </section>
      )}
    </div>
  );
}
