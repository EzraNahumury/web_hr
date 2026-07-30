"use client";

import { useState } from "react";

function formatRp(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type Member = { name: string; amount: number };

// Sel nominal di tabel Pembagian Rekapan. Klik → popup rincian per karyawan.
export default function FinanceNominalCell({
  value,
  title,
  members,
  className,
  strong,
}: {
  value: number;
  title: string;
  members: Member[];
  className?: string;
  strong?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detail = members.filter((m) => m.amount !== 0).sort((a, b) => b.amount - a.amount);

  return (
    <td className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Klik untuk lihat rincian per karyawan"
        className={`w-full rounded px-1 py-0.5 text-right tabular-nums transition hover:bg-[#fbeee8] hover:underline ${
          strong ? "font-bold text-[#8b3a2a]" : "text-[#241716]"
        }`}
      >
        {formatRp(value)}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 bg-[#8b3a2a] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-0.5 text-xs text-white/80">Total: Rp {formatRp(value)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-lg leading-none text-white/80 hover:text-white"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {detail.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9e7467]">Tidak ada rincian.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {detail.map((m, i) => (
                      <tr key={i} className="border-b border-[#f0e5df] last:border-0">
                        <td className="py-2 pr-3 text-[#241716]">{m.name}</td>
                        <td className="py-2 text-right tabular-nums font-medium text-[#8b3a2a]">
                          Rp {formatRp(m.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </td>
  );
}
