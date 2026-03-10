import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { listPayslips } from "@/lib/hris";

export default async function AdminPayslipsPage() {
  const admin = await requireAdminSession();
  const rows = await listPayslips();

  return (
    <AdminShell
      title="Slip Gaji"
      description="Arsip slip gaji normal dan sales dibaca dari tabel slip_gaji dan payroll. Halaman ini fokus pada detail yang dibutuhkan admin."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/payslips"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-[32px] border border-[#ead7ce] bg-white p-6 shadow-[0_20px_60px_rgba(96,45,34,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#a16f63]">{row.nomor_slip}</p>
                <h3 className="mt-3 text-2xl font-semibold text-[#241716]">{row.nama}</h3>
                <p className="mt-1 text-sm text-[#7a6059]">{row.jabatan} / {row.divisi}</p>
              </div>
              <span className="rounded-full border border-[#edd8cf] bg-[#fff7f2] px-3 py-1 text-xs font-semibold text-[#7f5e56]">
                {row.status_distribusi}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[#fff8f4] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a16f63]">Periode</p>
                <p className="mt-2 font-semibold text-[#2f1f1d]">{row.periode_bulan}/{row.periode_tahun}</p>
              </div>
              <div className="rounded-[22px] bg-[#fff8f4] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a16f63]">Gaji Bersih</p>
                <p className="mt-2 font-semibold text-[#8f1d22]">Rp{row.gaji_bersih}</p>
              </div>
              <div className="rounded-[22px] bg-[#fff8f4] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a16f63]">Bank</p>
                <p className="mt-2 font-semibold text-[#2f1f1d]">{row.bank || "-"}</p>
              </div>
              <div className="rounded-[22px] bg-[#fff8f4] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a16f63]">No Rekening</p>
                <p className="mt-2 font-semibold text-[#2f1f1d]">{row.no_rekening || "-"}</p>
              </div>
            </div>

            <div className="mt-5 text-sm leading-7 text-[#725d56]">
              Hari kerja: {row.hari_kerja} | Lembur: {row.total_lembur_jam} jam | Terlambat: {row.total_terlambat} menit | Setengah hari: {row.total_setengah_hari}
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
