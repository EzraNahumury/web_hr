import type { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { getFreelanceSheet, type FreelanceSheet } from "@/lib/payroll-freelance";

// Satu baris rincian pekerjaan freelance untuk slip.
export type FreelanceSlipItem = {
  jenis: string;
  detail: string;
  total: number;
};

export type FreelanceSlip = {
  employeeId: number;
  name: string;
  nip: string;
  role: string;
  department: string;
  bank: string;
  accountNumber: string;
  periodMonth: number;
  periodYear: number;
  items: FreelanceSlipItem[];
  grandTotal: number;
};

function rp(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

// Ekstrak rincian pekerjaan freelance untuk SATU karyawan dari sheet.
function buildItems(sheet: FreelanceSheet, employeeId: number): { items: FreelanceSlipItem[]; name: string } {
  const items: FreelanceSlipItem[] = [];
  let name = "";

  for (const r of sheet.jam) {
    if (r.employeeId !== employeeId) continue;
    name = name || r.name;
    if (r.total > 0 || r.jamKerja > 0) {
      items.push({ jenis: "Per Jam", detail: `${r.jamKerja} jam × ${rp(r.ratePerJam)}`, total: r.total });
    }
  }
  for (const r of sheet.pengerjaan) {
    if (r.employeeId !== employeeId) continue;
    name = name || r.name;
    items.push({ jenis: "Pengerjaan", detail: `${r.jumlahPcs} pcs × ${rp(r.hargaPerPcs)}`, total: r.total });
  }
  for (const r of sheet.harian) {
    if (r.employeeId !== employeeId) continue;
    name = name || r.name;
    items.push({ jenis: "Harian", detail: `${r.hariMasuk} hari × ${rp(r.hargaPerHari)}`, total: r.total });
  }
  for (const r of sheet.custom) {
    if (r.employeeId !== employeeId) continue;
    name = name || r.name;
    for (const it of r.items) {
      items.push({ jenis: it.namaJenis, detail: `${it.jumlahPcs} pcs × ${rp(it.hargaPerPcs)}`, total: it.total });
    }
  }

  return { items, name };
}

type KaryawanInfoRow = RowDataPacket & {
  id: number;
  no_karyawan: string | null;
  jabatan: string | null;
  departemen: string | null;
  bank: string | null;
  no_rekening: string | null;
};

async function getKaryawanInfo(ids: number[]) {
  const map = new Map<number, { nip: string; role: string; department: string; bank: string; accountNumber: string }>();
  if (ids.length === 0) return map;
  const [rows] = await pool.query<KaryawanInfoRow[]>(
    `SELECT id, no_karyawan, jabatan, departemen, bank, no_rekening FROM karyawan WHERE id IN (?)`,
    [ids],
  );
  for (const r of rows) {
    map.set(r.id, {
      nip: r.no_karyawan || "-",
      role: r.jabatan || "-",
      department: r.departemen || "-",
      bank: r.bank || "-",
      accountNumber: r.no_rekening || "-",
    });
  }
  return map;
}

// Slip gaji freelance untuk SATU karyawan pada satu periode. Dihitung LIVE dari getFreelanceSheet
// (freelance tidak punya baris di tabel payroll). null bila tidak ada pekerjaan pada periode itu.
export async function getFreelanceSlipForEmployee(
  employeeId: number,
  month: number,
  year: number,
): Promise<FreelanceSlip | null> {
  const sheet = await getFreelanceSheet({ month, year });
  if (!sheet) return null;

  const { items, name } = buildItems(sheet, employeeId);
  if (items.length === 0) return null;

  const info = (await getKaryawanInfo([employeeId])).get(employeeId);
  return {
    employeeId,
    name,
    nip: info?.nip ?? "-",
    role: info?.role ?? "-",
    department: info?.department ?? "-",
    bank: info?.bank ?? "-",
    accountNumber: info?.accountNumber ?? "-",
    periodMonth: sheet.periodMonth,
    periodYear: sheet.periodYear,
    items,
    grandTotal: items.reduce((s, it) => s + it.total, 0),
  };
}

// Semua slip freelance yang ADA pekerjaannya pada periode (untuk builder slip admin).
export async function getFreelanceSlipsForPeriod(month: number, year: number): Promise<FreelanceSlip[]> {
  const sheet = await getFreelanceSheet({ month, year });
  if (!sheet) return [];

  const ids = new Set<number>();
  for (const r of sheet.jam) if (r.total > 0 || r.jamKerja > 0) ids.add(r.employeeId);
  for (const r of sheet.pengerjaan) ids.add(r.employeeId);
  for (const r of sheet.harian) ids.add(r.employeeId);
  for (const r of sheet.custom) if (r.items.length > 0) ids.add(r.employeeId);

  const info = await getKaryawanInfo([...ids]);
  const slips: FreelanceSlip[] = [];
  for (const id of ids) {
    const { items, name } = buildItems(sheet, id);
    if (items.length === 0) continue;
    const inf = info.get(id);
    slips.push({
      employeeId: id,
      name,
      nip: inf?.nip ?? "-",
      role: inf?.role ?? "-",
      department: inf?.department ?? "-",
      bank: inf?.bank ?? "-",
      accountNumber: inf?.accountNumber ?? "-",
      periodMonth: sheet.periodMonth,
      periodYear: sheet.periodYear,
      items,
      grandTotal: items.reduce((s, it) => s + it.total, 0),
    });
  }
  return slips.sort((a, b) => a.name.localeCompare(b.name, "id-ID"));
}
