"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { PayrollEmployeeOption, PayrollOmzetPeriod, PayrollPeriodOption } from "@/lib/payroll-admin";
import type { AdminPayrollSummarySheet, AdminPayrollSummarySheetRow } from "@/lib/payroll-summary";

type Props = {
  sheet: AdminPayrollSummarySheet | null;
  employeeOptions: PayrollEmployeeOption[];
  omzetPeriod: PayrollOmzetPeriod;
  periodOptions: PayrollPeriodOption[];
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
  overrideMasuk: string;
  overrideLembur: string;
  overrideIzin: string;
  overrideSakit: string;
  overrideSakitTanpaSurat: string;
  overrideSetengahHari: string;
  overrideKontrak: string;
  overridePinjaman: string;
  overridePinjamanPribadi: string;
  overrideGajiPokok: string;
};

const inputClassName = "h-12 w-full rounded-2xl border border-[#d5e9ea] bg-white px-4 text-[#173033] outline-none placeholder:text-[#87a6a8] focus:border-[#19d7df] focus:shadow-[0_0_0_4px_rgba(25,215,223,0.16)]";
const selectClassName = `${inputClassName} appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23055a61' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:18px_18px] bg-[right_1rem_center] bg-no-repeat pr-11`;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: Number.isInteger(value) ? 0 : 1, maximumFractionDigits: 2 }).format(value);
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

function emptyForm(employeeId = ""): FormState {
  return { employeeId, gajiPerDay: "", tunjanganJabatan: "", uangMakan: "", subsidi: "", uangKerajinan: "", bpjs: "", bonusPerforma: "", insentif: "", uangTransport: "", overrideMasuk: "", overrideLembur: "", overrideIzin: "", overrideSakit: "", overrideSakitTanpaSurat: "", overrideSetengahHari: "", overrideKontrak: "", overridePinjaman: "", overridePinjamanPribadi: "", overrideGajiPokok: "" };
}

function formatFormValue(value: number) {
  return value > 0 ? formatNumericInput(String(value)) : "";
}

function formatOverrideValue(value: number | null) {
  return value !== null ? formatNumericInput(String(value)) : "";
}

function buildFormFromRow(row: AdminPayrollSummarySheetRow): FormState {
  return {
    employeeId: String(row.employeeId),
    gajiPerDay: formatFormValue(row.inputGajiPerDay),
    tunjanganJabatan: formatFormValue(row.inputTunjanganJabatan),
    uangMakan: formatFormValue(row.inputUangMakan),
    subsidi: formatFormValue(row.inputSubsidi),
    uangKerajinan: formatFormValue(row.inputUangKerajinan),
    bpjs: formatFormValue(row.inputBpjs),
    bonusPerforma: formatFormValue(row.inputBonusPerforma),
    insentif: formatFormValue(row.inputInsentif),
    uangTransport: formatFormValue(row.inputUangTransport),
    overrideMasuk: formatOverrideValue(row.inputOverrideMasuk),
    overrideLembur: formatOverrideValue(row.inputOverrideLembur),
    overrideIzin: formatOverrideValue(row.inputOverrideIzin),
    overrideSakit: formatOverrideValue(row.inputOverrideSakit),
    overrideSakitTanpaSurat: formatOverrideValue(row.inputOverrideSakitTanpaSurat),
    overrideSetengahHari: formatOverrideValue(row.inputOverrideSetengahHari),
    overrideKontrak: formatOverrideValue(row.inputOverrideKontrak),
    overridePinjaman: formatOverrideValue(row.inputOverridePinjaman),
    overridePinjamanPribadi: formatOverrideValue(row.inputOverridePinjamanPribadi),
    overrideGajiPokok: formatOverrideValue(row.inputOverrideGajiPokok),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2"><span className="text-[13px] font-semibold text-[#466668]">{label}</span>{children}</label>;
}

export default function AdminPayrollSummaryManager({ sheet, employeeOptions, omzetPeriod, periodOptions }: Props) {
  const router = useRouter();
  const [isPayrollPending, startPayrollTransition] = useTransition();
  const [isOmzetPending, startOmzetTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [editingPayrollId, setEditingPayrollId] = useState<number | null>(null);
  const [payrollMessage, setPayrollMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [omzetMessage, setOmzetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(`${omzetPeriod.periodYear}-${String(omzetPeriod.periodMonth).padStart(2, "0")}`);
  const [totalOmzet, setTotalOmzet] = useState(formatNumericInput(String(omzetPeriod.totalOmzet)));
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [searchQuery, setSearchQuery] = useState("");

  const [periodYear, periodMonth] = useMemo(() => {
    const [year, month] = selectedPeriod.split("-");
    return [Number(year), Number(month)];
  }, [selectedPeriod]);

  const selectedEmployee = useMemo(() => employeeOptions.find((employee) => employee.employeeId === Number(form.employeeId)) ?? null, [employeeOptions, form.employeeId]);
  const isSales = selectedEmployee?.isSales ?? false;
  const omzetBonus = parseNumber(totalOmzet) * 0.005;
  const displayedRange = sheet?.rangeLabel ?? `Periode ${periodOptions.find((item) => `${item.year}-${String(item.month).padStart(2, "0")}` === selectedPeriod)?.label ?? "aktif"}`;

  const filteredRows = useMemo(() => {
    if (!sheet) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sheet.rows;
    return sheet.rows.filter((row) =>
      [row.name, row.role, row.division, row.recapGroup, row.department].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [sheet, searchQuery]);

  const savedEmployeeIds = useMemo(
    () => new Set(sheet?.rows.map((row) => row.employeeId) ?? []),
    [sheet],
  );

  const availableEmployeeOptions = useMemo(
    () => editingPayrollId
      ? employeeOptions
      : employeeOptions.filter((emp) => !savedEmployeeIds.has(emp.employeeId)),
    [employeeOptions, savedEmployeeIds, editingPayrollId],
  );

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm(nextEmployeeId?: string) {
    setEditingPayrollId(null);
    setForm(emptyForm(nextEmployeeId ?? ""));
  }

  function handlePeriodChange(value: string) {
    setSelectedPeriod(value);
    setEditingPayrollId(null);
    setPayrollMessage(null);
    setOmzetMessage(null);
    const [year, month] = value.split("-");
    router.push(`/admin/payroll-summary?month=${month}&year=${year}`);
  }

  function handleEditRow(row: AdminPayrollSummarySheetRow) {
    setEditingPayrollId(row.id);
    setPayrollMessage(null);
    setForm(buildFormFromRow(row));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleteRow(payrollId: number) {
    const targetRow = sheet?.rows.find((row) => row.id === payrollId);
    if (!targetRow || !window.confirm(`Hapus payroll ${targetRow.name} untuk periode ini?`)) return;
    startDeleteTransition(async () => {
      try {
        const response = await fetch(`/api/admin/payroll-summary/${payrollId}`, { method: "DELETE" });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message || "Gagal menghapus payroll.");
        if (editingPayrollId === payrollId) resetForm();
        setPayrollMessage({ type: "success", text: result.message || "Payroll berhasil dihapus." });
        router.refresh();
      } catch (error) {
        setPayrollMessage({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus payroll." });
      }
    });
  }

  async function handlePayrollSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayrollMessage(null);
    const payload = {
      action: "save_payroll", month: periodMonth, year: periodYear, employeeId: Number(form.employeeId),
      gajiPerDay: parseNumber(form.gajiPerDay), tunjanganJabatan: parseNumber(form.tunjanganJabatan),
      uangMakan: parseNumber(form.uangMakan), subsidi: parseNumber(form.subsidi), uangKerajinan: parseNumber(form.uangKerajinan),
      bpjs: parseNumber(form.bpjs), bonusPerforma: parseNumber(form.bonusPerforma), insentif: parseNumber(form.insentif), uangTransport: parseNumber(form.uangTransport),
      overrideMasuk: form.overrideMasuk !== "" ? parseNumber(form.overrideMasuk) : null,
      overrideLembur: form.overrideLembur !== "" ? parseNumber(form.overrideLembur) : null,
      overrideIzin: form.overrideIzin !== "" ? parseNumber(form.overrideIzin) : null,
      overrideSakit: form.overrideSakit !== "" ? parseNumber(form.overrideSakit) : null,
      overrideSakitTanpaSurat: form.overrideSakitTanpaSurat !== "" ? parseNumber(form.overrideSakitTanpaSurat) : null,
      overrideSetengahHari: form.overrideSetengahHari !== "" ? parseNumber(form.overrideSetengahHari) : null,
      overrideKontrak: form.overrideKontrak !== "" ? parseNumber(form.overrideKontrak) : null,
      overridePinjaman: form.overridePinjaman !== "" ? parseNumber(form.overridePinjaman) : null,
      overridePinjamanPribadi: form.overridePinjamanPribadi !== "" ? parseNumber(form.overridePinjamanPribadi) : null,
      overrideGajiPokok: form.overrideGajiPokok !== "" ? parseNumber(form.overrideGajiPokok) : null,
    };
    startPayrollTransition(async () => {
      try {
        const response = await fetch("/api/admin/payroll-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message || "Gagal menyimpan payroll.");
        resetForm();
        setPayrollMessage({ type: "success", text: result.message || "Payroll berhasil disimpan." });
        router.refresh();
      } catch (error) {
        setPayrollMessage({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan payroll." });
      }
    });
  }

  async function handleOmzetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOmzetMessage(null);
    startOmzetTransition(async () => {
      try {
        const response = await fetch("/api/admin/payroll-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_omzet", month: periodMonth, year: periodYear, totalOmzet: parseNumber(totalOmzet) }) });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message || "Gagal menyimpan total omzet.");
        setOmzetMessage({ type: "success", text: result.message || "Total omzet berhasil disimpan." });
        router.refresh();
      } catch (error) {
        setOmzetMessage({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan total omzet." });
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_180px] md:items-end md:justify-between">
          <Field label="Periode History Payroll">
            <select value={selectedPeriod} onChange={(event) => handlePeriodChange(event.target.value)} className={selectClassName}>
              {periodOptions.map((option) => <option key={`${option.year}-${option.month}`} value={`${option.year}-${String(option.month).padStart(2, "0")}`}>{option.label}</option>)}
            </select>
          </Field>
          <div className="rounded-[22px] bg-[#f5fbfb] px-4 py-3 text-sm text-[#47696b]">Cek histori payroll dan omzet per bulan langsung dari dropdown periode.</div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handlePayrollSubmit} className="rounded-[32px] border border-[#cfeaec] bg-[linear-gradient(180deg,#f9ffff_0%,#f2fcfc_100%)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0c8087]">Input Payroll</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#123336]">Form Payroll Admin</h2>
              <p className="mt-2 text-sm text-[#628083]">Pilih nama karyawan, lalu isi komponen payroll per karyawan.</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isSales ? "bg-[#fff1d8] text-[#8a5d00]" : "bg-[#dff7f8] text-[#0b6670]"}`}>{isSales ? "Sales" : "Non Sales"}</div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Nama Karyawan">
              <select value={form.employeeId} onChange={(event) => updateField("employeeId", event.target.value)} className={selectClassName} required>
                <option value="">Pilih karyawan</option>
                {availableEmployeeOptions.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.name} - {employee.role}</option>)}
              </select>
            </Field>
            {!editingPayrollId && savedEmployeeIds.size > 0 && employeeOptions.length > availableEmployeeOptions.length ? (
              <p className="text-xs text-[#87a6a8]">Karyawan yang sudah memiliki payroll periode ini tidak ditampilkan.</p>
            ) : null}

            {selectedEmployee ? <div className="mt-1 rounded-[24px] border border-[#d5e9ea] bg-white px-5 py-5 text-sm text-[#35585b]"><p className="font-semibold text-[#19393d]">{selectedEmployee.name}</p><p className="mt-2">{selectedEmployee.role} | {selectedEmployee.division} | {selectedEmployee.department}</p><p className="mt-2">Pembagian rekapan: {selectedEmployee.recapGroup}</p></div> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Gaji Pokok Perhari / Perjam"><input value={form.gajiPerDay} onChange={(event) => updateField("gajiPerDay", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="Tunjangan Jabatan"><input value={form.tunjanganJabatan} onChange={(event) => updateField("tunjanganJabatan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="Uang Makan"><input value={form.uangMakan} onChange={(event) => updateField("uangMakan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="Subsidi"><input value={form.subsidi} onChange={(event) => updateField("subsidi", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="Uang Kerajinan"><input value={form.uangKerajinan} onChange={(event) => updateField("uangKerajinan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <Field label="BPJS"><input value={form.bpjs} onChange={(event) => updateField("bpjs", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              {isSales ? <><Field label="Insentif"><input value={form.insentif} onChange={(event) => updateField("insentif", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field><Field label="Uang Transport"><input value={form.uangTransport} onChange={(event) => updateField("uangTransport", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field></> : <Field label="Bonus Performa"><input value={form.bonusPerforma} onChange={(event) => updateField("bonusPerforma", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>}
              <Field label="Gaji Pokok (Bulanan)"><input value={form.overrideGajiPokok} onChange={(event) => updateField("overrideGajiPokok", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" /></Field>
            </div>

            <div className="mt-8">
              <p className="mb-4 text-sm font-semibold text-[#123336]">Override Kehadiran (Opsional, kosongkan jika ingin menggunakan data sistem)</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Masuk (Hari)"><input value={form.overrideMasuk} onChange={(event) => updateField("overrideMasuk", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                <Field label="Lembur (Jam)"><input value={form.overrideLembur} onChange={(event) => updateField("overrideLembur", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                <Field label="Izin / Off (Hari)"><input value={form.overrideIzin} onChange={(event) => updateField("overrideIzin", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                <Field label="Sakit (Hari)"><input value={form.overrideSakit} onChange={(event) => updateField("overrideSakit", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                <Field label="Sakit Tanpa Surat (Hari)"><input value={form.overrideSakitTanpaSurat} onChange={(event) => updateField("overrideSakitTanpaSurat", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                <Field label="1/2 Hari (Hari)"><input value={form.overrideSetengahHari} onChange={(event) => updateField("overrideSetengahHari", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
              </div>
            </div>

            <div className="mt-8">
              <p className="mb-4 text-sm font-semibold text-[#123336]">Override Potongan (Opsional, kosongkan jika ingin menggunakan data sistem)</p>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Kontrak"><input value={form.overrideKontrak} onChange={(event) => updateField("overrideKontrak", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                <Field label="Pinjaman Perusahaan"><input value={form.overridePinjaman} onChange={(event) => updateField("overridePinjaman", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                <Field label="Pinjaman Pribadi"><input value={form.overridePinjamanPribadi} onChange={(event) => updateField("overridePinjamanPribadi", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
              </div>
            </div>
          </div>

          {editingPayrollId ? <div className="mt-5 rounded-2xl bg-[#fff5e8] px-4 py-3 text-sm text-[#875100]">Mode edit aktif. Hanya field input payroll di form yang bisa diubah; kolom hasil hitung tetap mengikuti sistem untuk periode {periodMonth}/{periodYear}.</div> : null}
          {payrollMessage ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${payrollMessage.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"}`}>{payrollMessage.text}</div> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={isPayrollPending || !form.employeeId} className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0d7f86] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isPayrollPending ? "Menyimpan..." : editingPayrollId ? "Update Payroll" : "Simpan Payroll"}</button>
            {editingPayrollId ? <button type="button" onClick={() => resetForm()} className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#cfeaec] bg-white px-6 text-sm font-semibold text-[#35585b]">Batal Edit</button> : null}
          </div>
        </form>

        <div className="space-y-4">
          <form onSubmit={handleOmzetSubmit} className="rounded-[32px] border border-[#cfeaec] bg-[linear-gradient(180deg,#f9ffff_0%,#f2fcfc_100%)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0c8087]">Total Omzet</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#123336]">Input Omzet Bulanan</h2>
            <p className="mt-2 text-sm text-[#628083]">Diisi satu kali per periode payroll, lalu bisa diupdate bila perlu.</p>
            <div className="mt-6 space-y-4">
              <Field label="Total Omzet Periode Terpilih"><input value={totalOmzet} onChange={(event) => setTotalOmzet(formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
              <div className="rounded-[24px] border border-[#d5e9ea] bg-white px-4 py-4 text-sm text-[#35585b]"><p className="text-[13px] font-semibold text-[#466668]">Bonus Omzet Periode Terpilih</p><p className="mt-2 text-2xl font-semibold text-[#123336]">{formatCurrency(omzetBonus)}</p></div>
            </div>
            {omzetPeriod.isLocked ? <div className="mt-5 rounded-2xl bg-[#edf6f6] px-4 py-3 text-sm text-[#446568]">Total omzet periode ini sudah ada. Anda bisa update nominalnya kapan saja.</div> : null}
            {omzetMessage ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${omzetMessage.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"}`}>{omzetMessage.text}</div> : null}
            <div className="mt-6 flex gap-3">
              <button type="submit" disabled={isOmzetPending} className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#19d7df] px-6 text-sm font-semibold text-[#083438] disabled:cursor-not-allowed disabled:opacity-60">{isOmzetPending ? "Menyimpan..." : omzetPeriod.isLocked ? "Update Omzet" : "Simpan Omzet"}</button>
            </div>
          </form>

          <section className="grid gap-4">
            <article className="rounded-[30px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)] px-6 py-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Periode Payroll</p><h2 className="mt-3 text-2xl font-semibold text-[#241716]">{periodOptions.find((item) => `${item.year}-${String(item.month).padStart(2, "0")}` === selectedPeriod)?.label ?? "-"}</h2><p className="mt-2 text-sm text-[#7a6059]">Rentang absensi {displayedRange}</p></article>
          </section>
        </div>
      </section>

      {sheet ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Karyawan</p><p className="mt-2 text-3xl font-semibold text-[#241716]">{filteredRows.length}{filteredRows.length !== sheet.rows.length ? <span className="ml-1 text-base text-[#a16f63]">/ {sheet.rows.length}</span> : null}</p></article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Total Potongan</p><p className="mt-2 text-3xl font-semibold text-[#241716]">{formatCurrency(sheet.totalDeduction)}</p></article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Penerimaan Bersih</p><p className="mt-2 text-3xl font-semibold text-[#241716]">{formatCurrency(sheet.totalNetIncome)}</p></article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Range</p><p className="mt-2 text-lg font-semibold text-[#241716]">{displayedRange}</p></article>
          </section>

          <div className="overflow-hidden rounded-[32px] border border-[#d9efef] bg-white">
            <div className="flex items-center gap-3 border-b border-[#d9efef] px-5 py-4">
              <svg className="shrink-0 text-[#3bbfc6]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, jabatan, divisi, departemen..."
                className="w-full bg-transparent text-sm text-[#1d3f42] outline-none placeholder:text-[#87a6a8]"
              />
              {searchQuery ? <button type="button" onClick={() => setSearchQuery("")} className="shrink-0 text-xs font-semibold text-[#a16f63] hover:text-[#7a3f35]">Hapus</button> : null}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[3960px] border-collapse text-left text-sm text-[#1d1d1d]">
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
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Aksi</th>
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
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={99} className="px-6 py-8 text-center text-sm text-[#87a6a8]">Tidak ada data yang cocok dengan pencarian.</td></tr>
                  ) : filteredRows.map((row) => (
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
                      <td className="border border-[#d7ecee] px-3 py-3">
                        <div className="flex min-w-[140px] gap-2">
                          <button type="button" onClick={() => handleEditRow(row)} className="inline-flex h-9 items-center justify-center rounded-xl border border-[#0d7f86] px-3 text-xs font-semibold text-[#0d7f86]">Edit</button>
                          <button type="button" onClick={() => handleDeleteRow(row.id)} disabled={isDeletePending} className="inline-flex h-9 items-center justify-center rounded-xl bg-[#8f1d22] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isDeletePending ? "Proses..." : "Hapus"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[32px] border border-[#ead7ce] bg-white px-6 py-10 text-sm text-[#7a6059]">Belum ada payroll tersimpan untuk periode yang dipilih.</div>
      )}
    </div>
  );
}
