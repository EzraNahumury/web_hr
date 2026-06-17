import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";

import { getCurrentAdminSession } from "@/lib/auth";
import { listEmployees, type EmployeeListItem } from "@/lib/employees";

export const dynamic = "force-dynamic";

function titleCase(value: string | null | undefined) {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatEmployment(status: EmployeeListItem["employmentStatus"]) {
  switch (status) {
    case "training":
      return "Training";
    case "tetap":
      return "Tetap";
    case "kontrak":
      return "Kontrak";
    case "freelance":
      return "Freelance";
    default:
      return status ?? "-";
  }
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

type Column = {
  header: string;
  width: number;
  wrap?: boolean;
  currency?: boolean;
  value: (e: EmployeeListItem, index: number) => string | number;
};

// Semua kolom kecuali foto KTP. Urutan & label mengikuti detail karyawan di web.
const COLUMNS: Column[] = [
  { header: "No", width: 6, value: (_e, i) => i + 1 },
  { header: "Nama", width: 28, value: (e) => e.name || "-" },
  { header: "Email", width: 26, value: (e) => e.email || "-" },
  { header: "NIP", width: 18, value: (e) => e.nip || "-" },
  { header: "Unit", width: 16, value: (e) => e.unit || "-" },
  { header: "Jabatan", width: 16, value: (e) => e.role || "-" },
  { header: "Jenis Kelamin", width: 14, value: (e) => (e.gender ? titleCase(e.gender) : "-") },
  { header: "Tempat Lahir", width: 16, value: (e) => e.birthPlace || "-" },
  { header: "Tanggal Lahir", width: 14, value: (e) => e.birthDate || "-" },
  { header: "NIK", width: 20, value: (e) => e.nik || "-" },
  { header: "Agama", width: 12, value: (e) => e.religion || "-" },
  { header: "Nomor Telepon", width: 16, value: (e) => e.phoneNumber || "-" },
  { header: "Alamat KTP", width: 32, wrap: true, value: (e) => e.addressKtp || "-" },
  { header: "Alamat Rumah / Kost", width: 32, wrap: true, value: (e) => e.addressCurrent || "-" },
  { header: "Departemen", width: 16, value: (e) => e.department || "-" },
  { header: "Divisi", width: 16, value: (e) => e.division || "-" },
  { header: "Sub Divisi", width: 16, value: (e) => e.subDivision || "-" },
  {
    header: "Penempatan",
    width: 20,
    value: (e) => [e.placement, ...(e.extraPlacements ?? [])].filter(Boolean).join(", ") || "-",
  },
  { header: "Pembebanan", width: 16, value: (e) => e.costAllocation || "tidak keduanya" },
  { header: "Status Kepegawaian", width: 16, value: (e) => formatEmployment(e.employmentStatus) },
  { header: "Status Data", width: 12, value: (e) => titleCase(e.dataStatus) },
  { header: "Akun", width: 10, value: (e) => (e.userActive ? "Aktif" : "Nonaktif") },
  { header: "Bank", width: 12, value: (e) => e.bank || "-" },
  { header: "No Rekening", width: 18, value: (e) => e.accountNumber || "-" },
  { header: "Kenaikan / Tahun", width: 16, currency: true, value: (e) => toNumber(e.annualRaise) },
  { header: "Tanggal Pertama Masuk", width: 18, value: (e) => e.firstJoinDate || "-" },
  { header: "Tanggal Kontrak", width: 16, value: (e) => e.contractDate || "-" },
  { header: "Tanggal Selesai Kontrak", width: 18, value: (e) => e.contractEndDate || "-" },
  {
    header: "Tipe Payroll Penjahit",
    width: 18,
    value: (e) =>
      e.penjahitPayrollType === "mingguan"
        ? "Mingguan"
        : e.penjahitPayrollType === "bulanan"
          ? "Bulanan"
          : "-",
  },
];

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const statusParam = (new URL(request.url).searchParams.get("status") || "semua").toLowerCase();
  const status: "aktif" | "nonaktif" | "semua" =
    statusParam === "aktif" || statusParam === "nonaktif" ? statusParam : "semua";

  const all = await listEmployees();
  const employees = status === "semua" ? all : all.filter((e) => e.dataStatus === status);

  const kategoriLabel = status === "semua" ? "Semua" : status === "aktif" ? "Aktif" : "Nonaktif";
  const now = new Date();
  const exportedAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(now);
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Web HR AvA Group";
  wb.created = now;
  const ws = wb.addWorksheet("Data Karyawan", {
    views: [{ state: "frozen", ySplit: 3, xSplit: 2 }],
  });

  const lastCol = COLUMNS.length;
  COLUMNS.forEach((c, idx) => {
    ws.getColumn(idx + 1).width = c.width;
  });

  const thin = { style: "thin" as const, color: { argb: "FFE0CFC8" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  // Row 1 — judul
  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "DATA KARYAWAN — AVA GROUP";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF8F1D22" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 26;

  // Row 2 — meta
  ws.mergeCells(2, 1, 2, lastCol);
  const metaCell = ws.getCell(2, 1);
  metaCell.value = `Kategori: ${kategoriLabel}     •     Total: ${employees.length} karyawan     •     Diekspor: ${exportedAt}`;
  metaCell.font = { italic: true, size: 10, color: { argb: "FF7A6059" } };
  metaCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(2).height = 18;

  // Row 3 — header
  const headerRow = ws.getRow(3);
  COLUMNS.forEach((c, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = c.header;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8F1D22" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border;
  });
  headerRow.height = 30;

  // Data
  employees.forEach((e, i) => {
    const row = ws.getRow(4 + i);
    COLUMNS.forEach((c, idx) => {
      const cell = row.getCell(idx + 1);
      const v = c.value(e, i);
      cell.value = v;
      cell.font = { size: 10, color: { argb: "FF2D1B18" } };
      cell.alignment = {
        vertical: "top",
        horizontal: c.currency ? "right" : "left",
        wrapText: !!c.wrap,
      };
      cell.border = border;
      if (c.currency) {
        cell.numFmt = '"Rp"#,##0';
      }
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF7F4" } };
      }
    });
  });

  // Auto-filter di baris header
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: lastCol } };

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `Data Karyawan ${kategoriLabel} ${dateStr}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
