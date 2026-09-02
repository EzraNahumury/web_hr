import type { FreelanceSlip } from "@/lib/payslip-freelance";

function formatRp(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export default function FreelancePayslipSheet({
  slip,
  periodLabel,
  rangeLabel,
}: {
  slip: FreelanceSlip;
  periodLabel: string;
  rangeLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[#ead7ce] bg-white shadow-[0_18px_40px_rgba(96,45,34,0.06)]">
      <div className="border-b border-[#f0e2dc] bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)] px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">Slip Gaji Freelance</p>
        <h2 className="mt-2 text-xl font-semibold text-[#241716]">{slip.name}</h2>
        <p className="mt-1 text-sm text-[#7b665d]">
          Periode {periodLabel}
          {rangeLabel ? ` · ${rangeLabel}` : ""}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.16em] text-[#9e7467]">
              <th className="px-6 py-3">Jenis Pekerjaan</th>
              <th className="px-6 py-3">Rincian</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {slip.items.map((it, i) => (
              <tr key={i} className="border-b border-[#f1e5de]">
                <td className="px-6 py-3 font-medium text-[#241716]">{it.jenis}</td>
                <td className="px-6 py-3 text-[#7b665d]">{it.detail}</td>
                <td className="px-6 py-3 text-right tabular-nums text-[#241716]">{formatRp(it.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#fef3e4]">
              <td colSpan={2} className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wide text-[#7c3c24]">
                Total Take Home Pay
              </td>
              <td className="px-6 py-4 text-right text-base font-bold tabular-nums text-[#8f1d22]">
                {formatRp(slip.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
