"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Entry = {
  unit: string;
  nominal: string;
  catatan: string;
};

type Props = {
  month: number;
  year: number;
  units: string[];
  initial: Record<string, { nominal: number; catatan: string | null }>;
  employeesByUnit: Record<string, string[]>;
};

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatNumericInput(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

function parseNumber(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits) : 0;
}

export default function FinanceLemburCustom({ month, year, units, initial, employeesByUnit }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(() =>
    units.map((unit) => ({
      unit,
      nominal: initial[unit]?.nominal ? formatNumericInput(String(initial[unit].nominal)) : "",
      catatan: initial[unit]?.catatan ?? "",
    })),
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setEntries(
      units.map((unit) => ({
        unit,
        nominal: initial[unit]?.nominal ? formatNumericInput(String(initial[unit].nominal)) : "",
        catatan: initial[unit]?.catatan ?? "",
      })),
    );
  }, [units, initial]);

  const total = useMemo(
    () => entries.reduce((sum, entry) => sum + parseNumber(entry.nominal), 0),
    [entries],
  );

  function updateEntry(unit: string, field: "nominal" | "catatan", value: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.unit === unit
          ? {
              ...entry,
              [field]: field === "nominal" ? formatNumericInput(value) : value,
            }
          : entry,
      ),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const payload = {
      month,
      year,
      entries: entries.map((entry) => ({
        unit: entry.unit,
        nominal: parseNumber(entry.nominal),
        catatan: entry.catatan.trim() || null,
      })),
    };
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/finance/lembur", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message || "Gagal menyimpan lembur custom.");
        setMessage({ type: "success", text: result.message || "Lembur custom berhasil disimpan." });
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan lembur custom.",
        });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-[#ead7ce] bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9e7467]">
            Tambahan Lembur (Custom Finance)
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#7a3828]">
            Input Lembur Custom per Unit
          </h3>
          <p className="mt-1 text-xs text-[#9e7467]">
            Khusus kasus seperti lemburan Pipin (JNE) yang tidak ikut hitungan absensi otomatis. Nilai ini ditampilkan di
            tabel pencairan gaji &amp; total per unit.
          </p>
        </div>
        <div className="rounded-2xl bg-[#fff5ee] px-4 py-2 text-sm text-[#7a3828]">
          Total: <span className="font-semibold">Rp {total.toLocaleString("id-ID")}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.unit} className="rounded-2xl border border-[#ead7ce] bg-[#fffaf6] p-4">
            <p className="text-sm font-semibold text-[#7a3828]">{entry.unit}</p>
            <div className="mt-3 space-y-2">
              <input
                value={entry.nominal}
                onChange={(event) => updateEntry(entry.unit, "nominal", event.target.value)}
                inputMode="numeric"
                placeholder="Nominal lembur"
                className="h-11 w-full rounded-xl border border-[#e0ccc5] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#a16f63]"
              />
              <select
                value={entry.catatan}
                onChange={(event) => updateEntry(entry.unit, "catatan", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#e0ccc5] bg-white px-3 text-sm text-[#241716] outline-none focus:border-[#a16f63]"
              >
                <option value="">Pilih karyawan (opsional)</option>
                {(employeesByUnit[entry.unit] ?? []).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-[#def8eb] text-[#17603b]"
              : "bg-[#ffe4e4] text-[#8b2626]"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#7a3828] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Menyimpan..." : "Simpan Lembur Custom"}
        </button>
      </div>
    </form>
  );
}
