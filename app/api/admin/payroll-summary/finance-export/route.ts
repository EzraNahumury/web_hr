import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import ExcelJS from "exceljs";

import { getCurrentAdminSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getAdminPayrollSummarySheet } from "@/lib/payroll-summary";
import { getPenjahitSheet } from "@/lib/payroll-penjahit";
import { getFreelanceSheet } from "@/lib/payroll-freelance";
import { getPartimeSheet } from "@/lib/payroll-partime";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

type FinanceRow = { name: string; bank: string; accountNumber: string; takeHome: number };

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const url = new URL(request.url);
  const month = parsePositiveInt(url.searchParams.get("month"));
  const year = parsePositiveInt(url.searchParams.get("year"));
  if (!month || month > 12 || !year) {
    return new Response("Periode tidak valid.", { status: 400 });
  }
  const period = { month, year };

  // Main sheet mencakup semua non-penjahit & non-partime. Penjahit, freelance, dan
  // partime punya sheet sendiri (main query meng-exclude keduanya), jadi digabung terpisah.
  const [mainSheet, penjahitSheet, freelanceSheet, partimeSheet] = await Promise.all([
    getAdminPayrollSummarySheet(period),
    getPenjahitSheet(period),
    getFreelanceSheet(period),
    getPartimeSheet(period),
  ]);

  // Freelance: total gaji per karyawan (gabung semua tipe).
  const freelanceTotal = new Map<number, { name: string; total: number }>();
  const addFreelance = (employeeId: number, name: string, total: number) => {
    const current = freelanceTotal.get(employeeId);
    if (current) current.total += total;
    else freelanceTotal.set(employeeId, { name, total });
  };
  for (const r of freelanceSheet.jam) addFreelance(r.employeeId, r.name, r.total);
  for (const r of freelanceSheet.pengerjaan) addFreelance(r.employeeId, r.name, r.total);
  for (const r of freelanceSheet.harian) addFreelance(r.employeeId, r.name, r.total);
  for (const r of freelanceSheet.custom) addFreelance(r.employeeId, r.name, r.grandTotal);

  // Bank & no rekening untuk freelance (tidak ada di freelance sheet).
  const freelanceIds = [...freelanceTotal.keys()];
  const bankMap = new Map<number, { bank: string; accountNumber: string }>();
  if (freelanceIds.length > 0) {
    const [bankRows] = await pool.query<(RowDataPacket & { id: number; bank: string | null; no_rekening: string | null })[]>(
      `SELECT id, bank, no_rekening FROM karyawan WHERE id IN (?)`,
      [freelanceIds],
    );
    for (const r of bankRows) {
      bankMap.set(r.id, { bank: r.bank || "-", accountNumber: r.no_rekening || "-" });
    }
  }

  const seen = new Set<number>();
  const finance: FinanceRow[] = [];

  // Freelance dulu (prioritas total gaji bila juga ada di main sheet).
  for (const [id, v] of freelanceTotal) {
    const b = bankMap.get(id);
    finance.push({
      name: v.name,
      bank: b?.bank ?? "-",
      accountNumber: b?.accountNumber ?? "-",
      takeHome: Math.max(0, v.total),
    });
    seen.add(id);
  }

  // Main (Summary Payroll + Solo + Sales Nasional) — take home pay / penerimaan bersih.
  if (mainSheet) {
    for (const r of mainSheet.rows) {
      if (seen.has(r.employeeId)) continue;
      finance.push({
        name: r.name,
        bank: r.bank || "-",
        accountNumber: r.accountNumber || "-",
        takeHome: r.netIncome,
      });
      seen.add(r.employeeId);
    }
  }

  // Penjahit — penerimaan bersih.
  if (penjahitSheet) {
    for (const r of penjahitSheet.rows) {
      if (seen.has(r.employeeId)) continue;
      finance.push({
        name: r.nama,
        bank: r.bank || "-",
        accountNumber: r.noRekening || "-",
        takeHome: Math.max(0, r.penerimaanBersih),
      });
      seen.add(r.employeeId);
    }
  }

  // Partime — total gaji bersih (insentif & uang makan × hari masuk, dikurangi potongan telat).
  if (partimeSheet) {
    for (const r of partimeSheet.rows) {
      if (seen.has(r.employeeId)) continue;
      finance.push({
        name: r.nama,
        bank: r.bank || "-",
        accountNumber: r.noRekening || "-",
        takeHome: Math.max(0, r.totalGaji),
      });
      seen.add(r.employeeId);
    }
  }

  finance.sort((a, b) => a.name.localeCompare(b.name, "id"));

  // Build workbook
  const now = new Date();
  const periodLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(year, month - 1, 1));
  const exportedAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(now);
  const totalThp = finance.reduce((sum, r) => sum + r.takeHome, 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Web HR AvA Group";
  wb.created = now;
  const ws = wb.addWorksheet("Finance", { views: [{ state: "frozen", ySplit: 3 }] });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 32;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 20;

  const thin = { style: "thin" as const, color: { argb: "FFE0CFC8" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  ws.mergeCells(1, 1, 1, 5);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "FINANCE — TAKE HOME PAY (SEMUA KARYAWAN)";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF0D7F86" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, 5);
  const metaCell = ws.getCell(2, 1);
  metaCell.value = `Periode: ${periodLabel}     •     Total: ${finance.length} karyawan     •     Total Take Home Pay: Rp ${Math.round(totalThp).toLocaleString("id-ID")}     •     Diekspor: ${exportedAt}`;
  metaCell.font = { italic: true, size: 10, color: { argb: "FF7A6059" } };
  ws.getRow(2).height = 18;

  const headers = ["No", "Nama", "Bank", "No Rekening", "Take Home Pay"];
  const headerRow = ws.getRow(3);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D7F86" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border;
  });
  headerRow.height = 26;

  finance.forEach((r, i) => {
    const row = ws.getRow(4 + i);
    const values: (string | number)[] = [i + 1, (r.name || "-").toUpperCase(), r.bank.toUpperCase(), r.accountNumber.toUpperCase(), Math.round(r.takeHome)];
    values.forEach((v, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = v;
      cell.font = { size: 10, color: { argb: "FF2D1B18" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: idx === 0 ? "center" : idx === 4 ? "right" : "left",
      };
      cell.border = border;
      if (idx === 4) cell.numFmt = '"Rp"#,##0';
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1FBFB" } };
      }
    });
  });

  // Baris total
  const totalRow = ws.getRow(4 + finance.length);
  totalRow.getCell(4).value = "TOTAL";
  totalRow.getCell(4).font = { bold: true, size: 11, color: { argb: "FF0D7F86" } };
  totalRow.getCell(4).alignment = { horizontal: "right" };
  totalRow.getCell(5).value = Math.round(totalThp);
  totalRow.getCell(5).numFmt = '"Rp"#,##0';
  totalRow.getCell(5).font = { bold: true, size: 11, color: { argb: "FF0D7F86" } };
  totalRow.getCell(4).border = border;
  totalRow.getCell(5).border = border;

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 5 } };

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `FINANCE TAKE HOME PAY ${periodLabel}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
