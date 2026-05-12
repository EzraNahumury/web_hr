import Image from "next/image";

export type BonusSlipRow = {
  id: number;
  employeeId: number;
  name: string;
  role: string;
  division: string;
  department: string;
  unit: string | null;
  bank: string;
  accountNumber: string;
  bonusTypeLabel: string;
  amount: number;
  note: string | null;
};

type Props = {
  row: BonusSlipRow;
  periodLabel: string;
};

const OWNER_NAME = "Arya Rahadyan";
const HR_COORDINATOR_NAME = "Elnida Rahma Dian";
const OWNER_SIGNATURE_IMAGE = "/ttd/image-removebg-preview.png";
const HR_SIGNATURE_IMAGE = "/ttd/hr-ttd-removebg-preview.png";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_10px_minmax(0,1fr)] gap-x-3 text-[13px] text-[#3d3028] sm:grid-cols-[148px_12px_minmax(0,1fr)] sm:text-[14px]">
      <span className="font-medium text-[#6e5a4e]">{label}</span>
      <span className="text-[#8c776c]">:</span>
      <span className="min-w-0 font-semibold text-[#1f1712]">{value}</span>
    </div>
  );
}

function SignatureBlock({ title, name, image }: { title: string; name: string; image: string }) {
  return (
    <div>
      <p className="text-sm text-[#6c564a]">Mengetahui,</p>
      <p className="mt-1 text-[15px] font-medium text-[#2c211a]">{title}</p>
      <div className="relative mx-auto mt-6 h-20 w-40 sm:h-24 sm:w-44">
        <Image src={image} alt={`Tanda tangan ${name}`} fill className="object-contain mix-blend-multiply" />
      </div>
      <div className="mx-auto mt-1 h-px w-40 bg-[#2f231c]" />
      <p className="mt-3 text-[15px] font-semibold text-[#17100d]">{name}</p>
    </div>
  );
}

export default function BonusSlipSheet({ row, periodLabel }: Props) {
  return (
    <section className="mx-auto w-full max-w-[1080px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f6d5d]">{periodLabel}</p>
          <h2 className="mt-2 text-[clamp(1.75rem,2.8vw,2.35rem)] font-semibold text-[#241716]">Slip Bonus</h2>
          <p className="mt-1 text-sm text-[#7b665d]">Preview slip bonus berdasarkan data payroll bonus.</p>
        </div>
        <div className="rounded-full border border-[#e3d5a8] bg-[#fff7d6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c5b00]">
          {row.bonusTypeLabel}
        </div>
      </div>

      <div className="rounded-[36px] border border-[#e7dad1] bg-[linear-gradient(145deg,#fbf7f3_0%,#f4ebe4_55%,#f8f4f0_100%)] p-3 shadow-[0_28px_80px_rgba(84,50,33,0.12)] sm:p-5">
        <article className="relative overflow-hidden rounded-[28px] border border-[#d7cac0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff7f1_100%)] px-5 py-5 sm:px-8 sm:py-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,137,103,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(141,106,81,0.08),transparent_30%)]" />
          <div className="pointer-events-none absolute -right-10 top-18 hidden opacity-[0.07] lg:block">
            <Image src="/logo/slip-logo.png" alt="Watermark logo" width={320} height={220} className="h-auto w-[260px] object-contain" />
          </div>

          <div className="relative rounded-[22px] border border-[#2c211a] bg-white/90 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 lg:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2f231c] pb-4">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full border border-[#2f231c] bg-[#fff8f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f4b40] sm:text-xs">
                  Pribadi & Rahasia
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9a7f6f]">Dokumen Bonus</p>
                  <p className="mt-1 text-sm text-[#6a554a]">Slip pembayaran bonus internal untuk arsip dan distribusi karyawan.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[20px] border border-[#dccfc7] bg-[linear-gradient(180deg,#fffdf9_0%,#fff5ee_100%)] px-3 py-3 shadow-[0_14px_36px_rgba(113,74,52,0.1)] sm:px-4">
                <div className="relative h-14 w-20 overflow-hidden rounded-[14px] bg-black ring-1 ring-[#2f231c] sm:h-16 sm:w-24">
                  <Image src="/logo/slip-logo.png" alt="Logo Ayres" fill className="object-contain p-2" priority />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#9b7d6b]">Ayres</p>
                  <p className="mt-1 text-lg font-semibold text-[#201511]">Bonus</p>
                  <p className="text-xs text-[#6e594e]">Human Resources</p>
                </div>
              </div>
            </div>

            <div className="border-b border-[#2f231c] py-6 text-center sm:py-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#a38775]">Slip Bonus</p>
              <h3 className="mt-3 font-[family:var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-semibold uppercase tracking-[0.12em] text-[#18110d]">
                Slip Bonus
              </h3>
              <p className="mt-2 text-sm text-[#6b564b] sm:text-[15px]">Periode: {periodLabel}</p>
            </div>

            <div className="grid gap-4 py-5 lg:grid-cols-2 lg:gap-5">
              <div className="rounded-[22px] border border-[#eadfd7] bg-[linear-gradient(180deg,#fffdfa_0%,#fff7f2_100%)] px-4 py-4 shadow-[0_12px_30px_rgba(102,64,44,0.06)] sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9a7f6e]">Data Karyawan</p>
                <div className="mt-4 space-y-2.5">
                  <DetailItem label="Nama Karyawan" value={row.name.toUpperCase()} />
                  <DetailItem label="Jabatan / Divisi" value={`${row.role} / ${row.division}`} />
                  <DetailItem label="Departemen" value={row.department || "-"} />
                  <DetailItem label="Bank" value={(row.bank || "-").toUpperCase()} />
                  <DetailItem label="No Rekening" value={row.accountNumber || "-"} />
                </div>
              </div>

              <div className="rounded-[22px] border border-[#e5dfd4] bg-[linear-gradient(180deg,#fffefa_0%,#f8f4ef_100%)] px-4 py-4 shadow-[0_12px_30px_rgba(102,64,44,0.06)] sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9a7f6e]">Detail Bonus</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[#efe5de] bg-white/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b7f71]">Tipe Bonus</p>
                    <p className="mt-2 text-lg font-semibold text-[#1c1410]">{row.bonusTypeLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-[#efe5de] bg-white/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b7f71]">Periode</p>
                    <p className="mt-2 text-lg font-semibold text-[#1c1410]">{periodLabel}</p>
                  </div>
                  {row.note ? (
                    <div className="rounded-2xl border border-[#efe5de] bg-white/80 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b7f71]">Catatan</p>
                      <p className="mt-2 text-sm text-[#3d3028]">{row.note}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#2f231c] bg-[linear-gradient(90deg,#fff6ee_0%,#fffdf9_48%,#f7efe7_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9c7d6a]">Total Bonus Diterima</p>
                  <p className="mt-2 text-sm text-[#6d5649]">Nominal bonus dibayarkan terpisah dari gaji rutin sesuai periode di atas.</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.26em] text-[#7e6557]">Bonus Bersih</p>
                  <p className="mt-2 text-[clamp(2rem,3.8vw,3rem)] font-semibold tabular-nums text-[#17100c]">{formatCurrency(row.amount)}</p>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-8 border-t border-dashed border-[#d8c9bf] pt-8 text-center sm:grid-cols-2 sm:gap-14">
              <SignatureBlock title="Owner" name={OWNER_NAME} image={OWNER_SIGNATURE_IMAGE} />
              <SignatureBlock title="HR Coordinator" name={HR_COORDINATOR_NAME} image={HR_SIGNATURE_IMAGE} />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
