"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminPayrollSummarySheet, AdminPayrollSummarySheetRow } from "@/lib/payroll-summary";
import type { PayrollEmployeeOption } from "@/lib/payroll-admin";

type PeriodOption = { month: number; year: number; label: string };

type Props = {
  sheet: AdminPayrollSummarySheet | null;
  periodOptions: PeriodOption[];
  employeeOptions: PayrollEmployeeOption[];
};

type FormState = {
  employeeId: string;
  overrideGajiPokok: string;
  uangTransport: string;
  bpjs: string;
  kendaraan: string;
  bonusPerforma: string;
  overrideKontrak: string;
  overridePinjaman: string;
  overridePinjamanPribadi: string;
};

type DialogState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; row: AdminPayrollSummarySheetRow };

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function digitsOnly(v: string) {
  return v.replace(/[^\d]/g, "");
}

function fmtInput(v: string) {
  const d = digitsOnly(v);
  return d ? Number(d).toLocaleString("id-ID") : "";
}

function parseNum(v: string) {
  const d = digitsOnly(v);
  return d ? Number(d) : 0;
}

function fv(n: number) {
  return n > 0 ? fmtInput(String(n)) : "";
}

function fo(n: number | null) {
  return n !== null ? fmtInput(String(n)) : "";
}

function computeRow(row: AdminPayrollSummarySheetRow) {
  const totalGaji =
    row.monthlyBaseSalary +
    row.transportAllowance +
    row.bpjs +
    row.vehicleAllowance +
    row.performanceBonus;
  const totalPotongan = row.contractCut + row.loanCut + row.personalLoan;
  const penerimaanBersih = Math.max(0, totalGaji - totalPotongan);
  return { totalGaji, totalPotongan, penerimaanBersih };
}

function emptyForm(employeeId = ""): FormState {
  return {
    employeeId,
    overrideGajiPokok: "",
    uangTransport: "",
    bpjs: "",
    kendaraan: "",
    bonusPerforma: "",
    overrideKontrak: "",
    overridePinjaman: "",
    overridePinjamanPribadi: "",
  };
}

function formFromRow(row: AdminPayrollSummarySheetRow): FormState {
  return {
    employeeId: String(row.employeeId),
    overrideGajiPokok: fo(row.inputOverrideGajiPokok),
    uangTransport: fv(row.inputUangTransport),
    bpjs: fv(row.inputBpjs),
    kendaraan: fv(row.inputKendaraan),
    bonusPerforma: fv(row.inputBonusPerforma),
    overrideKontrak: fo(row.inputOverrideKontrak),
    overridePinjaman: fo(row.inputOverridePinjaman),
    overridePinjamanPribadi: fo(row.inputOverridePinjamanPribadi),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[13px] font-semibold text-[#466668]">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-[#d5e9ea] bg-white px-4 text-sm text-[#173033] outline-none placeholder:text-[#87a6a8] focus:border-[#19d7df] focus:shadow-[0_0_0_3px_rgba(25,215,223,0.16)]";

const thBase =
  "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a6059] whitespace-nowrap border border-[#ede0d8] bg-[#fff5f0]";
const thSticky = `${thBase} sticky left-0 z-20`;
const thGroup =
  "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#5a3028] bg-[#fde8df] border border-[#ede0d8] text-center";
const tdBase =
  "px-3 py-2.5 text-xs text-[#2d1b18] whitespace-nowrap border-b border-r border-[#f1e5de]";
const tdSticky = `${tdBase} sticky left-0 z-10 bg-white`;
const tdNum = `${tdBase} text-right tabular-nums`;
const tdRed = `${tdNum} text-red-600`;
const tdGreen = `${tdNum} bg-[#f0fdf4] font-semibold`;

export default function AdminSalesNasionalPayrollSummary({
  sheet,
  periodOptions,
  employeeOptions,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [month, year] = e.target.value.split("-").map(Number);
    const params = new URLSearchParams(searchParams.toString());
    if (month && year) {
      params.set("month", String(month));
      params.set("year", String(year));
    } else {
      params.delete("month");
      params.delete("year");
    }
    router.push(`/admin/payroll-summary/sales-nasional?${params.toString()}`);
  }

  function openAdd() {
    setForm(emptyForm());
    setError(null);
    setDialog({ open: true, mode: "add" });
  }

  function openEdit(row: AdminPayrollSummarySheetRow) {
    setForm(formFromRow(row));
    setError(null);
    setDialog({ open: true, mode: "edit", row });
  }

  function closeDialog() {
    setDialog({ open: false });
  }

  function setField(key: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const employeeId =
      dialog.open && dialog.mode === "edit" ? dialog.row.employeeId : Number(form.employeeId);
    if (!employeeId || !sheet) return;

    const body = {
      action: "save_payroll",
      month: sheet.periodMonth,
      year: sheet.periodYear,
      employeeId,
      gajiPerDay: 0,
      tunjanganJabatan: 0,
      uangMakan: 0,
      subsidi: 0,
      uangKerajinan: 0,
      bpjs: parseNum(form.bpjs),
      bonusPerforma: parseNum(form.bonusPerforma),
      insentif: 0,
      uangTransport: parseNum(form.uangTransport),
      kendaraan: parseNum(form.kendaraan),
      perjalananDinasReimburse: 0,
      overrideMasuk: null,
      overrideLembur: null,
      overrideIzin: null,
      overrideSakit: null,
      overrideSakitTanpaSurat: null,
      overrideSetengahHari: null,
      overrideKontrak: form.overrideKontrak !== "" ? parseNum(form.overrideKontrak) : null,
      overridePinjaman: form.overridePinjaman !== "" ? parseNum(form.overridePinjaman) : null,
      overridePinjamanPribadi:
        form.overridePinjamanPribadi !== "" ? parseNum(form.overridePinjamanPribadi) : null,
      overrideGajiPokok: form.overrideGajiPokok !== "" ? parseNum(form.overrideGajiPokok) : null,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/payroll-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { message: string };
        if (!res.ok) {
          setError(data.message ?? "Gagal menyimpan.");
          return;
        }
        closeDialog();
        router.refresh();
      } catch {
        setError("Terjadi kesalahan jaringan.");
      }
    });
  }

  const currentPeriodValue = sheet ? `${sheet.periodMonth}-${sheet.periodYear}` : "";
  const existingIds = new Set(sheet?.rows.map((r) => r.employeeId) ?? []);
  const availableOptions = employeeOptions.filter((e) => !existingIds.has(e.employeeId));
  const dialogTitle =
    dialog.open && dialog.mode === "edit"
      ? `Edit Payroll — ${dialog.row.name}`
      : "Tambah Payroll Sales Nasional";

  const totalNetAll = sheet?.rows.reduce((s, r) => s + computeRow(r).penerimaanBersih, 0) ?? 0;
  const totalGajiAll = sheet?.rows.reduce((s, r) => s + computeRow(r).totalGaji, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="flex flex-col gap-4 border-b border-[#eddad1] px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
              Sales Nasional
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
              {sheet ? sheet.periodLabel : "Belum ada data"}
            </h3>
            {sheet?.rangeLabel && (
              <p className="mt-1 text-sm text-[#8a6f68]">{sheet.rangeLabel}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={currentPeriodValue}
              onChange={handlePeriodChange}
              className="h-10 rounded-xl border border-[#ead7ce] bg-white px-3 text-sm text-[#2d1b18] outline-none focus:border-[#c8716d]"
            >
              {periodOptions.map((opt) => (
                <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={openAdd}
              className="h-10 rounded-xl bg-[#8f1d22] px-5 text-sm font-semibold text-white hover:bg-[#7a1a1e] active:bg-[#6a1519]"
            >
              + Tambah Payroll
            </button>
          </div>
        </div>

        {sheet && sheet.rows.length > 0 && (
          <div className="grid grid-cols-2 gap-4 px-6 py-4 md:grid-cols-3">
            {[
              { label: "Total Karyawan", value: sheet.rows.length.toString() },
              { label: "Total Gaji", value: formatRupiah(totalGajiAll) },
              { label: "Total Penerimaan Bersih", value: formatRupiah(totalNetAll) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-[#ead7ce] bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#a16f63]">{s.label}</p>
                <p className="mt-2 text-xl font-semibold text-[#241716]">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Empty state */}
      {!sheet || sheet.rows.length === 0 ? (
        <div className="rounded-[32px] border border-[#ead7ce] bg-white px-6 py-20 text-center shadow-sm">
          <p className="text-base font-semibold text-[#3b2723]">Belum ada data payroll</p>
          <p className="mt-2 text-sm text-[#8a6f68]">
            Gunakan tombol Tambah Payroll untuk menambahkan data Sales Nasional pada periode ini.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white shadow-[0_8px_32px_rgba(96,45,34,0.06)]">
          <div className="overflow-x-auto">
            <table className="border-collapse text-left" style={{ minWidth: "1400px" }}>
              <thead>
                <tr>
                  <th className={thBase} rowSpan={2}>No</th>
                  <th className={thSticky} rowSpan={2}>Nama</th>
                  <th className={thBase} rowSpan={2}>Jabatan</th>
                  <th className={thBase} rowSpan={2}>Divisi</th>
                  <th className={thBase} rowSpan={2}>Departemen</th>
                  <th className={thBase} rowSpan={2}>Bank</th>
                  <th className={thBase} rowSpan={2}>No Rekening</th>
                  <th className={thGroup} colSpan={5}>Nominal</th>
                  <th className={thBase} rowSpan={2}>Total Gaji</th>
                  <th className={thGroup} colSpan={4}>Potongan</th>
                  <th
                    className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#14532d] whitespace-nowrap border border-[#bbf7d0] bg-[#dcfce7]"
                    rowSpan={2}
                  >
                    Penerimaan Bersih
                  </th>
                  <th className={thBase} rowSpan={2}>Aksi</th>
                </tr>
                <tr>
                  {/* Nominal */}
                  <th className={thBase}>Gaji Pokok</th>
                  <th className={thBase}>Transport</th>
                  <th className={thBase}>BPJS</th>
                  <th className={thBase}>Kendaraan</th>
                  <th className={thBase}>Bonus Opsional</th>
                  {/* Potongan */}
                  <th className={thBase}>Kontrak</th>
                  <th className={thBase}>Pinjaman</th>
                  <th className={thBase}>Lain-Lain</th>
                  <th className={thBase}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, i) => {
                  const { totalGaji, totalPotongan, penerimaanBersih } = computeRow(row);
                  return (
                    <tr key={row.id} className="hover:bg-[#fffaf7]">
                      <td className={tdBase + " text-[#a16f63]"}>{i + 1}</td>
                      <td className={tdSticky + " font-medium max-w-[160px] truncate"}>{row.name}</td>
                      <td className={tdBase}>{row.role}</td>
                      <td className={tdBase}>{row.division}</td>
                      <td className={tdBase}>{row.department}</td>
                      <td className={tdBase}>{row.bank}</td>
                      <td className={tdBase}>{row.accountNumber}</td>

                      {/* Nominal */}
                      <td className={tdNum}>{formatRupiah(row.monthlyBaseSalary)}</td>
                      <td className={tdNum}>{row.transportAllowance > 0 ? formatRupiah(row.transportAllowance) : "-"}</td>
                      <td className={tdNum}>{row.bpjs > 0 ? formatRupiah(row.bpjs) : "-"}</td>
                      <td className={tdNum}>{row.vehicleAllowance > 0 ? formatRupiah(row.vehicleAllowance) : "-"}</td>
                      <td className={tdNum}>{row.performanceBonus > 0 ? formatRupiah(row.performanceBonus) : "-"}</td>

                      {/* Total Gaji */}
                      <td className={tdNum + " font-semibold"}>{formatRupiah(totalGaji)}</td>

                      {/* Potongan */}
                      <td className={tdRed}>{row.contractCut > 0 ? formatRupiah(row.contractCut) : "-"}</td>
                      <td className={tdRed}>{row.loanCut > 0 ? formatRupiah(row.loanCut) : "-"}</td>
                      <td className={tdRed}>{row.personalLoan > 0 ? formatRupiah(row.personalLoan) : "-"}</td>
                      <td className={tdRed + " font-semibold"}>{totalPotongan > 0 ? formatRupiah(totalPotongan) : "-"}</td>

                      {/* Penerimaan Bersih */}
                      <td className={tdGreen}>{formatRupiah(penerimaanBersih)}</td>

                      {/* Aksi */}
                      <td className={tdBase}>
                        <button
                          onClick={() => openEdit(row)}
                          className="rounded-lg border border-[#ead7ce] bg-white px-3 py-1.5 text-xs font-medium text-[#8f1d22] hover:bg-[#fff2ec]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Dialog */}
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eddad1] px-6 py-5">
              <h3 className="text-lg font-semibold text-[#241716]">{dialogTitle}</h3>
              <button
                onClick={closeDialog}
                className="rounded-full p-2 text-[#a16f63] hover:bg-[#fff2ec]"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5"
            >
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              {dialog.mode === "add" && (
                <Field label="Karyawan">
                  <select
                    required
                    value={form.employeeId}
                    onChange={(e) => setField("employeeId", e.target.value)}
                    className={inputCls + " appearance-none"}
                  >
                    <option value="">Pilih karyawan Sales Nasional...</option>
                    {availableOptions.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#a16f63]">
                Nominal
              </p>
              <Field label="Gaji Pokok (Bulanan)">
                <input
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="0"
                  value={form.overrideGajiPokok}
                  onChange={(e) => setField("overrideGajiPokok", fmtInput(e.target.value))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Transport">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.uangTransport}
                    onChange={(e) => setField("uangTransport", fmtInput(e.target.value))}
                  />
                </Field>
                <Field label="BPJS">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.bpjs}
                    onChange={(e) => setField("bpjs", fmtInput(e.target.value))}
                  />
                </Field>
                <Field label="Kendaraan">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.kendaraan}
                    onChange={(e) => setField("kendaraan", fmtInput(e.target.value))}
                  />
                </Field>
                <Field label="Bonus Opsional">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.bonusPerforma}
                    onChange={(e) => setField("bonusPerforma", fmtInput(e.target.value))}
                  />
                </Field>
              </div>

              <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#a16f63]">
                Potongan (opsional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Potongan Kontrak">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overrideKontrak}
                    onChange={(e) => setField("overrideKontrak", fmtInput(e.target.value))}
                  />
                </Field>
                <Field label="Potongan Pinjaman">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overridePinjaman}
                    onChange={(e) => setField("overridePinjaman", fmtInput(e.target.value))}
                  />
                </Field>
                <Field label="Lain-Lain">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overridePinjamanPribadi}
                    onChange={(e) =>
                      setField("overridePinjamanPribadi", fmtInput(e.target.value))
                    }
                  />
                </Field>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="h-11 flex-1 rounded-xl border border-[#ead7ce] text-sm font-semibold text-[#8f1d22] hover:bg-[#fff2ec]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-11 flex-1 rounded-xl bg-[#8f1d22] text-sm font-semibold text-white hover:bg-[#7a1a1e] disabled:opacity-50"
                >
                  {isPending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
