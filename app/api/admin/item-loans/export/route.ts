import ExcelJS from "exceljs";

import { getCurrentAdminSession } from "@/lib/auth";
import { listItemLoans } from "@/lib/item-loans";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const rows = await listItemLoans();

  const now = new Date();
  const exportedAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(now);
  const totalItems = rows.reduce((sum, r) => sum + r.items.length, 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Web HR AvA Group";
  wb.created = now;
  const ws = wb.addWorksheet("Peminjaman Barang", { views: [{ state: "frozen", ySplit: 3 }] });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 36;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 40;

  const thin = { style: "thin" as const, color: { argb: "FFE0CFC8" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  ws.mergeCells(1, 1, 1, 6);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "PEMINJAMAN BARANG / ASET PERUSAHAAN";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF8F1D22" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, 6);
  const metaCell = ws.getCell(2, 1);
  metaCell.value = `Total: ${rows.length} catatan     •     ${totalItems} barang     •     Diekspor: ${exportedAt}`;
  metaCell.font = { italic: true, size: 10, color: { argb: "FF7A6059" } };
  ws.getRow(2).height = 18;

  const headers = ["No", "Nama", "NIP", "Barang Dipinjam", "Tgl Peminjaman", "Keterangan"];
  const headerRow = ws.getRow(3);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8F1D22" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border;
  });
  headerRow.height = 26;

  rows.forEach((r, i) => {
    const row = ws.getRow(4 + i);
    const names = r.employees.map((e) => e.name).join("\n") || "-";
    const nips = r.employees.map((e) => e.nip).join("\n") || "-";
    const items = r.items.join("\n") || "-";
    const values: (string | number)[] = [i + 1, names, nips, items, r.loanDate || "-", r.note || "-"];
    values.forEach((v, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = v;
      cell.font = { size: 10, color: { argb: "FF2D1B18" } };
      cell.alignment = {
        vertical: "top",
        horizontal: idx === 0 || idx === 4 ? "center" : "left",
        wrapText: idx === 1 || idx === 2 || idx === 3 || idx === 5,
      };
      cell.border = border;
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF6F1" } };
      }
    });
  });

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 6 } };

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(now);
  const filename = `PEMINJAMAN BARANG ${stamp}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
