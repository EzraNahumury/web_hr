"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type {
  KpiGroup,
  KpiRndInputValue,
  RndEmployee,
} from "@/lib/kpi-rnd";
import { computeKpiPerhitungan } from "@/lib/kpi-formula";

type Props = {
  month: number;
  year: number;
  periodLabel: string;
  hariKerja: number;
  employees: RndEmployee[];
  selectedEmployee: RndEmployee | null;
  template: KpiGroup[];
  inputs: Record<string, KpiRndInputValue>;
};

type RowState = {
  aktualData: string; // angka; Perhitungan dihitung = aktualData / hariKerja
  hasilOverride: "terpenuhi" | "tidak" | null;
};

function sanitizeNumber(v: string) {
  let s = v.replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s;
}

function toNum(v: string) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtBobot(b: number) {
  return `${b}%`;
}

function buildInitialState(
  template: KpiGroup[],
  inputs: Record<string, KpiRndInputValue>,
): Record<string, RowState> {
  const state: Record<string, RowState> = {};
  for (const g of template) {
    for (const item of g.items) {
      const saved = inputs[item.key];
      state[item.key] = {
        aktualData: saved?.aktualData ?? "",
        hasilOverride: saved?.hasilOverride ?? null,
      };
    }
  }
  return state;
}

export default function AdminKpiRnd({
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

  // Kunci state ke employee + periode supaya reset saat berpindah (props berubah).
  const stateKey = `${selectedEmployee?.id ?? 0}-${month}-${year}`;
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    buildInitialState(template, inputs),
  );
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
    const perRow: Record<
      string,
      { perhitungan: number; hasilBobot: number; hasilEffective: "terpenuhi" | "tidak" }
    > = {};
    for (const g of template) {
      for (const item of g.items) {
        const st = rows[item.key];
        const aktual = st ? toNum(st.aktualData) : 0;
        // Perhitungan = rumus per baris (tidak dibatasi 100% — bisa mis. 104%).
        const perhitungan = computeKpiPerhitungan(item.formula, aktual, hariKerjaNum);
        // Hasil Bobot = bobot × perhitungan, dibatasi MAKSIMAL = bobot.
        const hasilBobot = Math.min((perhitungan / 100) * item.bobot, item.bobot);
        // Terpenuhi bila Hasil Bobot >= Bobot penilaian KPI.
        const hasilAuto: "terpenuhi" | "tidak" =
          hasilBobot >= item.bobot - 1e-9 ? "terpenuhi" : "tidak";
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
    router.push(`/admin/kpi/rnd?${params.toString()}`);
  }

  function handleEmployeeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("emp", e.target.value);
    params.set("month", String(month));
    params.set("year", String(year));
    setMessage(null);
    router.push(`/admin/kpi/rnd?${params.toString()}`);
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
        const res = await fetch("/api/admin/kpi/rnd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: selectedEmployee.id,
            month,
            year,
            hariKerja: hariKerjaNum,
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

  const th = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#5a2a4d] whitespace-nowrap border border-[#e8cdd9] bg-[#f7dbe6] text-center align-middle";
  const thHasil = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white whitespace-nowrap border border-[#c084a3] bg-[#a2537a] text-center align-middle";
  const td = "px-3 py-2 text-xs text-[#2a2333] border border-[#efe0e8] align-top";
  const tdBorder = "px-3 py-2 text-xs text-[#2a2333] border border-[#efe0e8] align-middle text-center";

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-[#ecd6e1] bg-[linear-gradient(180deg,#fffdfe_0%,#fdf3f8_100%)] p-6 shadow-[0_16px_48px_rgba(120,45,90,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#eecad9] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9c4570]">
              KPI RnD
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#2a1a24]">
              Penilaian KPI — {periodLabel}
            </h3>
            <p className="mt-1 text-sm text-[#8a6b7a]">
              Isi <span className="font-semibold">Aktual Data</span> tiap baris. Perhitungan mengikuti{" "}
              <span className="font-semibold">rumus tiap baris</span> (mis. absensi ÷ Hari Kerja, keterlambatan (5−x)/5,
              briefing ÷ 25, pelanggaran 0=100%); Hasil Bobot = <span className="font-semibold">Bobot × Perhitungan</span>{" "}
              (maks = Bobot); Hasil = Terpenuhi bila Hasil Bobot ≥ Bobot.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[#ecd6e1] bg-white px-3 text-sm text-[#2a1a24]">
              <span className="font-semibold text-[#9c4570]">Hari Kerja</span>
              <input
                value={hariKerjaStr}
                onChange={(e) => setHariKerjaStr(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="h-7 w-14 rounded-lg border border-[#ecd6e1] bg-white px-2 text-center text-sm outline-none focus:border-[#a2537a]"
                placeholder="23"
              />
            </label>
            <input
              type="month"
              value={currentPeriodValue}
              onChange={handlePeriodChange}
              className="h-10 rounded-xl border border-[#ecd6e1] bg-white px-3 text-sm text-[#2a1a24] outline-none focus:border-[#a2537a]"
            />
            {employees.length > 0 && selectedEmployee ? (
              <select
                value={String(selectedEmployee.id)}
                onChange={handleEmployeeChange}
                className="h-10 rounded-xl border border-[#ecd6e1] bg-white px-3 text-sm font-medium text-[#2a1a24] outline-none focus:border-[#a2537a]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nama.toUpperCase()} — {emp.role === "spv" ? "SPV RnD" : "Staff RnD"}
                  </option>
                ))}
              </select>
            ) : null}
            {selectedEmployee ? (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="h-10 rounded-xl bg-[#a2537a] px-5 text-sm font-semibold text-white hover:bg-[#8c4568] disabled:opacity-50"
              >
                {isPending ? "Menyimpan..." : "Simpan Penilaian"}
              </button>
            ) : null}
          </div>
        </div>

        {selectedEmployee ? (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#ecd6e1] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9c4570]">Karyawan</p>
              <p className="mt-1 text-lg font-semibold uppercase text-[#2a1a24]">{selectedEmployee.nama}</p>
              <p className="text-xs text-[#8a6b7a]">
                {selectedEmployee.jabatan || "-"} · {selectedEmployee.divisi || "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#ecd6e1] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9c4570]">Template</p>
              <p className="mt-1 text-lg font-semibold text-[#2a1a24]">
                {selectedEmployee.role === "spv" ? "SPV RnD" : "Staff RnD"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#ecd6e1] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9c4570]">Total Bobot</p>
              <p className="mt-1 text-lg font-semibold text-[#2a1a24]">{computed.totalBobot}%</p>
            </div>
            <div className="rounded-2xl border border-[#e0f0e4] bg-[#f0fdf4] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#3f9d5f]">Skor KPI (Hasil Bobot)</p>
              <p className="mt-1 text-lg font-semibold text-[#16794a]">{computed.totalHasilBobot.toFixed(2)}%</p>
            </div>
          </div>
        ) : null}

        {message ? (
          <p
            className={`mt-4 rounded-xl px-4 py-2.5 text-sm ${
              message.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </section>

      {/* Empty state */}
      {!selectedEmployee ? (
        <div className="rounded-[28px] border border-[#ecd6e1] bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-base font-semibold text-[#2a1a24]">Belum ada karyawan RnD</p>
          <p className="mt-2 text-sm text-[#8a6b7a]">
            Tidak ditemukan karyawan aktif dengan divisi <span className="font-semibold">RnD</span>.
            Set divisi/sub-divisi karyawan ke RnD di menu Data Karyawan agar muncul di sini.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-[#ecd6e1] bg-white shadow-[0_8px_28px_rgba(120,45,90,0.06)]">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="border-collapse text-left" style={{ minWidth: "1500px" }}>
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
                    const c = computed.perRow[item.key] ?? {
                      perhitungan: 0,
                      hasilBobot: 0,
                      hasilEffective: "tidak" as const,
                    };
                    const terpenuhi = c.hasilEffective === "terpenuhi";
                    return (
                      <tr key={item.key} className="hover:bg-[#fdf6fa]">
                        {idx === 0 ? (
                          <>
                            <td className={`${tdBorder} bg-[#fdf3f8] font-semibold text-[#5a2a4d]`} rowSpan={g.items.length}>
                              {g.no}
                            </td>
                            <td className={`${td} bg-[#fdf3f8] font-semibold text-[#5a2a4d] min-w-[150px] max-w-[200px] whitespace-normal`} rowSpan={g.items.length}>
                              {g.tugas}
                            </td>
                          </>
                        ) : null}
                        <td className={`${td} min-w-[180px] max-w-[240px] whitespace-normal`}>{item.kpi}</td>
                        <td className={`${td} min-w-[160px] max-w-[220px] whitespace-normal text-[#5b4a55]`}>{item.caraUkur}</td>
                        <td className={`${td} min-w-[160px] max-w-[220px] whitespace-normal text-[#5b4a55]`}>{item.caraPerhitungan}</td>
                        <td className={`${tdBorder} font-semibold`}>{fmtBobot(item.bobot)}</td>
                        {idx === 0 ? (
                          <td className={`${tdBorder} bg-[#fdf3f8] font-semibold text-[#5a2a4d]`} rowSpan={g.items.length}>
                            {g.total}%
                          </td>
                        ) : null}
                        {/* Aktual Data (input angka) */}
                        <td className={`${tdBorder} bg-[#fffbe8] p-1`}>
                          <input
                            value={st.aktualData}
                            onChange={(e) => setRow(item.key, { aktualData: sanitizeNumber(e.target.value) })}
                            inputMode="decimal"
                            className="h-9 w-24 rounded-lg border border-[#e6dca8] bg-white px-2 text-center text-xs outline-none focus:border-[#a2537a]"
                            placeholder="0"
                          />
                        </td>
                        {/* Perhitungan (otomatis, read-only) */}
                        <td className={`${tdBorder} tabular-nums text-[#5b4a55]`}>{c.perhitungan.toFixed(2)}%</td>
                        {/* Hasil Bobot (otomatis) */}
                        <td className={`${tdBorder} tabular-nums font-medium`}>{c.hasilBobot.toFixed(2)}%</td>
                        {/* Hasil (otomatis + bisa diubah) */}
                        <td className={`${tdBorder} p-1`}>
                          <select
                            value={st.hasilOverride ?? "auto"}
                            onChange={(e) =>
                              setRow(item.key, {
                                hasilOverride:
                                  e.target.value === "terpenuhi"
                                    ? "terpenuhi"
                                    : e.target.value === "tidak"
                                      ? "tidak"
                                      : null,
                              })
                            }
                            className={`h-9 w-full min-w-[130px] rounded-lg border px-2 text-xs font-semibold outline-none ${
                              terpenuhi
                                ? "border-emerald-300 bg-emerald-500 text-white"
                                : "border-red-300 bg-red-500 text-white"
                            }`}
                          >
                            <option value="auto" className="bg-white text-[#2a1a24]">
                              Otomatis ({terpenuhi ? "Terpenuhi" : "Tidak terpenuhi"})
                            </option>
                            <option value="terpenuhi" className="bg-white text-[#2a1a24]">Terpenuhi</option>
                            <option value="tidak" className="bg-white text-[#2a1a24]">Tidak terpenuhi</option>
                          </select>
                        </td>
                      </tr>
                    );
                  }),
                )}
                {/* Footer total */}
                <tr className="bg-[#f7dbe6] font-semibold text-[#5a2a4d]">
                  <td className={tdBorder} colSpan={5}>TOTAL</td>
                  <td className={tdBorder}>{computed.totalBobot}%</td>
                  <td className={tdBorder}>{computed.totalBobot}%</td>
                  <td className={tdBorder} colSpan={2}></td>
                  <td className={`${tdBorder} bg-[#dcfce7] text-[#16794a]`}>{computed.totalHasilBobot.toFixed(2)}%</td>
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
