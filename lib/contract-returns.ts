import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { pool } from "@/lib/db";

// Deposit kontrak standar = 200.000 x 5 bulan.
export const STANDARD_CONTRACT_DEPOSIT = 1_000_000;

export type ContractReturnItem = {
  employeeId: number;
  name: string;
  nip: string;
  role: string;
  division: string;
  department: string;
  employmentStatus: string;
  contractDate: string | null;
  hasPlan: boolean;
  plannedTotal: number;
  deductedTotal: number;
  remaining: number;
  // Nilai yang harus dikembalikan (lunas = penuh, belum lunas = sudah terpotong).
  returnAmount: number;
  status: "lunas" | "belum_lunas";
  returned: boolean;
  returnedAmount: number | null;
  returnedDate: string | null;
  returnedNote: string | null;
  returnedBy: string | null;
};

type EmployeeRow = RowDataPacket & {
  id: number;
  nama: string;
  no_karyawan: string | null;
  jabatan: string | null;
  divisi: string | null;
  departemen: string | null;
  status_kepegawaian: string | null;
  tanggal_kontrak: string | null;
};

type ReturnRow = RowDataPacket & {
  karyawan_id: number;
  nominal: string | null;
  tanggal_pengembalian: string | null;
  catatan: string | null;
  dikembalikan_oleh: string | null;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

let returnTableReady: Promise<void> | null = null;

export async function ensureContractReturnTable() {
  if (!returnTableReady) {
    returnTableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pengembalian_kontrak (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          karyawan_id BIGINT UNSIGNED NOT NULL,
          nominal DECIMAL(14,2) NOT NULL DEFAULT 0,
          tanggal_pengembalian DATE NULL,
          catatan VARCHAR(255) NULL,
          dikembalikan_oleh VARCHAR(150) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_pengembalian_karyawan (karyawan_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })();
  }
  return returnTableReady;
}

export async function listContractReturns(): Promise<ContractReturnItem[]> {
  await ensureContractReturnTable();
  // SUMBER OTORITATIF: pakai plan yang SAMA PERSIS dengan modul Potongan Kontrak
  // (buildPlan via listContractDeductionPlans). Dulu modul ini menghitung ulang
  // "sudah terpotong" dari baris potongan_kontrak DB + periode aktif sendiri, sehingga
  // bisa divergen (mis. Pengembalian "lunas 1jt" padahal Potongan Kontrak "terpotong 800rb").
  // listContractDeductionPlans() sudah memanggil cleanupIneligibleContractSchedules().
  const { listContractDeductionPlans } = await import("@/lib/contract-deductions");

  const [employees, plans, returnedRows] = await Promise.all([
    pool.query<EmployeeRow[]>(
      `
        SELECT
          k.id,
          k.nama,
          k.no_karyawan,
          k.jabatan,
          k.divisi,
          k.departemen,
          k.status_kepegawaian,
          DATE_FORMAT(k.tanggal_kontrak, '%Y-%m-%d') AS tanggal_kontrak
        FROM karyawan k
        WHERE k.status_data = 'aktif'
          AND LOWER(COALESCE(k.status_kepegawaian, '')) NOT IN ('tetap', 'freelance')
          AND LOWER(COALESCE(k.jabatan, '')) NOT IN ('freelance', 'sales nasional')
        ORDER BY k.nama ASC
      `,
    ),
    listContractDeductionPlans(),
    pool.query<ReturnRow[]>(
      `SELECT karyawan_id, nominal,
              DATE_FORMAT(tanggal_pengembalian, '%Y-%m-%d') AS tanggal_pengembalian,
              catatan, dikembalikan_oleh
       FROM pengembalian_kontrak`,
    ),
  ]);

  // Map: karyawan -> plan Potongan Kontrak (angka terpotong/sisa yang otoritatif).
  const planByEmp = new Map<number, (typeof plans)[number]>();
  for (const p of plans) planByEmp.set(p.employeeId, p);

  const returnedMap = new Map<number, ReturnRow>();
  for (const r of returnedRows[0]) returnedMap.set(r.karyawan_id, r);

  return employees[0].map((emp) => {
    const plan = planByEmp.get(emp.id) ?? null;
    const hasPlan = plan !== null;

    let plannedTotal: number;
    let deductedTotal: number;
    let remaining: number;
    let status: "lunas" | "belum_lunas";

    if (!plan) {
      // Tanpa jadwal (tak ada tanggal kontrak) -> dianggap lunas sebelum web ada.
      plannedTotal = STANDARD_CONTRACT_DEPOSIT;
      deductedTotal = STANDARD_CONTRACT_DEPOSIT;
      remaining = 0;
      status = "lunas";
    } else {
      // Ambil PERSIS dari plan (identik dengan tampilan Potongan Kontrak).
      plannedTotal = toNumber(plan.totalPlannedDeduction);
      deductedTotal = toNumber(plan.totalDeductedAmount);
      remaining = toNumber(plan.remainingDeduction);
      status = remaining <= 0 ? "lunas" : "belum_lunas";
    }

    // Pengembalian = yang sudah terpotong (lunas = penuh, belum lunas = sebagian).
    const returnAmount = deductedTotal;

    const ret = returnedMap.get(emp.id) ?? null;

    return {
      employeeId: emp.id,
      name: emp.nama,
      nip: emp.no_karyawan || "-",
      role: emp.jabatan || "-",
      division: emp.divisi || "-",
      department: emp.departemen || "-",
      employmentStatus: emp.status_kepegawaian || "-",
      contractDate: emp.tanggal_kontrak,
      hasPlan,
      plannedTotal,
      deductedTotal,
      remaining,
      returnAmount,
      status,
      returned: !!ret,
      returnedAmount: ret ? toNumber(ret.nominal) : null,
      returnedDate: ret?.tanggal_pengembalian ?? null,
      returnedNote: ret?.catatan ?? null,
      returnedBy: ret?.dikembalikan_oleh ?? null,
    } satisfies ContractReturnItem;
  });
}

export async function markContractReturn(payload: {
  employeeId: number;
  nominal: number;
  tanggal: string | null;
  catatan: string | null;
  adminName: string | null;
}) {
  await ensureContractReturnTable();
  await pool.query<ResultSetHeader>(
    `
      INSERT INTO pengembalian_kontrak (karyawan_id, nominal, tanggal_pengembalian, catatan, dikembalikan_oleh)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nominal = VALUES(nominal),
        tanggal_pengembalian = VALUES(tanggal_pengembalian),
        catatan = VALUES(catatan),
        dikembalikan_oleh = VALUES(dikembalikan_oleh)
    `,
    [payload.employeeId, payload.nominal, payload.tanggal, payload.catatan, payload.adminName],
  );
}

export async function unmarkContractReturn(employeeId: number) {
  await ensureContractReturnTable();
  await pool.query<ResultSetHeader>(
    `DELETE FROM pengembalian_kontrak WHERE karyawan_id = ?`,
    [employeeId],
  );
}
