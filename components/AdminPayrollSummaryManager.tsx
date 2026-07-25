"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { PAYROLL_OMZET_BONUS_RATE } from "@/lib/payroll-constants";
import type { PayrollEmployeeOption, PayrollOmzetPeriod, PayrollPeriodOption } from "@/lib/payroll-admin";
import type { AdminPayrollSummarySheet, AdminPayrollSummarySheetRow } from "@/lib/payroll-summary";
import { isSalesNasionalRole } from "@/lib/sales-roles";
import { useConfirm } from "@/components/ConfirmDialog";

type Props = {
  sheet: AdminPayrollSummarySheet | null;
  employeeOptions: PayrollEmployeeOption[];
  omzetPeriod: PayrollOmzetPeriod;
  periodOptions: PayrollPeriodOption[];
  basePath?: string;
  variant?: "default" | "sales-nasional";
  canEdit?: boolean;
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
  kendaraan: string;
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
  freelanceRateType: "per_hari" | "per_jam";
  gajiPerJam: string;
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
  return { employeeId, gajiPerDay: "", tunjanganJabatan: "", uangMakan: "", subsidi: "", uangKerajinan: "", bpjs: "", bonusPerforma: "", insentif: "", uangTransport: "", kendaraan: "", overrideMasuk: "", overrideLembur: "", overrideIzin: "", overrideSakit: "", overrideSakitTanpaSurat: "", overrideSetengahHari: "", overrideKontrak: "", overridePinjaman: "", overridePinjamanPribadi: "", overrideGajiPokok: "", freelanceRateType: "per_hari", gajiPerJam: "" };
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
    kendaraan: formatFormValue(row.inputKendaraan),
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
    freelanceRateType: row.freelanceRateType ?? "per_hari",
    gajiPerJam: formatFormValue(row.inputGajiPerJam),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="block text-[13px] font-semibold text-[#466668]">{label}</span>{children}</label>;
}

export default function AdminPayrollSummaryManager({
  sheet,
  employeeOptions,
  omzetPeriod,
  periodOptions,
  basePath = "/admin/payroll-summary",
  variant = "default",
  canEdit = true,
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPayrollPending, startPayrollTransition] = useTransition();
  const [isOmzetPending, startOmzetTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [editingPayrollId, setEditingPayrollId] = useState<number | null>(null);
  const [payrollMessage, setPayrollMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [omzetMessage, setOmzetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(`${omzetPeriod.periodYear}-${String(omzetPeriod.periodMonth).padStart(2, "0")}`);
  const [omzetInputs, setOmzetInputs] = useState(() =>
    omzetPeriod.units.map((unit) => ({
      unit: unit.unit,
      label: unit.label,
      totalOmzet: formatNumericInput(String(unit.totalOmzet)),
      isCustomBonus: unit.isCustomBonus,
    })),
  );
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [searchQuery, setSearchQuery] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingFinance, setIsExportingFinance] = useState(false);
  const [absensiEditRow, setAbsensiEditRow] = useState<AdminPayrollSummarySheetRow | null>(null);
  const [absensiValue, setAbsensiValue] = useState("");
  const [isAbsensiPending, startAbsensiTransition] = useTransition();

  const [periodYear, periodMonth] = useMemo(() => {
    const [year, month] = selectedPeriod.split("-");
    return [Number(year), Number(month)];
  }, [selectedPeriod]);

  useEffect(() => {
    setOmzetInputs(
      omzetPeriod.units.map((unit) => ({
        unit: unit.unit,
        label: unit.label,
        totalOmzet: formatNumericInput(String(unit.totalOmzet)),
        isCustomBonus: unit.isCustomBonus,
      })),
    );
  }, [omzetPeriod]);

  const selectedEmployee = useMemo(() => employeeOptions.find((employee) => employee.employeeId === Number(form.employeeId)) ?? null, [employeeOptions, form.employeeId]);
  const isSales = selectedEmployee?.isSales ?? false;
  const isSalesNasional = isSalesNasionalRole(selectedEmployee?.role);
  const isFreelance = (selectedEmployee?.employmentStatus ?? "").trim().toLowerCase() === "freelance";
  const isSalesNasionalSummary = variant === "sales-nasional";
  const bonusOmzetPerUnit = useMemo(
    () => omzetInputs.map((item) => {
      const value = parseNumber(item.totalOmzet);
      return {
        unit: item.unit,
        label: item.label,
        bonus: item.isCustomBonus ? value : value * PAYROLL_OMZET_BONUS_RATE,
      };
    }),
    [omzetInputs],
  );
  const selectedPeriodLabel = useMemo(() => {
    if (Number.isFinite(periodMonth) && Number.isFinite(periodYear) && periodMonth >= 1 && periodMonth <= 12) {
      return new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date(periodYear, periodMonth - 1, 1));
    }
    return periodOptions.find((item) => `${item.year}-${String(item.month).padStart(2, "0")}` === selectedPeriod)?.label ?? "-";
  }, [periodMonth, periodYear, periodOptions, selectedPeriod]);
  const displayedRange = sheet?.rangeLabel ?? `Periode ${selectedPeriodLabel}`;

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

  // Baris yang sedang diedit → untuk menampilkan nilai EFEKTIF setelah kenaikan gaji tahunan.
  // Field input tetap menyimpan BASELINE (mis. 50.000) supaya kenaikan otomatis tidak dobel
  // saat disimpan ulang; nilai efektif (mis. 54.000) hanya ditampilkan sebagai info.
  const editingRow =
    editingPayrollId != null ? sheet?.rows.find((row) => row.id === editingPayrollId) ?? null : null;
  const raiseInfo = editingRow
    ? {
        hasRaise: editingRow.dailyBaseSalary > (editingRow.inputGajiPerDay ?? 0),
        effectiveDaily: editingRow.dailyBaseSalary,
        effectiveMonthly: editingRow.monthlyBaseSalary,
        hasOverride: (editingRow.inputOverrideGajiPokok ?? 0) > 0,
      }
    : null;

  const availableEmployeeOptions = useMemo(
    () => editingPayrollId
      ? employeeOptions
      : employeeOptions.filter((emp) => !savedEmployeeIds.has(emp.employeeId)),
    [employeeOptions, savedEmployeeIds, editingPayrollId],
  );

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleEmployeeChange(employeeId: string) {
    setForm((current) => ({ ...current, employeeId }));
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
    router.push(`${basePath}?month=${month}&year=${year}`);
  }

  function handleEditRow(row: AdminPayrollSummarySheetRow) {
    setEditingPayrollId(row.id);
    setPayrollMessage(null);
    setForm(buildFormFromRow(row));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteRow(payrollId: number) {
    const targetRow = sheet?.rows.find((row) => row.id === payrollId);
    if (!targetRow) return;
    const ok = await confirm({
      tone: "danger",
      title: "Hapus payroll karyawan?",
      description: `Data payroll ${targetRow.name} untuk periode ini akan dihapus permanen.`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
    });
    if (!ok) return;
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
      gajiPerDay: isFreelance
        ? (form.freelanceRateType === "per_hari" ? parseNumber(form.gajiPerDay) : 0)
        : (isSalesNasionalSummary ? 0 : parseNumber(form.gajiPerDay)),
      tunjanganJabatan: isFreelance ? 0 : parseNumber(form.tunjanganJabatan),
      uangMakan: isFreelance ? 0 : parseNumber(form.uangMakan),
      subsidi: isFreelance ? 0 : parseNumber(form.subsidi),
      uangKerajinan: isFreelance ? 0 : parseNumber(form.uangKerajinan),
      bpjs: isFreelance ? 0 : parseNumber(form.bpjs),
      bonusPerforma: isFreelance ? 0 : parseNumber(form.bonusPerforma),
      insentif: isFreelance ? 0 : parseNumber(form.insentif),
      uangTransport: isFreelance ? 0 : parseNumber(form.uangTransport),
      kendaraan: isFreelance ? 0 : parseNumber(form.kendaraan),
      perjalananDinasReimburse: 0,
      overrideMasuk: isFreelance ? null : (form.overrideMasuk !== "" ? parseNumber(form.overrideMasuk) : null),
      overrideLembur: isFreelance ? null : (form.overrideLembur !== "" ? parseNumber(form.overrideLembur) : null),
      overrideIzin: isFreelance ? null : (form.overrideIzin !== "" ? parseNumber(form.overrideIzin) : null),
      overrideSakit: isFreelance ? null : (form.overrideSakit !== "" ? parseNumber(form.overrideSakit) : null),
      overrideSakitTanpaSurat: isFreelance ? null : (form.overrideSakitTanpaSurat !== "" ? parseNumber(form.overrideSakitTanpaSurat) : null),
      overrideSetengahHari: isFreelance ? null : (form.overrideSetengahHari !== "" ? parseNumber(form.overrideSetengahHari) : null),
      overrideKontrak: isFreelance ? null : (form.overrideKontrak !== "" ? parseNumber(form.overrideKontrak) : null),
      overridePinjaman: isFreelance ? null : (form.overridePinjaman !== "" ? parseNumber(form.overridePinjaman) : null),
      overridePinjamanPribadi: isFreelance ? null : (form.overridePinjamanPribadi !== "" ? parseNumber(form.overridePinjamanPribadi) : null),
      overrideGajiPokok: isFreelance ? null : (isSalesNasionalSummary ? parseNumber(form.overrideGajiPokok) : form.overrideGajiPokok !== "" ? parseNumber(form.overrideGajiPokok) : null),
      freelanceRateType: isFreelance ? form.freelanceRateType : null,
      gajiPerJam: isFreelance && form.freelanceRateType === "per_jam" ? parseNumber(form.gajiPerJam) : 0,
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
    const unitsPayload = omzetInputs.map((item) => ({
      unit: item.unit,
      totalOmzet: parseNumber(item.totalOmzet),
      isCustomBonus: item.isCustomBonus,
    }));
    startOmzetTransition(async () => {
      try {
        const response = await fetch("/api/admin/payroll-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_omzet", month: periodMonth, year: periodYear, units: unitsPayload }) });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message || "Gagal menyimpan total omzet.");
        setOmzetMessage({ type: "success", text: result.message || "Omzet berhasil disimpan." });
        router.refresh();
      } catch (error) {
        setOmzetMessage({ type: "error", text: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan total omzet." });
      }
    });
  }

  function updateOmzetUnit(unit: string, field: "totalOmzet" | "isCustomBonus", value: string | boolean) {
    setOmzetInputs((current) =>
      current.map((item) =>
        item.unit === unit
          ? {
              ...item,
              ...(field === "totalOmzet"
                ? { totalOmzet: formatNumericInput(value as string) }
                : { isCustomBonus: value as boolean }),
            }
          : item,
      ),
    );
  }

  async function handleDownloadPdf() {
    if (isExportingPdf || filteredRows.length === 0) return;
    setIsExportingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Rekap Payroll", 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Periode: ${selectedPeriodLabel}`, 14, 22);
      doc.text(`Rentang absensi: ${displayedRange}`, 14, 27.5);
      doc.text(`Total karyawan: ${filteredRows.length}`, 14, 33);

      autoTable(doc, {
        startY: 38,
        head: [
          [
            "No",
            "Nama",
            "Hari Kerja",
            "Hari Masuk",
            "Sakit",
            "Terlambat",
            "Total Potongan",
            "Total Pinjaman",
            "Gaji Kontrak",
            "Pengembalian Kontrak",
            "Take Home Pay",
          ],
        ],
        body: filteredRows.map((row) => [
          row.number,
          (row.name || "").toUpperCase(),
          row.workDays,
          row.presentDays,
          row.sickCount,
          row.lateCount,
          formatCurrency(row.fineDeduction + row.contractCut + row.loanCut),
          formatCurrency(row.loanCut),
          formatCurrency(row.monthlyBaseSalary),
          row.contractReturn > 0 ? formatCurrency(row.contractReturn) : "-",
          formatCurrency(row.netIncome),
        ]),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.2, halign: "right", valign: "middle", lineColor: [215, 236, 238] },
        headStyles: { fillColor: [25, 215, 223], textColor: [6, 46, 49], fontStyle: "bold", halign: "center", valign: "middle" },
        alternateRowStyles: { fillColor: [248, 254, 254] },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left", cellWidth: 46 },
          2: { halign: "center", cellWidth: 20 },
          3: { halign: "center", cellWidth: 20 },
          4: { halign: "center", cellWidth: 16 },
          5: { halign: "center", cellWidth: 20 },
          6: { halign: "right" },
          7: { halign: "right" },
          8: { halign: "right" },
          9: { halign: "right" },
          10: { halign: "right" },
        },
      });

      const month = String(periodMonth).padStart(2, "0");
      doc.save(`REKAP-POTONGAN-PAYROLL-${periodYear}-${month}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsExportingPdf(false);
    }
  }

  // Download Finance: 1 file Excel berisi SEMUA karyawan dari semua summary
  // (Summary Payroll + Solo + Sales Nasional + Penjahit + Freelance). Digenerate server.
  function handleDownloadFinance() {
    setIsExportingFinance(true);
    try {
      const url = `/api/admin/payroll-summary/finance-export?month=${periodMonth}&year=${periodYear}`;
      window.location.href = url;
    } finally {
      // Reset state setelah navigasi unduhan dimulai.
      setTimeout(() => setIsExportingFinance(false), 1500);
    }
  }

  function openAbsensiEdit(row: AdminPayrollSummarySheetRow) {
    setAbsensiEditRow(row);
    setAbsensiValue(formatNumericInput(String(Math.round(row.diligenceCut))));
  }

  function submitAbsensiOverride(reset: boolean) {
    if (!absensiEditRow) return;
    const employeeId = absensiEditRow.employeeId;
    const body = {
      action: "save_potongan_absensi",
      employeeId,
      month: periodMonth,
      year: periodYear,
      potonganAbsensi: reset ? "" : String(parseNumber(absensiValue)),
    };
    startAbsensiTransition(async () => {
      try {
        const res = await fetch("/api/admin/payroll-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) {
          setPayrollMessage({ type: "error", text: data.message ?? "Gagal menyimpan potongan absensi." });
          return;
        }
        setPayrollMessage({ type: "success", text: data.message ?? "Potongan absensi tersimpan." });
        setAbsensiEditRow(null);
        router.refresh();
      } catch {
        setPayrollMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  return (
    <div className="space-y-5">
      {!canEdit ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-[#f0d8d1] bg-[#fff7f3] px-5 py-4 text-sm text-[#5a3a2d]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-5 w-5 flex-none text-[#8f1d22]" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <div>
            <p className="font-semibold text-[#8a3b1a]">Mode Lihat Saja (Read-Only)</p>
            <p className="mt-1 text-[#7a6059]">
              Anda dapat melihat data Summary Payroll, tetapi tidak bisa mengedit, menyimpan, menghapus, atau input omzet.
              Hanya admin <span className="font-semibold text-[#241716]">avafamily17@gmail.com</span> yang punya hak edit.
              Hubungi admin pengelola payroll untuk perubahan data.
            </p>
          </div>
        </div>
      ) : null}

      {sheet && sheet.rows.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleDownloadFinance}
            disabled={isExportingFinance || filteredRows.length === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0d7f86] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(13,127,134,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0a6a70] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            {isExportingFinance ? "Membuat Excel..." : "Download Finance"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf || filteredRows.length === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#8f1d22] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(143,29,34,0.22)] transition hover:-translate-y-0.5 hover:bg-[#a3262c] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            {isExportingPdf ? "Membuat PDF..." : "Download PDF"}
          </button>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[#ead7ce] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_180px] md:items-end md:justify-between">
          <Field label="Periode History Payroll">
            <input
              type="month"
              value={selectedPeriod}
              onChange={(event) => handlePeriodChange(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <div className="rounded-[22px] bg-[#f5fbfb] px-4 py-3 text-sm text-[#47696b]">Pilih bulan langsung dari kalender. Periode yang belum punya data payroll tetap bisa dipilih untuk mulai input baru.</div>
        </div>
      </section>

      {canEdit ? (
      <section className={isSalesNasionalSummary ? "grid gap-5" : "grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"}>
        <form onSubmit={handlePayrollSubmit} className="rounded-[32px] border border-[#cfeaec] bg-[linear-gradient(180deg,#f9ffff_0%,#f2fcfc_100%)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0c8087]">Input Payroll</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#123336]">Form Payroll Admin</h2>
              <p className="mt-2 text-sm text-[#628083]">Pilih nama karyawan, lalu isi komponen payroll per karyawan.</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isFreelance ? "bg-[#f3e8ff] text-[#6b21a8]" : isSales ? "bg-[#fff1d8] text-[#8a5d00]" : "bg-[#dff7f8] text-[#0b6670]"}`}>{isFreelance ? "Freelance" : isSales ? "Sales" : "Non Sales"}</div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Nama Karyawan">
              <select
                value={form.employeeId}
                onChange={(event) => handleEmployeeChange(event.target.value)}
                className={selectClassName}
                required
              >
                <option value="">Pilih karyawan</option>
                {availableEmployeeOptions.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.name.toUpperCase()} - {employee.role}</option>)}
              </select>
            </Field>
            {!editingPayrollId && savedEmployeeIds.size > 0 && employeeOptions.length > availableEmployeeOptions.length ? (
              <p className="text-xs text-[#87a6a8]">Karyawan yang sudah memiliki payroll periode ini tidak ditampilkan.</p>
            ) : null}

            {selectedEmployee ? <div className="mt-1 rounded-[24px] border border-[#d5e9ea] bg-white px-5 py-5 text-sm text-[#35585b]"><p className="font-semibold text-[#19393d]">{selectedEmployee.name}</p><p className="mt-2">{selectedEmployee.role} | {selectedEmployee.division} | {selectedEmployee.department}</p><p className="mt-2">Pembagian rekapan: {selectedEmployee.recapGroup}</p></div> : null}

            {isFreelance ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#d5e9ea] bg-[#f0fbfb] px-4 py-3 text-sm text-[#35585b]">
                  Karyawan freelance — hanya Gaji Pokok yang diinput. Semua komponen lain otomatis nol.
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-[#123336]">Tipe Gaji Pokok</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => updateField("freelanceRateType", "per_hari")}
                      className={`h-10 rounded-2xl border px-5 text-sm font-semibold transition ${form.freelanceRateType === "per_hari" ? "border-[#0d7f86] bg-[#0d7f86] text-white" : "border-[#d5e9ea] bg-white text-[#466668]"}`}
                    >
                      Per Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("freelanceRateType", "per_jam")}
                      className={`h-10 rounded-2xl border px-5 text-sm font-semibold transition ${form.freelanceRateType === "per_jam" ? "border-[#0d7f86] bg-[#0d7f86] text-white" : "border-[#d5e9ea] bg-white text-[#466668]"}`}
                    >
                      Per Jam
                    </button>
                  </div>
                </div>
                {form.freelanceRateType === "per_hari" ? (
                  <Field label="Gaji Per Hari">
                    <input value={form.gajiPerDay} onChange={(event) => updateField("gajiPerDay", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required />
                  </Field>
                ) : (
                  <div className="space-y-2">
                    <Field label="Gaji Per Jam">
                      <input value={form.gajiPerJam} onChange={(event) => updateField("gajiPerJam", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required />
                    </Field>
                    <p className="text-xs text-[#628083]">Jam dihitung otomatis dari data absensi (jam masuk hingga jam pulang).</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {isSalesNasionalSummary ? (
                    <>
                      <Field label="Gaji Pokok"><input value={form.overrideGajiPokok} onChange={(event) => updateField("overrideGajiPokok", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                      <Field label="Transport"><input value={form.uangTransport} onChange={(event) => updateField("uangTransport", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                      <Field label="BPJS"><input value={form.bpjs} onChange={(event) => updateField("bpjs", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                      <Field label="Kendaraan"><input value={form.kendaraan} onChange={(event) => updateField("kendaraan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                      <Field label="Bonus Opsional"><input value={form.bonusPerforma} onChange={(event) => updateField("bonusPerforma", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" /></Field>
                    </>
                  ) : (
                    <>
                      <Field label="Gaji Pokok Perhari / Perjam"><input value={form.gajiPerDay} onChange={(event) => updateField("gajiPerDay", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required />{raiseInfo?.hasRaise ? <p className="text-[11px] font-medium text-[#0d7f86]">Efektif setelah kenaikan tahunan: Rp {raiseInfo.effectiveDaily.toLocaleString("id-ID")} (baseline tetap disimpan)</p> : null}</Field>
                      {!isSalesNasional ? (
                        <>
                          <Field label="Tunjangan Jabatan"><input value={form.tunjanganJabatan} onChange={(event) => updateField("tunjanganJabatan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                          <Field label="Uang Makan"><input value={form.uangMakan} onChange={(event) => updateField("uangMakan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                          <Field label="Subsidi"><input value={form.subsidi} onChange={(event) => updateField("subsidi", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                          <Field label="Uang Kerajinan"><input value={form.uangKerajinan} onChange={(event) => updateField("uangKerajinan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                        </>
                      ) : null}
                      <Field label="BPJS"><input value={form.bpjs} onChange={(event) => updateField("bpjs", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                      {isSales ? (
                        <>
                          {isSalesNasional ? <Field label="Bonus Opsional"><input value={form.bonusPerforma} onChange={(event) => updateField("bonusPerforma", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" /></Field> : <Field label="Insentif"><input value={form.insentif} onChange={(event) => updateField("insentif", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>}
                          <Field label="Transport"><input value={form.uangTransport} onChange={(event) => updateField("uangTransport", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>
                          {isSalesNasional ? <Field label="Kendaraan"><input value={form.kendaraan} onChange={(event) => updateField("kendaraan", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" /></Field> : null}
                        </>
                      ) : <Field label="Bonus Performa"><input value={form.bonusPerforma} onChange={(event) => updateField("bonusPerforma", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" required /></Field>}
                      <Field label="Gaji Pokok (Bulanan)"><input value={form.overrideGajiPokok} onChange={(event) => updateField("overrideGajiPokok", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" />{raiseInfo?.hasRaise && raiseInfo.hasOverride ? <p className="text-[11px] font-medium text-[#0d7f86]">Efektif setelah kenaikan tahunan: Rp {raiseInfo.effectiveMonthly.toLocaleString("id-ID")} (baseline tetap disimpan)</p> : null}</Field>
                    </>
                  )}
                </div>

                {!isSalesNasionalSummary ? <div className="mt-8">
                  <p className="mb-4 text-sm font-semibold text-[#123336]">Override Kehadiran (Opsional, kosongkan jika ingin menggunakan data sistem)</p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Masuk (Hari)"><input value={form.overrideMasuk} onChange={(event) => updateField("overrideMasuk", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                    <Field label="Lembur (Jam)"><input value={form.overrideLembur} onChange={(event) => updateField("overrideLembur", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                    <Field label="Izin / Off (Hari)"><input value={form.overrideIzin} onChange={(event) => updateField("overrideIzin", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                    <Field label="Sakit (Hari)"><input value={form.overrideSakit} onChange={(event) => updateField("overrideSakit", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                    <Field label="Sakit Tanpa Surat (Hari)"><input value={form.overrideSakitTanpaSurat} onChange={(event) => updateField("overrideSakitTanpaSurat", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                    <Field label="1/2 Hari (Hari)"><input value={form.overrideSetengahHari} onChange={(event) => updateField("overrideSetengahHari", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                  </div>
                </div> : null}

                {!isSalesNasionalSummary ? <div className="mt-8">
                  <p className="mb-4 text-sm font-semibold text-[#123336]">Override Potongan (Opsional, kosongkan jika ingin menggunakan data sistem)</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Kontrak"><input value={form.overrideKontrak} onChange={(event) => updateField("overrideKontrak", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                    <Field label="Pinjaman Perusahaan"><input value={form.overridePinjaman} onChange={(event) => updateField("overridePinjaman", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                    <Field label="Pinjaman Pribadi"><input value={form.overridePinjamanPribadi} onChange={(event) => updateField("overridePinjamanPribadi", formatNumericInput(event.target.value))} className={inputClassName} inputMode="numeric" placeholder="Otomatis" /></Field>
                  </div>
                </div> : null}
              </>
            )}
          </div>

          {editingPayrollId ? <div className="mt-5 rounded-2xl bg-[#fff5e8] px-4 py-3 text-sm text-[#875100]">Mode edit aktif. Hanya field input payroll di form yang bisa diubah; kolom hasil hitung tetap mengikuti sistem untuk periode {periodMonth}/{periodYear}.</div> : null}
          {payrollMessage ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${payrollMessage.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"}`}>{payrollMessage.text}</div> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={isPayrollPending || !form.employeeId} className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0d7f86] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isPayrollPending ? "Menyimpan..." : editingPayrollId ? "Update Payroll" : "Simpan Payroll"}</button>
            {editingPayrollId ? <button type="button" onClick={() => resetForm()} className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#cfeaec] bg-white px-6 text-sm font-semibold text-[#35585b]">Batal Edit</button> : null}
          </div>
        </form>

        {!isSalesNasionalSummary ? <div className="space-y-4">
          <form onSubmit={handleOmzetSubmit} className="rounded-[32px] border border-[#cfeaec] bg-[linear-gradient(180deg,#f9ffff_0%,#f2fcfc_100%)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0c8087]">Omzet per Group</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#123336]">Input Omzet Bulanan</h2>
            <p className="mt-2 text-sm text-[#628083]">AVA + Ayres dijadikan satu pool (dibagi rata ke semua karyawan AVA &amp; Ayres). JNE pakai nominal bonus custom.</p>
            <div className="mt-6 space-y-4">
              {omzetInputs.map((item) => {
                const value = parseNumber(item.totalOmzet);
                const bonusUnit = item.isCustomBonus ? value : value * PAYROLL_OMZET_BONUS_RATE;
                const showCustomBonusToggle = item.unit !== "AVA+Ayres";
                return (
                  <div key={item.unit} className="rounded-2xl border border-[#d5e9ea] bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#123336]">{item.label}</p>
                      {showCustomBonusToggle ? (
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#466668]">
                          <input
                            type="checkbox"
                            checked={item.isCustomBonus}
                            onChange={(event) => updateOmzetUnit(item.unit, "isCustomBonus", event.target.checked)}
                            className="h-4 w-4 rounded border-[#cfeaec] accent-[#0d7f86]"
                          />
                          Custom Bonus
                        </label>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-2">
                      <input
                        value={item.totalOmzet}
                        onChange={(event) => updateOmzetUnit(item.unit, "totalOmzet", event.target.value)}
                        className={inputClassName}
                        inputMode="numeric"
                        placeholder={item.isCustomBonus ? "Nominal bonus omzet" : "Total omzet"}
                      />
                      <p className="text-[12px] text-[#628083]">
                        {item.isCustomBonus
                          ? `Nominal di atas dipakai langsung sebagai bonus omzet (${formatCurrency(bonusUnit)}).`
                          : `Bonus omzet otomatis ${formatCurrency(bonusUnit)} (0,7% × omzet).`}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="space-y-2">
                {bonusOmzetPerUnit.map((item) => (
                  <div key={item.unit} className="rounded-2xl border border-[#d5e9ea] bg-white px-4 py-4 text-sm text-[#35585b]">
                    <p className="text-[13px] font-semibold text-[#466668]">Total Bonus Omzet {item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#123336]">{formatCurrency(item.bonus)}</p>
                  </div>
                ))}
              </div>
            </div>
            {omzetPeriod.isLocked ? <div className="mt-5 rounded-2xl bg-[#edf6f6] px-4 py-3 text-sm text-[#446568]">Omzet periode ini sudah ada. Anda bisa update nominalnya kapan saja.</div> : null}
            {omzetMessage ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${omzetMessage.type === "success" ? "bg-[#def8eb] text-[#17603b]" : "bg-[#ffe4e4] text-[#8b2626]"}`}>{omzetMessage.text}</div> : null}
            <div className="mt-6 flex gap-3">
              <button type="submit" disabled={isOmzetPending} className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#19d7df] px-6 text-sm font-semibold text-[#083438] disabled:cursor-not-allowed disabled:opacity-60">{isOmzetPending ? "Menyimpan..." : omzetPeriod.isLocked ? "Update Omzet" : "Simpan Omzet"}</button>
            </div>
          </form>

          <section className="grid gap-4">
            <article className="rounded-[30px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)] px-6 py-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a16f63]">Periode Payroll</p><h2 className="mt-3 text-2xl font-semibold text-[#241716]">{selectedPeriodLabel}</h2><p className="mt-2 text-sm text-[#7a6059]">Rentang absensi {displayedRange}</p></article>
          </section>
        </div> : null}
      </section>
      ) : null}

      {sheet ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Karyawan</p><p className="mt-2 text-3xl font-semibold text-[#241716]">{filteredRows.length}{filteredRows.length !== sheet.rows.length ? <span className="ml-1 text-base text-[#a16f63]">/ {sheet.rows.length}</span> : null}</p></article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Total Potongan</p><p className="mt-2 text-3xl font-semibold text-[#241716]">{formatCurrency(sheet.totalDeduction)}</p></article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Take Home Pay</p><p className="mt-2 text-3xl font-semibold text-[#241716]">{formatCurrency(sheet.totalNetIncome)}</p></article>
            <article className="rounded-[26px] border border-[#ead7ce] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a16f63]">Range</p><p className="mt-2 text-lg font-semibold text-[#241716]">{displayedRange}</p></article>
          </section>

          <div className="overflow-hidden rounded-[32px] border border-[#d9efef] bg-white lg:flex lg:flex-col lg:h-[calc(100dvh-96px)]">
            <div className="flex items-center gap-3 border-b border-[#d9efef] px-5 py-4 lg:shrink-0">
              <svg className="shrink-0 text-[#3bbfc6]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, jabatan, divisi, departemen..."
                className="w-full bg-transparent text-sm text-[#1d3f42] outline-none placeholder:text-[#87a6a8]"
              />
              {searchQuery ? <button type="button" onClick={() => setSearchQuery("")} className="shrink-0 text-xs font-semibold text-[#a16f63] hover:text-[#7a3f35]">Hapus</button> : null}
            </div>
            <div className="overflow-auto [-webkit-overflow-scrolling:touch] max-h-[calc(100dvh-200px)] lg:max-h-none lg:min-h-0 lg:flex-1">
              <table className="min-w-[3960px] border-collapse text-left text-sm text-[#1d1d1d]">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#19d7df] text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#062e31]">
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">No</th>
                    <th rowSpan={2} className="sticky left-0 z-20 border border-[#a8ebef] bg-[#19d7df] px-3 py-3">Nama</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Jabatan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Divisi</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Pembagian Rekapan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Departemen</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Bank</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">No Rekening</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Tipe</th>
                    <th colSpan={7} className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Nominal Tetap</th>
                    <th rowSpan={2} className="border border-[#fdba74] bg-[#f97316] px-3 py-3 text-white">Hari Kerja</th>
                    <th rowSpan={2} className="border border-[#fdba74] bg-[#f97316] px-3 py-3 text-white">Masuk</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Total Gaji Pokok</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Omzet / Insentif</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Uang Makan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Kerajinan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Transport</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Kendaraan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Perjalanan Dinas</th>
                    <th colSpan={2} className="border border-[#a8ebef] px-3 py-3">Lembur</th>
                    <th rowSpan={2} className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Izin / Off</th>
                    <th rowSpan={2} className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Sakit</th>
                    <th rowSpan={2} className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Sakit Tanpa Surat</th>
                    <th colSpan={2} className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Setengah Hari</th>
                    <th colSpan={2} className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Telat</th>
                    <th rowSpan={2} className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Total Potongan</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Total Gaji</th>
                    <th colSpan={3} className="border border-[#a8ebef] px-3 py-3">Tambahan</th>
                    <th colSpan={3} className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Total Potongan</th>
                    <th rowSpan={2} className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Potongan Absensi</th>
                    <th rowSpan={2} className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Total All Potongan</th>
                    <th rowSpan={2} className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Gaji Kontrak</th>
                    <th rowSpan={2} className="border border-[#86efac] bg-[#16a34a] px-3 py-3 text-white">Pengembalian Kontrak</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Take Home Pay Sebelum Dipotong</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Take Home Pay</th>
                    <th rowSpan={2} className="border border-[#a8ebef] px-3 py-3">Aksi</th>
                  </tr>
                  <tr className="bg-[#19d7df] text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#062e31]">
                    <th className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Insentif Kehadiran</th>
                    <th className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Tunjangan Jabatan</th>
                    <th className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Uang Makan</th>
                    <th className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Subsidi</th>
                    <th className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Uang Kerajinan</th>
                    <th className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">BPJS</th>
                    <th className="border border-[#fca5a5] bg-[#ef4444] px-3 py-3 text-white">Bonus Performa</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Lembur</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Bonus</th>
                    <th className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">1/2 Hari</th>
                    <th className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Potongan</th>
                    <th className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Telat</th>
                    <th className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Potongan</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Kontrak</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Pinjaman Perusahaan</th>
                    <th className="border border-[#a8ebef] px-3 py-3">Pinjaman Pribadi</th>
                    <th className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Potongan Denda</th>
                    <th className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Potongan Kontrak</th>
                    <th className="border border-[#fde047] bg-[#facc15] px-3 py-3 text-[#713f12]">Potongan Pinjaman</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={99} className="px-6 py-8 text-center text-sm text-[#87a6a8]">Tidak ada data yang cocok dengan pencarian.</td></tr>
                  ) : filteredRows.map((row) => (
                    <tr key={row.id} className="text-[#3a2b27] odd:bg-white even:bg-[#fcfefe]">
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.number}</td>
                      <td className="sticky left-0 z-10 border border-[#d7ecee] bg-white px-3 py-3 font-semibold uppercase text-[#241716]">{row.name}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.role}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.division}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.recapGroup}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.department}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 uppercase">{row.bank}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">{row.accountNumber}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.payrollType === "sales" ? "Sales" : "Non Sales"}</td>
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
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.vehicleAllowance)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.travelReimbursement)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{formatNumber(row.overtimeHours)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.overtimeBonus)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.leaveCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.sickCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.sickWithoutNoteCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.halfDayCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.halfDayDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-center">{row.lateCount}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.lateDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold text-[#8f1d22]">{formatCurrency(row.halfDayDeduction + row.lateDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold">{formatCurrency(row.totalSalary)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.contractDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.companyLoan)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.personalLoan)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.fineDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.contractCut)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.loanCut)}</td>
                      <td className="border border-[#d7ecee] px-1 py-1 text-right">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => openAbsensiEdit(row)}
                            title="Klik untuk edit potongan absensi (hanya periode ini)"
                            className={`inline-flex w-full items-center justify-end gap-1 rounded-lg px-2 py-2 transition hover:bg-[#fff2ec] ${row.inputOverridePotonganAbsensi !== null ? "font-semibold text-[#0d7f86] underline decoration-dotted underline-offset-2" : "text-[#3a2b27]"}`}
                          >
                            {formatCurrency(row.diligenceCut)}
                            {row.inputOverridePotonganAbsensi !== null ? <span className="text-[10px]">✎</span> : null}
                          </button>
                        ) : (
                          <span className="block px-2 py-2">{formatCurrency(row.diligenceCut)}</span>
                        )}
                      </td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold text-[#8f1d22]">{formatCurrency(row.fineDeduction + row.contractCut + row.loanCut)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.monthlyBaseSalary)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold text-[#16a34a]">{row.contractReturn > 0 ? formatCurrency(row.contractReturn) : "-"}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right">{formatCurrency(row.totalSalaryBeforeDeduction)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3 text-right font-semibold text-[#8f1d22]">{formatCurrency(row.netIncome)}</td>
                      <td className="border border-[#d7ecee] px-3 py-3">
                        {canEdit ? (
                          <div className="flex min-w-[140px] gap-2">
                            <button type="button" onClick={() => handleEditRow(row)} className="inline-flex h-9 items-center justify-center rounded-xl border border-[#0d7f86] px-3 text-xs font-semibold text-[#0d7f86]">Edit</button>
                            <button type="button" onClick={() => handleDeleteRow(row.id)} disabled={isDeletePending} className="inline-flex h-9 items-center justify-center rounded-xl bg-[#8f1d22] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isDeletePending ? "Proses..." : "Hapus"}</button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#a1a1a1]">Read only</span>
                        )}
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

      {absensiEditRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-[#0d7f86] px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Edit Potongan Absensi</h3>
              <p className="mt-0.5 text-sm text-white/80">
                {absensiEditRow.name} • {selectedPeriodLabel}
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="rounded-xl bg-[#f5fbfb] px-4 py-3 text-[13px] text-[#47696b]">
                Nilai diubah <span className="font-semibold">hanya untuk periode ini</span>. Periode lain tetap otomatis dari sistem.
                {absensiEditRow.inputOverridePotonganAbsensi !== null
                  ? " Saat ini memakai nilai manual."
                  : " Saat ini otomatis dari sistem."}
              </p>
              <label className="block space-y-1.5">
                <span className="block text-[13px] font-semibold text-[#466668]">Potongan Absensi (Rp)</span>
                <input
                  value={absensiValue}
                  onChange={(e) => setAbsensiValue(formatNumericInput(e.target.value))}
                  inputMode="numeric"
                  autoFocus
                  className="h-12 w-full rounded-2xl border border-[#d5e9ea] bg-white px-4 text-[#173033] outline-none focus:border-[#0d7f86] focus:shadow-[0_0_0_4px_rgba(13,127,134,0.16)]"
                  placeholder="0"
                />
              </label>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setAbsensiEditRow(null)}
                  className="h-11 flex-1 rounded-xl border border-[#ead7ce] text-sm font-semibold text-[#8f1d22] hover:bg-[#fff2ec]"
                >
                  Batal
                </button>
                {absensiEditRow.inputOverridePotonganAbsensi !== null ? (
                  <button
                    type="button"
                    onClick={() => submitAbsensiOverride(true)}
                    disabled={isAbsensiPending}
                    className="h-11 flex-1 rounded-xl border border-[#0d7f86] text-sm font-semibold text-[#0d7f86] hover:bg-[#effbfb] disabled:opacity-60"
                  >
                    Reset Otomatis
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => submitAbsensiOverride(false)}
                  disabled={isAbsensiPending}
                  className="h-11 flex-1 rounded-xl bg-[#0d7f86] text-sm font-semibold text-white hover:bg-[#0a6a70] disabled:opacity-60"
                >
                  {isAbsensiPending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
