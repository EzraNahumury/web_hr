"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { PayrollEmployeeOption, PayrollOmzetPeriod } from "@/lib/payroll-admin";
import type { AdminPayrollSummarySheet } from "@/lib/payroll-summary";

type Props = {
  sheet: AdminPayrollSummarySheet | null;
  employeeOptions: PayrollEmployeeOption[];
  omzetPeriod: PayrollOmzetPeriod;
};

type FormState = {
  employeeId: string;
  gajiPerDay: string;
  tunjanganJabatan: string;
  uangMakan: string;
  subsidi: string;
  uangKerajinan: string;
  bpjs: string;
  bonusPerforma: string;
  insentif: string;
  uangTransport: string;
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[#d5e9ea] bg-white px-4 text-[#173033] outline-none placeholder:text-[#87a6a8] focus:border-[#19d7df] focus:shadow-[0_0_0_4px_rgba(25,215,223,0.16)]";
const selectClassName =
  `${inputClassName} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23055a61' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:18px_18px] bg-[right_1rem_center] bg-no-repeat pr-11`;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value);
}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-[13px] font-semibold text-[#466668]">{label}</span>
      {children}
    </label>
  );
}

export default function AdminPayrollSummaryManager({ sheet, employeeOptions, omzetPeriod }: Props) {
  const router = useRouter();
  const [isPayrollPending, startPayrollTransition] = useTransition();
  const [isOmzetPending, startOmzetTransition] = useTransition();
  const [payrollMessage, setPayrollMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [omzetMessage, setOmzetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [totalOmzet, setTotalOmzet] = useState(formatNumericInput(String(omzetPeriod.totalOmzet)));
  const [form, setForm] = useState<FormState>({
    employeeId: employeeOptions[0] ? String(employeeOptions[0].employeeId) : "",
    gajiPerDay: "",
    tunjanganJabatan: "",
    uangMakan: "",
    subsidi: "",
    uangKerajinan: "",
    bpjs: "",
    bonusPerforma: "",
    insentif: "",
    uangTransport: "",
  });

  const selectedEmployee = useMemo(
    () => employeeOptions.find((employee) => employee.employeeId === Number(form.employeeId)) ?? null,
    [employeeOptions, form.employeeId],
  );

  const isSales = selectedEmployee?.isSales ?? false;
  const omzetBonus = omzetPeriod.bonusOmzet;
  const isOmzetLocked = omzetPeriod.isLocked;

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePayrollSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayrollMessage(null);

    const payload = {
      action: "save_payroll",
      employeeId: Number(form.employeeId),
      gajiPerDay: parseNumber(form.gajiPerDay),
      tunjanganJabatan: parseNumber(form.tunjanganJabatan),
      uangMakan: parseNumber(form.uangMakan),
      subsidi: parseNumber(form.subsidi),
      uangKerajinan: parseNumber(form.uangKerajinan),
      bpjs: parseNumber(form.bpjs),
      bonusPerforma: parseNumber(form.bonusPerforma),
      insentif: parseNumber(form.insentif),
      uangTransport: parseNumber(form.uangTransport),
    };

    startPayrollTransition(async () => {
      try {
        const response = await fetch("/api/admin/payroll-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Gagal menyimpan payroll.");
        }

        setPayrollMessage({ type: "success", text: result.message || "Payroll berhasil disimpan." });
        router.refresh();
      } catch (error) {
        setPayrollMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan payroll.",
        });
      }
    });
  }

  async function handleOmzetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOmzetMessage(null);

    startOmzetTransition(async () => {
      try {
        const response = await fetch("/api/admin/payroll-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_omzet",
            totalOmzet: parseNumber(totalOmzet),
          }),
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Gagal menyimpan total omzet.");
        }

        setOmzetMessage({ type: "success", text: result.message || "Total omzet berhasil disimpan." });
        router.refresh();
      } catch (error) {
        setOmzetMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan total omzet.",
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handlePayrollSubmit} className="rounded-[32px] border border-[#cfeaec] bg-[linear-gradient(180deg,#f9ffff_0%,#f2fcfc_100%)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0c8087]">Input Payroll</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#123336]">Form Payroll Admin</h2>
              <p className="mt-2 text-sm text-[#628083]">Pilih nama karyawan, lalu isi komponen payroll per karyawan.</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isSales ? "bg-[#fff1d8] text-[#8a5d00]" : "bg-[#dff7f8] text-[#0b6670]"}`}>
              {isSales ? "Sales" : "Non Sales"}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Nama Karyawan">
              <select value={form.employeeId} onChange={(event) => updateField("employeeId", event.target.value)} className={selectClassName} required>
                <option value="">Pilih karyawan</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.employeeId} value={employee.employeeId}>
                    {employee.name} - {employee.role}
                  </option>
                ))}
              </select>
            </Field>

            {selectedEmployee ? (
              <div className="mt-1 rounded-[24px] border border-[#d5e9ea] bg-white px-5 py-5 text-sm text-[#35585b]">
                <p className="font-semibold text-[#19393d]">{selectedEmployee.name}</p>
                <p className="mt-2">{selectedEmployee.role} | {selectedEmployee.division} | {selectedEmployee.department}</p>
                <p className="mt-2">Pembagian rekapan: {selectedEmployee.recapGroup}</p>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Gaji Pokok Perhari / Perjam"><input value={form.gajiPerDay} onChange={(event) => updateField("gajiPerDay", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="Tunjangan Jabatan"><input value={form.tunjanganJabatan} onChange={(event) => updateField("tunjanganJabatan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="Uang Makan"><input value={form.uangMakan} onChange={(event) => updateField("uangMakan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="Subsidi"><input value={form.subsidi} onChange={(event) => updateField("subsidi", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="Uang Kerajinan"><input value={form.uangKerajinan} onChange={(event) => updateField("uangKerajinan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="BPJS"><input value={form.bpjs} onChange={(event) => updateField("bpjs", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              {isSales ? (
                <>
                  <Field label="Insentif"><input value={form.insentif} onChange={(event) => updateField("insentif", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                  <Field label="Uang Transport"><input value={form.uangTransport} onChange={(event) => updateField("uangTransport", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                </>
              ) : (
                <Field label="Bonus Performa"><input value={form.bonusPerforma} onChange={(event) => updateField("bonusPerforma", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              )}
            </div>
          </div>

          {payrollMessage ? (
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${payrollMessage.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"}`}>
              {payrollMessage.text}
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={isPayrollPending || !form.employeeId} className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0d7f86] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isPayrollPending ? "Menyimpan..." : "Simpan Payroll"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <form onSubmit={handleOmzetSubmit} className="rounded-[32px] border border-[#cfeaec] bg-[linear-gradient(180deg,#f9ffff_0%,#f2fcfc_100%)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0c8087]">Total Omzet</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#123336]">Input Omzet Bulanan</h2>
            <p className="mt-2 text-sm text-[#628083]">Diisi satu kali per periode payroll, tidak per karyawan.</p>
            <div className="mt-6 space-y-4">
              <Field label="Total Omzet Periode Aktif">
                <input
                  value={totalOmzet}
                  onChange={(event) => setTotalOmzet(formatNumericInput(event.target.value))}
                  className={inputClassName}
                  inputMode="numeric"
                  required
                  readOnly={false}
                />
              </Field>
              <div className="rounded-[24px] border border-[#d5e9ea] bg-white px-4 py-4 text-sm text-[#35585b]">
                <p className="text-[13px] font-semibold text-[#466668]">Bonus Omzet Periode Aktif</p>
                <p className="mt-2 text-2xl font-semibold text-[#123336]">{formatCurrency(omzetBonus)}</p>
              </div>
            </div>
            {isOmzetLocked ? (
              <div className="mt-5 rounded-2xl bg-[#edf6f6] px-4 py-3 text-sm text-[#446568]">
                Total omzet periode ini sudah tersimpan dan dikunci.
              </div>
            ) : null}
            {omzetMessage ? (
              <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${omzetMessage.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"}`}>
                {omzetMessage.text}
              </div>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button type="submit" disabled={isOmzetPending} className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#19d7df] px-6 text-sm font-semibold text-[#083438] disabled:cursor-not-allowed disabled:opacity-60">
                {isOmzetPending ? "Menyimpan..." : isOmzetLocked ? "Update Omzet" : "Simpan Omzet"}
              </button>
            </div>
          </form>

          {!sheet ? (
            <div className="rounded-[32px] border border-[#ead7ce] bg-white px-6 py-10 text-sm text-[#7a6059]">Belum ada data payroll yang bisa diringkas.</div>
          ) : (
            <section className="grid gap-4">
              <article className="rounded-[30px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)] px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Periode Payroll</p>
                <h2 className="mt-3 text-2xl font-semibold text-[#241716]">{sheet.periodLabel}</h2>
                <p className="mt-2 text-sm text-[#7a6059]">Rentang absensi {sheet.rangeLabel}</p>
              </article>
              <article className="rounded-[30px] border border-[#ead7ce] bg-[#19d7df] px-6 py-5 text-[#032a2d]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">Total Omzet</p>
                <p className="mt-3 text-3xl font-semibold">{formatCurrency(sheet.totalOmzet)}</p>
              </article>
              <article className="rounded-[30px] border border-[#ead7ce] bg-[#19d7df] px-6 py-5 text-[#032a2d]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">Bonus Omzet</p>
                <p className="mt-3 text-3xl font-semibold">{formatCurrency(sheet.totalBonusOmzet)}</p>
              </article>
            </section>
          )}
        </div>
      </section>

      {sheet ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Karyawan</p>
              <p className="mt-2 text-3xl font-semibold text-[#241716]">{sheet.rows.length}</p>
            </article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Total Potongan</p>
              <p className="mt-2 text-3xl font-semibold text-[#241716]">{formatCurrency(sheet.totalDeduction)}</p>
            </article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Penerimaan Bersih</p>
              <p className="mt-2 text-3xl font-semibold text-[#241716]">{formatCurrency(sheet.totalNetIncome)}</p>
            </article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Range</p>
              <p className="mt-2 text-lg font-semibold text-[#241716]">26 - 25</p>
            </article>
          </section>

          <div className="overflow-hidden rounded-[32px] border border-[#d9efef] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[3800px] border-collapse text-left text-sm text-[#1d1d1d]">
                <thead>
                  <tr className="bg-[#19d7df] text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#062e31]">
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">No</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Nama</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Jabatan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Divisi</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Pembagian Rekapan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Departemen</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Bank</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">No Rekening</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Tipe</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Gaji Pokok</th>
                    <th colSpan={7} className="border border-[#a8ebef] px-3 py-3">Nominal Tetap</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Hari Kerja</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Masuk</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Total Gaji Pokok</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Omzet / Insentif</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Uang Makan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Kerajinan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Transport</th>
                    <th colSpan={2} className="border border-[#a8ebef] px-3 py-3">Lembur</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Izin / Off</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Sakit</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Sakit Tanpa Surat</th>
                    <th colSpan={2} className="border border-[#a8ebef] px-3 py-3">Setengah Hari</th>
                    <th colSpan={2} className="border border-[#a8ebef] px-3 py-3">Telat</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Total Gaji</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Total Gaji Sebelum Potongan</th>
                    <th colSpan={3} className="border border-[#a8ebef] px-3 py-3">Tambahan</th>
                    <th colSpan={4} className="border border-[#a8ebef] px-3 py-3">Total Potongan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Penerimaan Bersih</th>
                  </tr>
                  <tr className="bg-[#19d7df] text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#062e31]">
                    <th className="border border-[#a8ebef] px-3 py-3">Gaji Pokok Perhari / Perjam</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Tunjangan Jabatan</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Uang Makan</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Subsidi</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Uang Kerajinan</th>
                    <th className="border border-[#a8ebef] px-3 py-3">BPJS</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Bonus Performa</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Lembur</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Bonus</th>
                    <th className="border border-[#a8ebef] px-3 py-3">1/2 Hari</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Potongan</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Telat</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Potongan</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Kontrak</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Pinjaman Perusahaan</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Pinjaman Pribadi</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Potongan Denda</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Potongan Kontrak</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Potongan Pinjaman</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Potongan Uang Kerajinan</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row) => (
                    <tr key={row.id} className="text-[#3a2b27] odd:bg-white even:bg-[#fcfefe]">
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.number}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 font-semibold text-[#241716]">{row.name}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.role}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.division}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.recapGroup}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.department}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.bank}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.accountNumber}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.payrollType === "sales" ? "Sales" : "Non Sales"}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.monthlyBaseSalary)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.dailyBaseSalary)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.positionAllowance)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.fixedMealAllowance)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.subsidy)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.fixedDiligenceAllowance)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.bpjs)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.performanceBonus)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.workDays}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.presentDays}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.totalBaseSalary)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.omzetBonus)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.mealAllowance)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.diligenceAllowance)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.transportAllowance)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{formatNumber(row.overtimeHours)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.overtimeBonus)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.leaveCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.sickCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.sickWithoutNoteCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.halfDayCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.halfDayDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.lateCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.lateDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold">{formatCurrency(row.totalSalary)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.totalSalaryBeforeDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.contractDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.companyLoan)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.personalLoan)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.fineDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.contractCut)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.loanCut)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.diligenceCut)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold text-[#8f1d22]">{formatCurrency(row.netIncome)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}








