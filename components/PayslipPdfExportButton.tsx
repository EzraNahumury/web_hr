"use client";

import { useState } from "react";
import type { jsPDF } from "jspdf";

export type PayslipPdfLineItem = {
  label: string;
  value: number;
};

export type PayslipPdfPayload = {
  rangeLabel: string;
  employeeName: string;
  role: string;
  division: string;
  bank: string;
  accountNumber: string;
  presentDays: number;
  overtimeHours: number;
  lateCount: number;
  halfDayCount: number;
  earnings: PayslipPdfLineItem[];
  deductions: PayslipPdfLineItem[];
  netIncome: number;
};

type PayslipPdfExportButtonProps = {
  fileName: string;
  pdfData: PayslipPdfPayload;
};

const OWNER_NAME = "Arya Rahadyan";
const HR_COORDINATOR_NAME = "Elnida Rahma Dian";
const assetCache = new Map<string, Promise<string>>();

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca aset PDF."));
    reader.readAsDataURL(blob);
  });
}

function loadAssetDataUrl(url: string) {
  if (!assetCache.has(url)) {
    assetCache.set(
      url,
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Gagal memuat aset PDF: ${url}`);
          }

          return response.blob();
        })
        .then(blobToDataUrl),
    );
  }

  return assetCache.get(url)!;
}

function drawPairColumn(
  doc: jsPDF,
  startX: number,
  startY: number,
  labelWidth: number,
  valueWidth: number,
  items: Array<{ label: string; value: string }>,
) {
  let currentY = startY;

  for (const item of items) {
    doc.setFont("helvetica", "bold");
    doc.text(item.label, startX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(":", startX + labelWidth, currentY);
    doc.text(item.value, startX + labelWidth + 4, currentY, { maxWidth: valueWidth });
    currentY += 5.4;
  }
}

function drawMoneyColumn(
  doc: jsPDF,
  startX: number,
  startY: number,
  valueX: number,
  items: PayslipPdfLineItem[],
) {
  let currentY = startY;

  for (const item of items) {
    doc.setFont("helvetica", "normal");
    doc.text(item.label, startX, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(item.value), valueX, currentY, { align: "right" });
    currentY += 5.2;
  }
}

function drawSignatureBlock(
  doc: jsPDF,
  centerX: number,
  startY: number,
  title: string,
  name: string,
  signatureDataUrl: string | null,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Mengetahui,", centerX, startY, { align: "center" });
  doc.text(title, centerX, startY + 5, { align: "center" });

  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, "PNG", centerX - 12, startY + 11, 24, 9, undefined, "FAST");
  }

  doc.setLineWidth(0.3);
  doc.line(centerX - 20, startY + 24, centerX + 20, startY + 24);
  doc.setFont("helvetica", "bold");
  doc.text(name, centerX, startY + 29, { align: "center" });
}

function createSafeFileName(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
}

async function buildPayslipPdf(fileName: string, pdfData: PayslipPdfPayload) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  const [logoResult, signatureResult] = await Promise.allSettled([
    loadAssetDataUrl("/logo/new logo.png"),
    loadAssetDataUrl("/ttd/images.png"),
  ]);

  const logoDataUrl = logoResult.status === "fulfilled" ? logoResult.value : null;
  const signatureDataUrl = signatureResult.status === "fulfilled" ? signatureResult.value : null;

  doc.setProperties({ title: fileName, subject: "Slip Gaji", author: "web_hr" });
  doc.setDrawColor(17, 17, 17);
  doc.setTextColor(17, 17, 17);
  doc.setLineWidth(0.35);
  doc.rect(12, 12, 186, 273);

  doc.rect(19, 19, 26.5, 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Pribadi & Rahasia", 32.25, 23.6, { align: "center" });

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 160, 18.8, 24, 8, undefined, "FAST");
  }

  doc.setLineWidth(0.35);
  doc.line(19, 31, 191, 31);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("SLIP GAJI", 105, 39.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Periode: ${pdfData.rangeLabel}`, 105, 45, { align: "center" });

  doc.line(19, 49, 191, 49);

  doc.setFontSize(9.5);
  drawPairColumn(doc, 19, 58.5, 28, 49, [
    { label: "Nama Karyawan", value: pdfData.employeeName },
    { label: "Jabatan / Divisi", value: `${pdfData.role} / ${pdfData.division}` },
    { label: "Bank", value: pdfData.bank },
    { label: "No Rekening", value: pdfData.accountNumber },
  ]);

  drawPairColumn(doc, 108, 58.5, 28, 34, [
    { label: "Total Hari Kerja", value: String(pdfData.presentDays) },
    { label: "Lembur", value: String(pdfData.overtimeHours) },
    { label: "Terlambat", value: String(pdfData.lateCount) },
    { label: "Setengah Hari", value: String(pdfData.halfDayCount) },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("GAJI", 19, 89);
  doc.text("POTONGAN", 108, 89);
  doc.line(19, 89.8, 30.2, 89.8);
  doc.line(108, 89.8, 127.7, 89.8);

  doc.setFontSize(9.5);
  drawMoneyColumn(doc, 19, 97, 98, pdfData.earnings);
  drawMoneyColumn(doc, 108, 97, 191, pdfData.deductions);

  doc.line(19, 126.5, 191, 126.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("GAJI BERSIH", 19, 135);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text("Slip ini dibuat dari rekap payroll untuk arsip internal perusahaan.", 19, 139.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16.5);
  doc.text(formatCurrency(pdfData.netIncome), 191, 139.2, { align: "right" });

  drawSignatureBlock(doc, 61, 195, "Owner", OWNER_NAME, signatureDataUrl);
  drawSignatureBlock(doc, 149, 195, "HR Coordinator", HR_COORDINATOR_NAME, signatureDataUrl);

  doc.save(createSafeFileName(fileName));
}

export default function PayslipPdfExportButton({ fileName, pdfData }: PayslipPdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExportPdf() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      await buildPayslipPdf(fileName, pdfData);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExportPdf}
      disabled={isExporting}
      className="inline-flex h-12 items-center justify-center rounded-full border border-[#2f231c] bg-[#2f231c] px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(47,35,28,0.18)] hover:-translate-y-0.5 hover:bg-[#4a382f] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#2f231c]/15"
    >
      {isExporting ? "Membuat PDF..." : "Export PDF"}
    </button>
  );
}




