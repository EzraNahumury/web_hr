"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { PartimeComputedRow, PartimePayrollSummarySheet } from "@/lib/payroll-partime";
import type { PayrollEmployeeOption } from "@/lib/payroll-admin";

type PeriodOption = { month: number; year: number; label: string };

type Props = {
  sheet: PartimePayrollSummarySheet | null;
  periodOptions: PeriodOption[];
  employeeOptions: PayrollEmployeeOption[];
};

type FormState = {
  employeeId: string;
  insentifPerHari: string;
  uangMakanPerHari: string;
  tunjanganJabatan: string;
  subsidi: string;
  bpjs: string;
};

type DialogState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; row: PartimeComputedRow };

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function digitsOnly(v: string) {
  return v.replace(/[^\d]/g, "");
}

function formatNumericInput(v: string) {
  const d = digitsOnly(v);
  return d ? Number(d).toLocaleString("id-ID") : "";
}

function parseNumber(v: string) {
  const d = digitsOnly(v);
  return d ? Number(d) : 0;
}

function emptyForm(employeeId = ""): FormState {
  return {
    employeeId,
    insentifPerHari: "",
    uangMakanPerHari: "",
    tunjanganJabatan: "",
    subsidi: "",
    bpjs: "",
  };
}

function formFromRow(row: PartimeComputedRow): FormState {
  const fv = (n: number) => (n > 0 ? formatNumericInput(String(n)) : "");
  return {
    employeeId: String(row.employeeId),
    insentifPerHari: fv(row.inputInsentifPerHari),
    uangMakanPerHari: fv(row.inputUangMakanPerHari),
    tunjanganJabatan: fv(row.inputTunjanganJabatan),
    subsidi: fv(row.inputSubsidi),
    bpjs: fv(row.inputBpjs),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[13px] font-semibold text-[#3d4d7a]">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-[#d7ddf0] bg-white px-4 text-sm text-[#1a2540] outline-none placeholder:text-[#98a2c8] focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.16)]";

const thBase =
  "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#4a5480] whitespace-nowrap border border-[#e2e5f2] bg-[#f2f3fb]";
const thSticky = `${thBase} sticky left-0 z-20`;
const thGroup =
  "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#3730a3] bg-[#e0e2fb] border border-[#e2e5f2] text-center";
const tdBase = "px-3 py-2.5 text-xs text-[#1e2540] whitespace-nowrap border-b border-r border-[#eef0f8]";
const tdSticky = `${tdBase} sticky left-0 z-10 bg-white`;
const tdNum = `${tdBase} text-right tabular-nums`;
const tdRed = `${tdNum} text-red-600`;
const tdBlue = `${tdNum} bg-[#eef0fe]`;
const tdGreen = `${tdNum} bg-[#f0fdf4] font-semibold`;

export default function AdminPartimePayrollSummary({ sheet, employeeOptions }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  function handlePeriodChange(e: React.ChangeEvent<HTMLInputElement>) {
    const [year, month] = e.target.value.split("-").map(Number);
    const params = new URLSearchParams(searchParams.toString());
    if (month && year) {
      params.set("month", String(month));
      params.set("year", String(year));
    } else {
      params.delete("month");
      params.delete("year");
    }
    router.push(`/admin/payroll-summary/partime?${params.toString()}`);
  }

  function openAdd() {
    setForm(emptyForm());
    setError(null);
    setDialog({ open: true, mode: "add" });
  }

  function openEdit(row: PartimeComputedRow) {
    setForm(formFromRow(row));
    setError(null);
    setDialog({ open: true, mode: "edit", row });
  }

  function closeDialog() {
    setDialog({ open: false });
  }

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      // insentif kehadiran/hari -> gaji_pokok_per_hari (×hari masuk di server-side sheet)
      gajiPerDay: parseNumber(form.insentifPerHari),
      tunjanganJabatan: parseNumber(form.tunjanganJabatan),
      // uang makan/hari -> uang_makan_per_hari (×hari masuk di server-side sheet)
      uangMakan: parseNumber(form.uangMakanPerHari),
      subsidi: parseNumber(form.subsidi),
      bpjs: parseNumber(form.bpjs),
      // komponen yang TIDAK dipakai partime — dikirim 0/null agar tidak nyangkut nilai lama
      uangKerajinan: 0,
      bonusPerforma: 0,
      insentif: 0,
      uangTransport: 0,
      kendaraan: 0,
      perjalananDinasReimburse: 0,
      overrideMasuk: null,
      overrideLembur: null,
      overrideIzin: null,
      overrideSakit: null,
      overrideSakitTanpaSurat: null,
      overrideSetengahHari: null,
      overrideKontrak: null,
      overridePinjaman: null,
      overridePinjamanPribadi: null,
      overrideGajiPokok: null,
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

  async function handleDownloadPdf() {
    if (isExportingPdf || !sheet || sheet.rows.length === 0) return;
    setIsExportingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const rp0 = (n: number) => (n > 0 ? formatRupiah(n) : "-");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Rekap Payroll Partime", 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Periode: ${sheet.periodLabel}`, 14, 22);
      doc.text(`Total partime: ${sheet.rows.length}`, 14, 27.5);

      autoTable(doc, {
        startY: 32,
        head: [
          [
            "No",
            "Nama",
            "Insentif/Hari",
            "Uang Makan/Hari",
            "Tunjangan Jabatan",
            "Subsidi",
            "BPJS",
            "Masuk",
            "Telat",
            "Insentif (xMasuk)",
            "Uang Makan (xMasuk)",
            "Total Sblm Potongan",
            "Potongan Telat",
            "Total Gaji",
          ],
        ],
        body: sheet.rows.map((row, index) => [
          index + 1,
          (row.nama || "").toUpperCase(),
          rp0(row.insentifPerHari),
          rp0(row.uangMakanPerHari),
          rp0(row.tunjanganJabatan),
          rp0(row.subsidi),
          rp0(row.bpjs),
          row.masuk,
          row.telat,
          rp0(row.insentifTotal),
          rp0(row.uangMakanTotal),
          rp0(row.totalGajiSebelumPotongan),
          rp0(row.potonganTelat),
          formatRupiah(Math.max(0, row.totalGaji)),
        ]),
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.6, halign: "right", valign: "middle", lineColor: [226, 229, 242] },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle" },
        alternateRowStyles: { fillColor: [242, 243, 251] },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          1: { halign: "left", cellWidth: 40 },
          7: { halign: "center" },
          8: { halign: "center" },
        },
      });

      const month = String(sheet.periodMonth).padStart(2, "0");
      doc.save(`REKAP-PAYROLL-PARTIME-${sheet.periodYear}-${month}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsExportingPdf(false);
    }
  }

  const existingIds = new Set(sheet?.rows.map((r) => r.employeeId) ?? []);
  const availableEmployeeOptions = employeeOptions.filter((e) => !existingIds.has(e.employeeId));

  const currentPeriodValue = sheet
    ? `${sheet.periodYear}-${String(sheet.periodMonth).padStart(2, "0")}`
    : "";
  const dialogTitle =
    dialog.open && dialog.mode === "edit"
      ? `Edit Payroll — ${dialog.row.nama}`
      : "Tambah Payroll Partime";

  const totalGajiAll = sheet?.rows.reduce((s, r) => s + Math.max(0, r.totalGaji), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[32px] border border-[#dfe2f3] bg-[linear-gradient(180deg,#fdfdff_0%,#f4f5fd_100%)] shadow-[0_20px_60px_rgba(49,46,129,0.08)]">
        <div className="flex flex-col gap-4 border-b border-[#e4e6f4] px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#d7dbf3] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5b5fc4]">
              Rekap Partime
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#1c2140]">
              {sheet ? sheet.periodLabel : "Belum ada data"}
            </h3>
            <p className="mt-1 text-sm text-[#6b7099]">
              Insentif ×hari masuk · Uang makan ×hari masuk · Potongan telat Rp5.000/telat
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={currentPeriodValue}
              onChange={handlePeriodChange}
              className="h-10 rounded-xl border border-[#d7ddf0] bg-white px-3 text-sm text-[#1c2140] outline-none focus:border-[#6366f1]"
            />
            {sheet && sheet.rows.length > 0 ? (
              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d7ddf0] bg-white px-4 text-sm font-semibold text-[#4338ca] hover:bg-[#f0f1fe] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                {isExportingPdf ? "Membuat PDF..." : "Download PDF"}
              </button>
            ) : null}
            <button
              onClick={openAdd}
              className="h-10 rounded-xl bg-[#4f46e5] px-5 text-sm font-semibold text-white hover:bg-[#4338ca] active:bg-[#3730a3]"
            >
              + Tambah Payroll
            </button>
          </div>
        </div>

        {sheet && sheet.rows.length > 0 && (
          <div className="grid grid-cols-2 gap-4 px-6 py-4 md:grid-cols-2">
            {[
              { label: "Total Partime", value: sheet.rows.length.toString() },
              { label: "Total Gaji (Bersih)", value: formatRupiah(totalGajiAll) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[#dfe2f3] bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5b5fc4]">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-[#1c2140]">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Empty state */}
      {!sheet || sheet.rows.length === 0 ? (
        <div className="rounded-[32px] border border-[#dfe2f3] bg-white px-6 py-20 text-center shadow-sm">
          <p className="text-base font-semibold text-[#2a3050]">Belum ada data partime</p>
          <p className="mt-2 text-sm text-[#7176a0]">
            Belum ada karyawan dengan status kepegawaian <span className="font-semibold">Partime</span> pada periode ini.
            Set status karyawan ke Partime di menu Data Karyawan, lalu klik <span className="font-semibold">+ Tambah Payroll</span> untuk mengisi nominal.
          </p>
        </div>
      ) : (
        /* Main table */
        <section className="overflow-hidden rounded-[32px] border border-[#dfe2f3] bg-white shadow-[0_8px_32px_rgba(49,46,129,0.06)]">
          <div className="overflow-auto max-h-[calc(100vh-260px)]">
            <table className="border-collapse text-left" style={{ minWidth: "1800px" }}>
              <thead className="sticky top-0 z-20">
                {/* Row 1 — group labels */}
                <tr>
                  <th className={thBase} rowSpan={2}>No</th>
                  <th className={thSticky} rowSpan={2}>Nama</th>
                  <th className={thBase} rowSpan={2}>Jabatan</th>
                  <th className={thBase} rowSpan={2}>Divisi</th>
                  <th className={thBase} rowSpan={2}>Departemen</th>
                  <th className={thBase} rowSpan={2}>Bank</th>
                  <th className={thBase} rowSpan={2}>No Rekening</th>
                  <th className={thGroup} colSpan={5}>Nominal (Custom)</th>
                  <th className={thGroup} colSpan={3}>Absensi</th>
                  <th className={thGroup} colSpan={5}>Perhitungan</th>
                  <th className={thBase} rowSpan={2}>Aksi</th>
                </tr>
                {/* Row 2 — sub-labels */}
                <tr>
                  {/* Nominal */}
                  <th className={thBase}>Insentif/Hari</th>
                  <th className={thBase}>Uang Makan/Hari</th>
                  <th className={thBase}>Tunjangan Jabatan</th>
                  <th className={thBase}>Subsidi</th>
                  <th className={thBase}>BPJS</th>
                  {/* Absensi */}
                  <th className={thBase}>Hari (Tetap)</th>
                  <th className={thBase}>Masuk</th>
                  <th className={thBase}>Telat</th>
                  {/* Perhitungan */}
                  <th className={thBase}>Insentif (×Masuk)</th>
                  <th className={thBase}>Uang Makan (×Masuk)</th>
                  <th className={thBase}>Total Sblm Potongan</th>
                  <th className={thBase}>Potongan Telat</th>
                  <th className={thBase}>Total Gaji</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, index) => (
                  <tr key={row.payrollId} className="hover:bg-[#f8f9ff]">
                    <td className={tdBase + " text-[#8a8fbf]"}>{index + 1}</td>
                    <td className={tdSticky + " font-medium uppercase max-w-[180px] truncate"}>{row.nama}</td>
                    <td className={tdBase}>{row.jabatan}</td>
                    <td className={tdBase}>{row.divisi}</td>
                    <td className={tdBase}>{row.departemen}</td>
                    <td className={tdBase + " uppercase"}>{row.bank}</td>
                    <td className={tdBase}>{row.noRekening}</td>

                    {/* Nominal */}
                    <td className={tdNum}>{formatRupiah(row.insentifPerHari)}</td>
                    <td className={tdNum}>{formatRupiah(row.uangMakanPerHari)}</td>
                    <td className={tdNum}>{formatRupiah(row.tunjanganJabatan)}</td>
                    <td className={tdNum}>{formatRupiah(row.subsidi)}</td>
                    <td className={tdNum}>{formatRupiah(row.bpjs)}</td>

                    {/* Absensi */}
                    <td className={tdNum}>{row.hariTetap}</td>
                    <td className={tdNum}>{row.masuk}</td>
                    <td className={tdNum}>{row.telat}</td>

                    {/* Perhitungan */}
                    <td className={tdNum}>{formatRupiah(row.insentifTotal)}</td>
                    <td className={tdNum}>{formatRupiah(row.uangMakanTotal)}</td>
                    <td className={tdBlue}>{formatRupiah(row.totalGajiSebelumPotongan)}</td>
                    <td className={tdRed}>{row.potonganTelat > 0 ? "-" + formatRupiah(row.potonganTelat) : "-"}</td>
                    <td className={tdGreen}>{formatRupiah(Math.max(0, row.totalGaji))}</td>

                    {/* Aksi */}
                    <td className={tdBase}>
                      <button
                        onClick={() => openEdit(row)}
                        className="rounded-lg border border-[#d7ddf0] bg-white px-3 py-1.5 text-xs font-medium text-[#4338ca] hover:bg-[#f0f1fe] active:bg-[#e0e2fb]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Dialog */}
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e4e6f4] px-6 py-5">
              <h3 className="text-lg font-semibold text-[#1c2140]">{dialogTitle}</h3>
              <button
                onClick={closeDialog}
                className="rounded-full p-2 text-[#7176a0] hover:bg-[#f0f1fe]"
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
                <Field label="Karyawan (status Partime)">
                  <select
                    required
                    value={form.employeeId}
                    onChange={(e) => setField("employeeId", e.target.value)}
                    className={inputCls + " appearance-none"}
                  >
                    <option value="">Pilih karyawan partime...</option>
                    {availableEmployeeOptions.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <p className="rounded-xl bg-[#f2f3fb] px-4 py-3 text-[12px] leading-relaxed text-[#4a5480]">
                Gaji partime = <span className="font-semibold">(Insentif/Hari × 25)</span> + Tunjangan Jabatan +{" "}
                <span className="font-semibold">(Uang Makan/Hari × 25)</span> + Subsidi + BPJS − (Telat × Rp5.000).
                Isi <span className="font-semibold">nominal per hari</span> untuk Insentif & Uang Makan.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Insentif Kehadiran / Hari">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.insentifPerHari}
                    onChange={(e) => setField("insentifPerHari", formatNumericInput(e.target.value))}
                  />
                </Field>
                <Field label="Uang Makan / Hari">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.uangMakanPerHari}
                    onChange={(e) => setField("uangMakanPerHari", formatNumericInput(e.target.value))}
                  />
                </Field>
                <Field label="Tunjangan Jabatan">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.tunjanganJabatan}
                    onChange={(e) => setField("tunjanganJabatan", formatNumericInput(e.target.value))}
                  />
                </Field>
                <Field label="Subsidi">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.subsidi}
                    onChange={(e) => setField("subsidi", formatNumericInput(e.target.value))}
                  />
                </Field>
                <Field label="BPJS">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.bpjs}
                    onChange={(e) => setField("bpjs", formatNumericInput(e.target.value))}
                  />
                </Field>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="h-11 flex-1 rounded-xl border border-[#d7ddf0] text-sm font-semibold text-[#4338ca] hover:bg-[#f0f1fe]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-11 flex-1 rounded-xl bg-[#4f46e5] text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50"
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
