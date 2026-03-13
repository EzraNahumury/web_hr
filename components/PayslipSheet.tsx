import Image from "next/image";

import PayslipPdfExportButton, { type PayslipPdfPayload } from "@/components/PayslipPdfExportButton";
import type { AdminPayrollSummarySheetRow } from "@/lib/payroll-summary";

type PayslipSheetProps = {
  row: AdminPayrollSummarySheetRow;
  periodLabel: string;
  rangeLabel: string;
};

type DetailItemProps = {
  label: string;
  value: string;
};

type MoneyItemProps = {
  label: string;
  value: number;
};

type PrintPairItemProps = {
  label: string;
  value: string;
};

type PrintLineItemProps = {
  label: string;
  value: number;
};

const OWNER_NAME = "Arya Rahadyan";
const HR_COORDINATOR_NAME = "Elnida Rahma Dian";
const SIGNATURE_IMAGE = "/ttd/images.png";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="grid grid-cols-[120px_10px_minmax(0,1fr)] gap-x-3 text-[13px] text-[#3d3028] sm:grid-cols-[148px_12px_minmax(0,1fr)] sm:text-[14px]">
      <span className="font-medium text-[#6e5a4e]">{label}</span>
      <span className="text-[#8c776c]">:</span>
      <span className="min-w-0 font-semibold text-[#1f1712]">{value}</span>
    </div>
  );
}

function MoneyItem({ label, value }: MoneyItemProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-[#e9ded7] py-2 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-[14px] text-[#2f241f]">{label}</span>
      <span className="text-right text-[14px] font-semibold tabular-nums text-[#16110d]">{formatCurrency(value)}</span>
    </div>
  );
}

function SignatureBlock({ title, name }: { title: string; name: string }) {
  return (
    <div>
      <p className="text-sm text-[#6c564a]">Mengetahui,</p>
      <p className="mt-1 text-[15px] font-medium text-[#2c211a]">{title}</p>
      <div className="relative mx-auto mt-6 h-20 w-40 sm:h-24 sm:w-44">
        <Image
          src={SIGNATURE_IMAGE}
          alt={`Tanda tangan ${name}`}
          fill
          className="object-contain mix-blend-multiply"
        />
      </div>
      <div className="mx-auto mt-1 h-px w-40 bg-[#2f231c]" />
      <p className="mt-3 text-[15px] font-semibold text-[#17100d]">{name}</p>
    </div>
  );
}

function PrintPairItem({ label, value }: PrintPairItemProps) {
  return (
    <div className="payslip-pdf-pair">
      <span className="payslip-pdf-pair-label">{label}</span>
      <span className="payslip-pdf-pair-separator">:</span>
      <span className="payslip-pdf-pair-value">{value}</span>
    </div>
  );
}

function PrintLineItem({ label, value }: PrintLineItemProps) {
  return (
    <div className="payslip-pdf-line">
      <span className="payslip-pdf-line-label">{label}</span>
      <span className="payslip-pdf-line-value">{formatCurrency(value)}</span>
    </div>
  );
}

function PrintSignatureBlock({ title, name }: { title: string; name: string }) {
  return (
    <div className="payslip-pdf-signature-block">
      <p className="payslip-pdf-signature-caption">Mengetahui,</p>
      <p className="payslip-pdf-signature-title">{title}</p>
      <div className="payslip-pdf-signature-image">
        <Image src={SIGNATURE_IMAGE} alt={`Tanda tangan ${name}`} fill className="object-contain mix-blend-multiply" />
      </div>
      <div className="payslip-pdf-signature-line" />
      <p className="payslip-pdf-signature-name">{name}</p>
    </div>
  );
}

export default function PayslipSheet({ row, periodLabel, rangeLabel }: PayslipSheetProps) {
  const slipTypeLabel = row.payrollType === "sales" ? "Slip Gaji Sales" : "Slip Gaji Karyawan";
  const tunjanganLainLain = row.mealAllowance + row.bpjs + row.omzetBonus + row.diligenceAllowance + row.subsidy;
  const totalPinjaman = row.companyLoan + row.personalLoan;
  const exportFileName = `${slipTypeLabel}-${row.name}-${periodLabel}`.replace(/[\\/:*?"<>|]+/g, "-");

  const earningItems =
    row.payrollType === "sales"
      ? [
          { label: "Gaji Pokok", value: row.totalBaseSalary },
          { label: "Tunjangan Jabatan", value: row.positionAllowance },
          { label: "Tunjangan Lain-Lain", value: tunjanganLainLain },
          { label: "Transport", value: row.transportAllowance },
          { label: "Insentif", value: row.incentive },
        ]
      : [
          { label: "Gaji Pokok", value: row.totalBaseSalary },
          { label: "Tunjangan Jabatan", value: row.positionAllowance },
          { label: "Tunjangan Lain-Lain", value: tunjanganLainLain },
          { label: "Bonus Performa", value: row.performanceBonus },
          { label: "Lembur", value: row.overtimeBonus },
        ];

  const deductionItems = [
    { label: "Keterlambatan", value: row.lateDeduction },
    { label: "Setengah Hari", value: row.halfDayDeduction },
    { label: "Uang Kerajinan", value: row.diligenceCut },
    { label: "Pinjaman", value: totalPinjaman },
    { label: "Kontrak", value: row.contractDeduction },
  ];

  const pdfData: PayslipPdfPayload = {
    rangeLabel,
    employeeName: row.name,
    role: row.role,
    division: row.division,
    bank: row.bank || "-",
    accountNumber: row.accountNumber || "-",
    presentDays: row.presentDays,
    overtimeHours: row.overtimeHours,
    lateCount: row.lateCount,
    halfDayCount: row.halfDayCount,
    earnings: earningItems,
    deductions: deductionItems,
    netIncome: row.netIncome,
  };

  return (
    <section className="payslip-print-root mx-auto w-full max-w-[1080px] space-y-5">
      <div className="payslip-print-toolbar flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f6d5d]">{periodLabel}</p>
          <h2 className="mt-2 text-[clamp(1.75rem,2.8vw,2.35rem)] font-semibold text-[#241716]">{slipTypeLabel}</h2>
          <p className="mt-1 text-sm text-[#7b665d]">Preview slip formal berdasarkan hasil summary payroll.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${row.payrollType === "sales" ? "border-[#c8d8ca] bg-[#eef6ef] text-[#4b6d51]" : "border-[#ead7ce] bg-[#fff6f1] text-[#8a5d52]"}`}>
            {row.payrollType === "sales" ? "Sales" : "Non Sales"}
          </div>
          <PayslipPdfExportButton fileName={exportFileName} pdfData={pdfData} />
        </div>
      </div>

      <div className="payslip-screen-preview rounded-[36px] border border-[#e7dad1] bg-[linear-gradient(145deg,#fbf7f3_0%,#f4ebe4_55%,#f8f4f0_100%)] p-3 shadow-[0_28px_80px_rgba(84,50,33,0.12)] sm:p-5">
        <article className="relative overflow-hidden rounded-[28px] border border-[#d7cac0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff7f1_100%)] px-5 py-5 sm:px-8 sm:py-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,137,103,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(141,106,81,0.08),transparent_30%)]" />
          <div className="pointer-events-none absolute -right-10 top-18 hidden opacity-[0.07] lg:block">
            <Image src="/logo/new logo.png" alt="Watermark logo" width={320} height={220} className="h-auto w-[260px] object-contain" />
          </div>

          <div className="relative rounded-[22px] border border-[#2c211a] bg-white/90 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 lg:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2f231c] pb-4">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full border border-[#2f231c] bg-[#fff8f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f4b40] sm:text-xs">
                  Pribadi & Rahasia
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9a7f6f]">Dokumen Payroll</p>
                  <p className="mt-1 text-sm text-[#6a554a]">Format slip gaji resmi untuk arsip dan distribusi karyawan.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[20px] border border-[#dccfc7] bg-[linear-gradient(180deg,#fffdf9_0%,#fff5ee_100%)] px-3 py-3 shadow-[0_14px_36px_rgba(113,74,52,0.1)] sm:px-4">
                <div className="relative h-14 w-20 overflow-hidden rounded-[14px] bg-black ring-1 ring-[#2f231c] sm:h-16 sm:w-24">
                  <Image src="/logo/new logo.png" alt="Logo Ayres" fill className="object-contain p-2" priority />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#9b7d6b]">Ayres</p>
                  <p className="mt-1 text-lg font-semibold text-[#201511]">Payroll</p>
                  <p className="text-xs text-[#6e594e]">Human Resources</p>
                </div>
              </div>
            </div>

            <div className="border-b border-[#2f231c] py-6 text-center sm:py-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#a38775]">Slip Gaji</p>
              <h3 className="mt-3 font-[family:var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-semibold uppercase tracking-[0.12em] text-[#18110d]">
                Slip Gaji
              </h3>
              <p className="mt-2 text-sm text-[#6b564b] sm:text-[15px]">Periode payroll: {rangeLabel}</p>
            </div>

            <div className="grid gap-4 py-5 lg:grid-cols-2 lg:gap-5">
              <div className="rounded-[22px] border border-[#eadfd7] bg-[linear-gradient(180deg,#fffdfa_0%,#fff7f2_100%)] px-4 py-4 shadow-[0_12px_30px_rgba(102,64,44,0.06)] sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9a7f6e]">Data Karyawan</p>
                <div className="mt-4 space-y-2.5">
                  <DetailItem label="Nama Karyawan" value={row.name} />
                  <DetailItem label="Jabatan / Divisi" value={`${row.role} / ${row.division}`} />
                  <DetailItem label="Bank" value={row.bank || "-"} />
                  <DetailItem label="No Rekening" value={row.accountNumber || "-"} />
                </div>
              </div>

              <div className="rounded-[22px] border border-[#e5dfd4] bg-[linear-gradient(180deg,#fffefa_0%,#f8f4ef_100%)] px-4 py-4 shadow-[0_12px_30px_rgba(102,64,44,0.06)] sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9a7f6e]">Ringkasan Kehadiran</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#efe5de] bg-white/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b7f71]">Hari Kerja</p>
                    <p className="mt-2 text-2xl font-semibold text-[#1c1410]">{row.presentDays}</p>
                  </div>
                  <div className="rounded-2xl border border-[#efe5de] bg-white/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b7f71]">Lembur</p>
                    <p className="mt-2 text-2xl font-semibold text-[#1c1410]">{row.overtimeHours}</p>
                  </div>
                  <div className="rounded-2xl border border-[#efe5de] bg-white/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b7f71]">Terlambat</p>
                    <p className="mt-2 text-2xl font-semibold text-[#1c1410]">{row.lateCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[#efe5de] bg-white/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#9b7f71]">Setengah Hari</p>
                    <p className="mt-2 text-2xl font-semibold text-[#1c1410]">{row.halfDayCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 py-2 lg:grid-cols-2 lg:gap-5">
              <section className="rounded-[24px] border border-[#ded2c9] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f3_100%)] px-4 py-4 shadow-[0_18px_36px_rgba(103,67,46,0.08)] sm:px-6 sm:py-5">
                <div className="flex items-center justify-between gap-3 border-b border-[#d9cbc2] pb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9a7f6e]">Penerimaan</p>
                    <h4 className="mt-1 text-xl font-semibold uppercase tracking-[0.08em] text-[#1d1510]">Gaji</h4>
                  </div>
                  <div className="rounded-full bg-[#f6eee8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f6658]">
                    {row.payrollType === "sales" ? "Sales" : "Karyawan"}
                  </div>
                </div>
                <div className="mt-4">
                  {earningItems.map((item) => (
                    <MoneyItem key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#ded2c9] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f3_100%)] px-4 py-4 shadow-[0_18px_36px_rgba(103,67,46,0.08)] sm:px-6 sm:py-5">
                <div className="border-b border-[#d9cbc2] pb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9a7f6e]">Pengurang</p>
                  <h4 className="mt-1 text-xl font-semibold uppercase tracking-[0.08em] text-[#1d1510]">Potongan</h4>
                </div>
                <div className="mt-4">
                  {deductionItems.map((item) => (
                    <MoneyItem key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#2f231c] bg-[linear-gradient(90deg,#fff6ee_0%,#fffdf9_48%,#f7efe7_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9c7d6a]">Total Diterima</p>
                  <p className="mt-2 text-sm text-[#6d5649]">Tunjangan lain-lain sudah mencakup uang makan, BPJS, bonus omzet, uang kerajinan, dan subsidi.</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.26em] text-[#7e6557]">Gaji Bersih</p>
                  <p className="mt-2 text-[clamp(2rem,3.8vw,3rem)] font-semibold tabular-nums text-[#17100c]">{formatCurrency(row.netIncome)}</p>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-8 border-t border-dashed border-[#d8c9bf] pt-8 text-center sm:grid-cols-2 sm:gap-14">
              <SignatureBlock title="Owner" name={OWNER_NAME} />
              <SignatureBlock title="HR Coordinator" name={HR_COORDINATOR_NAME} />
            </div>
          </div>
        </article>
      </div>

      <article className="payslip-pdf-template">
        <div className="payslip-pdf-header-row">
          <div className="payslip-pdf-badge">Pribadi & Rahasia</div>
          <div className="payslip-pdf-brand">
            <div className="payslip-pdf-brand-logo">
              <Image src="/logo/new logo.png" alt="Logo Ayres" fill className="object-contain" />
            </div>
            <div className="payslip-pdf-brand-copy">
              <p className="payslip-pdf-brand-name">AYRES</p>
              <p className="payslip-pdf-brand-unit">Payroll</p>
            </div>
          </div>
        </div>

        <div className="payslip-pdf-title-wrap">
          <h3 className="payslip-pdf-title">SLIP GAJI</h3>
          <p className="payslip-pdf-period">Periode: {rangeLabel}</p>
        </div>

        <div className="payslip-pdf-meta-grid">
          <section className="payslip-pdf-panel">
            <PrintPairItem label="Nama Karyawan" value={row.name} />
            <PrintPairItem label="Jabatan / Divisi" value={`${row.role} / ${row.division}`} />
            <PrintPairItem label="Bank" value={row.bank || "-"} />
            <PrintPairItem label="No Rekening" value={row.accountNumber || "-"} />
          </section>

          <section className="payslip-pdf-panel">
            <PrintPairItem label="Total Hari Kerja" value={String(row.presentDays)} />
            <PrintPairItem label="Lembur" value={String(row.overtimeHours)} />
            <PrintPairItem label="Terlambat" value={String(row.lateCount)} />
            <PrintPairItem label="Setengah Hari" value={String(row.halfDayCount)} />
          </section>
        </div>

        <div className="payslip-pdf-finance-grid">
          <section className="payslip-pdf-finance-panel">
            <h4 className="payslip-pdf-section-title">GAJI</h4>
            <div className="payslip-pdf-lines">
              {earningItems.map((item) => (
                <PrintLineItem key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </section>

          <section className="payslip-pdf-finance-panel">
            <h4 className="payslip-pdf-section-title">POTONGAN</h4>
            <div className="payslip-pdf-lines">
              {deductionItems.map((item) => (
                <PrintLineItem key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </section>
        </div>

        <div className="payslip-pdf-total-box">
          <div>
            <p className="payslip-pdf-total-label">GAJI BERSIH</p>
            <p className="payslip-pdf-total-note">Slip ini dibuat dari rekap payroll untuk arsip internal perusahaan.</p>
          </div>
          <p className="payslip-pdf-total-value">{formatCurrency(row.netIncome)}</p>
        </div>

        <div className="payslip-pdf-signatures">
          <PrintSignatureBlock title="Owner" name={OWNER_NAME} />
          <PrintSignatureBlock title="HR Coordinator" name={HR_COORDINATOR_NAME} />
        </div>
      </article>
    </section>
  );
}

