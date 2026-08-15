import type { NextRequest } from "next/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { RowDataPacket } from "mysql2";

import { getCurrentAdminSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getCombinedFinanceRowsUncached } from "@/lib/finance-rows";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function parsePositiveInt(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function rupiah(n: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(n || 0))}`;
}

// Download Gaji: 1 PDF berisi karyawan lintas menu Summary Payroll
// (utama/Solo/Sales Nasional/Penjahit/Partime), TANPA freelance. Nilai = kolom
// TAKE HOME PAY SEBELUM DIPOTONG (totalSalaryBeforeDeduction).
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdminSession();
  if (!admin) return new Response("Unauthorized.", { status: 401 });

  const url = new URL(request.url);
  const month = parsePositiveInt(url.searchParams.get("month"));
  const year = parsePositiveInt(url.searchParams.get("year"));
  if (!month || month > 12 || !year) {
    return new Response("Periode tidak valid.", { status: 400 });
  }

  const { rows } = await getCombinedFinanceRowsUncached({ month, year });

  // Kumpulkan id karyawan freelance untuk dikecualikan.
  const [freelanceRows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM karyawan
     WHERE LOWER(COALESCE(status_kepegawaian, '')) = 'freelance'
        OR LOWER(COALESCE(jabatan, '')) = 'freelance'`,
  );
  const freelanceIds = new Set(freelanceRows.map((r) => r.id));

  // Exclude freelance (by id maupun by role hasil map freelance) lalu urutkan by nama.
  const sorted = rows
    .filter((r) => !freelanceIds.has(r.employeeId) && (r.role || "").trim().toLowerCase() !== "freelance")
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"));
  const total = sorted.reduce((sum, r) => sum + (r.totalSalaryBeforeDeduction || 0), 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LAPORAN TAKE HOME PAY (SEBELUM POTONGAN)", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Periode: ${MONTHS[month - 1]} ${year}`, 14, 23);
  doc.text(`Total karyawan: ${sorted.length}`, 14, 28.5);

  autoTable(doc, {
    startY: 34,
    head: [["No", "Nama", "Departemen", "THP Sebelum Potongan"]],
    body: sorted.map((r, i) => [
      i + 1,
      (r.name || "").toUpperCase(),
      r.department || "-",
      rupiah(r.totalSalaryBeforeDeduction || 0),
    ]),
    foot: [["", "", "TOTAL", rupiah(total)]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.4, valign: "middle", lineColor: [230, 210, 200] },
    headStyles: { fillColor: [143, 29, 34], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    footStyles: { fillColor: [244, 235, 230], textColor: [36, 23, 22], fontStyle: "bold", halign: "right" },
    alternateRowStyles: { fillColor: [252, 248, 245] },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      1: { halign: "left", cellWidth: 90 },
      2: { halign: "left" },
      3: { halign: "right", cellWidth: 40 },
    },
  });

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `THP-SEBELUM-POTONGAN-${year}-${String(month).padStart(2, "0")}.pdf`;
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
