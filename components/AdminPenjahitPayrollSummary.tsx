"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { PenjahitComputedRow, PenjahitPayrollSummarySheet } from "@/app/admin/payroll-summary/penjahit/page";
import type { PayrollEmployeeOption } from "@/lib/payroll-admin";

type PeriodOption = { month: number; year: number; label: string };

type Props = {
  sheet: PenjahitPayrollSummarySheet | null;
  periodOptions: PeriodOption[];
  employeeOptions: PayrollEmployeeOption[];
};

type FormState = {
  employeeId: string;
  overrideGajiPokok: string;
  gajiPerDay: string;
  tunjanganJabatan: string;
  uangMakan: string;
  bpjs: string;
  bonusPerforma: string;
  potonganLainLain: string;
  overrideMasuk: string;
  overrideLembur: string;
  overrideIzin: string;
  overrideSakit: string;
  overrideSakitTanpaSurat: string;
  overrideSetengahHari: string;
  overrideKontrak: string;
  overridePinjaman: string;
};

type DialogState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; row: PenjahitComputedRow };

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNum(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
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
    overrideGajiPokok: "",
    gajiPerDay: "",
    tunjanganJabatan: "",
    uangMakan: "",
    bpjs: "",
    bonusPerforma: "",
    potonganLainLain: "",
    overrideMasuk: "",
    overrideLembur: "",
    overrideIzin: "",
    overrideSakit: "",
    overrideSakitTanpaSurat: "",
    overrideSetengahHari: "",
    overrideKontrak: "",
    overridePinjaman: "",
  };
}

function formFromRow(row: PenjahitComputedRow): FormState {
  const fv = (n: number) => (n > 0 ? formatNumericInput(String(n)) : "");
  const fo = (n: number | null) => (n !== null ? formatNumericInput(String(n)) : "");
  return {
    employeeId: String(row.employeeId),
    overrideGajiPokok: fo(row.inputOverrideGajiPokok),
    gajiPerDay: fv(row.inputGajiPerDay),
    tunjanganJabatan: fv(row.inputTunjanganJabatan),
    uangMakan: fv(row.inputUangMakan),
    bpjs: fv(row.inputBpjs),
    bonusPerforma: fv(row.inputBonusPerforma),
    potonganLainLain: fo(row.inputPotonganLainLain),
    overrideMasuk: fo(row.inputOverrideMasuk),
    overrideLembur: fo(row.inputOverrideLembur),
    overrideIzin: fo(row.inputOverrideIzin),
    overrideSakit: fo(row.inputOverrideSakit),
    overrideSakitTanpaSurat: fo(row.inputOverrideSakitTanpaSurat),
    overrideSetengahHari: fo(row.inputOverrideSetengahHari),
    overrideKontrak: fo(row.inputOverrideKontrak),
    overridePinjaman: fo(row.inputOverridePinjaman),
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
const thGroup =
  "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#5a3028] bg-[#fde8df] border border-[#ede0d8] text-center";
const thYellow =
  "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a6030] whitespace-nowrap border border-[#ede8b0] bg-[#fef9c3]";
const thYellowGroup =
  "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7a6030] bg-[#fef08a] border border-[#ede8b0] text-center";
const tdBase = "px-3 py-2.5 text-xs text-[#2d1b18] whitespace-nowrap border-b border-r border-[#f1e5de]";
const tdNum = `${tdBase} text-right tabular-nums`;
const tdRed = `${tdNum} text-red-600`;
const tdYellow = `${tdNum} bg-[#fefce8]`;
const tdYellowBold = `${tdNum} bg-[#fef08a] font-semibold`;
const tdGreen = `${tdNum} bg-[#f0fdf4] font-semibold`;

export default function AdminPenjahitPayrollSummary({ sheet, periodOptions, employeeOptions }: Props) {
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
    router.push(`/admin/payroll-summary/penjahit?${params.toString()}`);
  }

  function openAdd() {
    setForm(emptyForm());
    setError(null);
    setDialog({ open: true, mode: "add" });
  }

  function openEdit(row: PenjahitComputedRow) {
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
      overrideGajiPokok: form.overrideGajiPokok !== "" ? parseNumber(form.overrideGajiPokok) : null,
      gajiPerDay: parseNumber(form.gajiPerDay),
      tunjanganJabatan: parseNumber(form.tunjanganJabatan),
      uangMakan: parseNumber(form.uangMakan),
      subsidi: 0,
      uangKerajinan: 0,
      bpjs: parseNumber(form.bpjs),
      bonusPerforma: parseNumber(form.bonusPerforma),
      insentif: 0,
      uangTransport: 0,
      kendaraan: 0,
      perjalananDinasReimburse: 0,
      overrideMasuk: form.overrideMasuk !== "" ? parseNumber(form.overrideMasuk) : null,
      overrideLembur: form.overrideLembur !== "" ? parseNumber(form.overrideLembur) : null,
      overrideIzin: form.overrideIzin !== "" ? parseNumber(form.overrideIzin) : null,
      overrideSakit: form.overrideSakit !== "" ? parseNumber(form.overrideSakit) : null,
      overrideSakitTanpaSurat: form.overrideSakitTanpaSurat !== "" ? parseNumber(form.overrideSakitTanpaSurat) : null,
      overrideSetengahHari: form.overrideSetengahHari !== "" ? parseNumber(form.overrideSetengahHari) : null,
      overrideKontrak: form.overrideKontrak !== "" ? parseNumber(form.overrideKontrak) : null,
      overridePinjaman: form.overridePinjaman !== "" ? parseNumber(form.overridePinjaman) : null,
      overridePinjamanPribadi: form.potonganLainLain !== "" ? parseNumber(form.potonganLainLain) : null,
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

  const existingIds = new Set(sheet?.rows.map((r) => r.employeeId) ?? []);
  const availableEmployeeOptions = employeeOptions.filter((e) => !existingIds.has(e.employeeId));

  const currentPeriodValue = sheet ? `${sheet.periodMonth}-${sheet.periodYear}` : "";
  const dialogTitle =
    dialog.open && dialog.mode === "edit"
      ? `Edit Payroll — ${dialog.row.nama}`
      : "Tambah Payroll Penjahit";

  const totalNetAll = sheet?.rows.reduce((s, r) => s + r.penerimaanBersih, 0) ?? 0;
  const mingguanCount = sheet?.rows.filter((r) => r.tipePayroll === "mingguan").length ?? 0;
  const bulananCount = sheet?.rows.filter((r) => r.tipePayroll === "bulanan").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[32px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="flex flex-col gap-4 border-b border-[#eddad1] px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#f0d8d1] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
              Rekap Penjahit
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
              {sheet ? sheet.periodLabel : "Belum ada data"}
            </h3>
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
          <div className="grid grid-cols-2 gap-4 px-6 py-4 md:grid-cols-4">
            {[
              { label: "Total Penjahit", value: sheet.rows.length.toString() },
              { label: "Mingguan", value: mingguanCount.toString() },
              { label: "Bulanan", value: bulananCount.toString() },
              { label: "Total Penerimaan Bersih", value: formatRupiah(totalNetAll) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[#ead7ce] bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#a16f63]">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-[#241716]">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Empty state */}
      {!sheet || sheet.rows.length === 0 ? (
        <div className="rounded-[32px] border border-[#ead7ce] bg-white px-6 py-20 text-center shadow-sm">
          <p className="text-base font-semibold text-[#3b2723]">Belum ada data penjahit</p>
          <p className="mt-2 text-sm text-[#8a6f68]">
            Tidak ada data payroll penjahit pada periode ini.
          </p>
        </div>
      ) : (
        /* Main table */
        <section className="overflow-hidden rounded-[32px] border border-[#ead7ce] bg-white shadow-[0_8px_32px_rgba(96,45,34,0.06)]">
          <div className="overflow-x-auto">
            <table className="border-collapse text-left" style={{ minWidth: "3600px" }}>
              <thead>
                {/* Row 1 — group labels */}
                <tr>
                  <th className={thBase} rowSpan={2}>No</th>
                  <th className={thBase} rowSpan={2}>Nama</th>
                  <th className={thBase} rowSpan={2}>Jabatan</th>
                  <th className={thBase} rowSpan={2}>Divisi / Sub</th>
                  <th className={thBase} rowSpan={2}>Pembagian Rekapan</th>
                  <th className={thBase} rowSpan={2}>Departemen</th>
                  <th className={thBase} rowSpan={2}>Bank</th>
                  <th className={thBase} rowSpan={2}>No Rekening</th>
                  {/* Nominal Tetap */}
                  <th className={thGroup} colSpan={6}>Nominal Tetap</th>
                  {/* individual cols */}
                  <th className={thBase} rowSpan={2}>Bonus Performa</th>
                  <th className={thBase} rowSpan={2}>Hari Kerja</th>
                  <th className={thBase} rowSpan={2}>Masuk</th>
                  <th className={thBase} rowSpan={2}>Total Gaji Pokok</th>
                  <th className={thBase} rowSpan={2}>Uang Absensi</th>
                  <th className={thBase} rowSpan={2}>Kerajinan</th>
                  <th className={thGroup} colSpan={2}>Lembur</th>
                  <th className={thBase} rowSpan={2}>Izin</th>
                  <th className={thBase} rowSpan={2}>Sakit</th>
                  <th className={thBase} rowSpan={2}>Sakit Tanpa Surat</th>
                  <th className={thGroup} colSpan={2}>Setengah Hari</th>
                  <th className={thGroup} colSpan={2}>Telat</th>
                  <th
                    className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a6030] whitespace-nowrap border border-[#ede8b0] bg-[#fefce8]"
                    rowSpan={2}
                  >
                    Total Gaji Sblm Potongan
                  </th>
                  <th className={thBase} rowSpan={2}>Total Gaji</th>
                  <th className={thGroup} colSpan={6}>Potongan</th>
                  <th className={thGroup} colSpan={5}>Total Potongan</th>
                  <th
                    className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#14532d] whitespace-nowrap border border-[#bbf7d0] bg-[#dcfce7]"
                    rowSpan={2}
                  >
                    Penerimaan Bersih
                  </th>
                  <th className={thYellowGroup} colSpan={4}>Pencairan</th>
                  <th className={thBase} rowSpan={2}>Aksi</th>
                </tr>
                {/* Row 2 — sub-labels */}
                <tr>
                  {/* Nominal Tetap */}
                  <th className={thBase}>Gaji Pokok</th>
                  <th className={thBase}>Gaji/Hari</th>
                  <th className={thBase}>Tunjangan Jabatan</th>
                  <th className={thBase}>Uang Absensi/Hari</th>
                  <th className={thBase}>Uang Kerajinan</th>
                  <th className={thBase}>BPJS</th>
                  {/* Lembur */}
                  <th className={thBase}>Jam</th>
                  <th className={thBase}>Bonus</th>
                  {/* Setengah Hari */}
                  <th className={thBase}>Count</th>
                  <th className={thBase}>Potongan</th>
                  {/* Telat */}
                  <th className={thBase}>Count</th>
                  <th className={thBase}>Potongan</th>
                  {/* Potongan */}
                  <th className={thBase}>Kontrak</th>
                  <th className={thBase}>Pinj 1 (Tgl 8)</th>
                  <th className={thBase}>Pinj 2 (Tgl 16)</th>
                  <th className={thYellow}>Pinj 3 (Tgl 25)</th>
                  <th className={thBase}>Pinj 4 (Tgl 1)</th>
                  <th className={thBase}>Lain-Lain</th>
                  {/* Total Potongan */}
                  <th className={thBase}>Denda</th>
                  <th className={thBase}>Kontrak</th>
                  <th className={thBase}>Pinjaman</th>
                  <th className={thBase}>Lain-Lain</th>
                  <th className={thBase}>Total</th>
                  {/* Pencairan */}
                  <th className={thYellow}>Minggu 1 (Tgl 8)</th>
                  <th className={thYellow}>Minggu 2 (Tgl 16)</th>
                  <th
                    className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a6030] whitespace-nowrap border border-[#ede8b0] bg-[#fef08a]"
                  >
                    Minggu 3 (Tgl 25)
                  </th>
                  <th className={thYellow}>Minggu 4 (Tgl 1)</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, index) => {
                  const isMingguan = row.tipePayroll === "mingguan";
                  const totalPotongan =
                    row.potonganDenda + row.potonganKontrak + row.potonganPinjaman + row.potonganLainLain;
                  const pinj = row.cicilanPerMinggu;

                  return (
                    <tr key={row.payrollId} className="hover:bg-[#fffaf7]">
                      {/* Employee info */}
                      <td className={tdBase + " text-[#a16f63]"}>{index + 1}</td>
                      <td className={tdBase + " font-medium max-w-[160px] truncate"}>{row.nama}</td>
                      <td className={tdBase}>{row.jabatan}</td>
                      <td className={tdBase}>
                        {row.divisi}
                        {row.subDivisi ? ` / ${row.subDivisi}` : ""}
                      </td>
                      <td className={tdBase}>{row.pembagianRekapan || "-"}</td>
                      <td className={tdBase}>{row.departemen}</td>
                      <td className={tdBase}>{row.bank}</td>
                      <td className={tdBase}>{row.noRekening}</td>

                      {/* Nominal Tetap */}
                      <td className={tdNum}>{formatRupiah(row.gajiPokokMonthly)}</td>
                      <td className={tdNum}>{formatRupiah(row.gajiPokokPerHari)}</td>
                      <td className={tdNum}>{formatRupiah(row.tunjanganJabatan)}</td>
                      <td className={tdNum}>{formatRupiah(row.uangAbsensiPerHari)}</td>
                      <td className={tdNum}>{formatRupiah(row.uangKerajinanNominal)}</td>
                      <td className={tdNum}>{formatRupiah(row.bpjs)}</td>

                      {/* Bonus Performa */}
                      <td className={tdNum}>{formatRupiah(row.bonusPerforma)}</td>
                      {/* Hari Kerja */}
                      <td className={tdNum}>{row.hariKerja}</td>
                      {/* Masuk */}
                      <td className={tdNum}>{row.masuk}</td>
                      {/* Total Gaji Pokok */}
                      <td className={tdNum}>{formatRupiah(row.totalGajiPokok)}</td>
                      {/* Uang Absensi */}
                      <td className={tdNum}>{formatRupiah(row.uangAbsensiTotal)}</td>
                      {/* Kerajinan */}
                      <td className={tdNum}>{row.kerajinanEarned > 0 ? formatRupiah(row.kerajinanEarned) : "-"}</td>
                      {/* Lembur */}
                      <td className={tdNum}>{formatNum(row.lemburJam)}</td>
                      <td className={tdNum}>{row.bonusLembur > 0 ? formatRupiah(row.bonusLembur) : "-"}</td>
                      {/* Izin */}
                      <td className={tdNum}>{row.izin}</td>
                      {/* Sakit */}
                      <td className={tdNum}>{row.sakit}</td>
                      {/* Sakit Tanpa Surat */}
                      <td className={tdNum}>{row.sakitTanpaSurat}</td>
                      {/* Setengah Hari */}
                      <td className={tdNum}>{row.setengahHari}</td>
                      <td className={tdRed}>{row.potonganSetengahHari > 0 ? formatRupiah(row.potonganSetengahHari) : "-"}</td>
                      {/* Telat */}
                      <td className={tdNum}>{row.telat}</td>
                      <td className={tdRed}>{row.potonganTelat > 0 ? formatRupiah(row.potonganTelat) : "-"}</td>

                      {/* Total Gaji Sebelum Potongan */}
                      <td className={tdYellow}>{formatRupiah(row.totalGajiSebelumPotongan)}</td>
                      {/* Total Gaji */}
                      <td className={tdNum}>{formatRupiah(row.totalGaji)}</td>

                      {/* Potongan */}
                      <td className={tdRed}>{row.potonganKontrak > 0 ? formatRupiah(row.potonganKontrak) : "-"}</td>
                      {/* Pinj 1,2,3,4 — for mingguan each = cicilanPerMinggu; for bulanan show "-" */}
                      <td className={tdRed}>{isMingguan && pinj > 0 ? formatRupiah(pinj) : "-"}</td>
                      <td className={tdRed}>{isMingguan && pinj > 0 ? formatRupiah(pinj) : "-"}</td>
                      <td className={`${tdRed} bg-[#fefce8]`}>{isMingguan && pinj > 0 ? formatRupiah(pinj) : "-"}</td>
                      <td className={tdRed}>
                        {isMingguan
                          ? pinj > 0 ? formatRupiah(pinj) : "-"
                          : row.potonganPinjaman > 0 ? formatRupiah(row.potonganPinjaman) : "-"}
                      </td>
                      <td className={tdRed}>{row.potonganLainLain > 0 ? formatRupiah(row.potonganLainLain) : "-"}</td>

                      {/* Total Potongan */}
                      <td className={tdRed}>{row.potonganDenda > 0 ? formatRupiah(row.potonganDenda) : "-"}</td>
                      <td className={tdRed}>{row.potonganKontrak > 0 ? formatRupiah(row.potonganKontrak) : "-"}</td>
                      <td className={tdRed}>{row.potonganPinjaman > 0 ? formatRupiah(row.potonganPinjaman) : "-"}</td>
                      <td className={tdRed}>{row.potonganLainLain > 0 ? formatRupiah(row.potonganLainLain) : "-"}</td>
                      <td className={tdRed + " font-semibold"}>{totalPotongan > 0 ? formatRupiah(totalPotongan) : "-"}</td>

                      {/* Penerimaan Bersih */}
                      <td className={tdGreen}>{formatRupiah(Math.max(0, row.penerimaanBersih))}</td>

                      {/* Pencairan */}
                      {isMingguan && row.pencairan ? (
                        <>
                          <td className={tdYellow}>{formatRupiah(Math.max(0, row.pencairan.minggu1))}</td>
                          <td className={tdYellow}>{formatRupiah(Math.max(0, row.pencairan.minggu2))}</td>
                          <td className={tdYellowBold}>{formatRupiah(Math.max(0, row.pencairan.minggu3))}</td>
                          <td className={tdYellow}>{formatRupiah(Math.max(0, row.pencairan.minggu4))}</td>
                        </>
                      ) : (
                        <td
                          className={`${tdBase} text-center font-medium text-[#a16f63]`}
                          colSpan={4}
                        >
                          TIDAK ADA
                        </td>
                      )}

                      {/* Aksi */}
                      <td className={tdBase}>
                        <button
                          onClick={() => openEdit(row)}
                          className="rounded-lg border border-[#ead7ce] bg-white px-3 py-1.5 text-xs font-medium text-[#8f1d22] hover:bg-[#fff2ec] active:bg-[#fde8df]"
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
                    <option value="">Pilih karyawan penjahit...</option>
                    {availableEmployeeOptions.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#a16f63]">
                Nominal Tetap
              </p>
              <Field label="Gaji Pokok (Bulanan)">
                <input
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="0"
                  value={form.overrideGajiPokok}
                  onChange={(e) => setField("overrideGajiPokok", formatNumericInput(e.target.value))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gaji Pokok/Hari">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.gajiPerDay}
                    onChange={(e) => setField("gajiPerDay", formatNumericInput(e.target.value))}
                  />
                </Field>
                <Field label="Tunjangan Jabatan">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.tunjanganJabatan}
                    onChange={(e) =>
                      setField("tunjanganJabatan", formatNumericInput(e.target.value))
                    }
                  />
                </Field>
                <Field label="Uang Absensi/Hari">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.uangMakan}
                    onChange={(e) => setField("uangMakan", formatNumericInput(e.target.value))}
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
                <Field label="Bonus Performa">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.bonusPerforma}
                    onChange={(e) => setField("bonusPerforma", formatNumericInput(e.target.value))}
                  />
                </Field>
              </div>

              <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#a16f63]">
                Potongan Tambahan
              </p>
              <Field label="Potongan Lain-Lain">
                <input
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="0 (kosongkan jika tidak ada)"
                  value={form.potonganLainLain}
                  onChange={(e) => setField("potonganLainLain", formatNumericInput(e.target.value))}
                />
              </Field>

              <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#a16f63]">
                Override Data (opsional — kosongkan = dari sistem)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Override Masuk">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overrideMasuk}
                    onChange={(e) => setField("overrideMasuk", digitsOnly(e.target.value))}
                  />
                </Field>
                <Field label="Override Lembur (jam)">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overrideLembur}
                    onChange={(e) => setField("overrideLembur", digitsOnly(e.target.value))}
                  />
                </Field>
                <Field label="Override Izin">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overrideIzin}
                    onChange={(e) => setField("overrideIzin", digitsOnly(e.target.value))}
                  />
                </Field>
                <Field label="Override Sakit">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overrideSakit}
                    onChange={(e) => setField("overrideSakit", digitsOnly(e.target.value))}
                  />
                </Field>
                <Field label="Override Sakit Tanpa Surat">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overrideSakitTanpaSurat}
                    onChange={(e) =>
                      setField("overrideSakitTanpaSurat", digitsOnly(e.target.value))
                    }
                  />
                </Field>
                <Field label="Override Setengah Hari">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overrideSetengahHari}
                    onChange={(e) => setField("overrideSetengahHari", digitsOnly(e.target.value))}
                  />
                </Field>
                <Field label="Override Potongan Kontrak">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overrideKontrak}
                    onChange={(e) => setField("overrideKontrak", formatNumericInput(e.target.value))}
                  />
                </Field>
                <Field label="Override Potongan Pinjaman">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="—"
                    value={form.overridePinjaman}
                    onChange={(e) =>
                      setField("overridePinjaman", formatNumericInput(e.target.value))
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
