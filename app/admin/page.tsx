import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";
import { getAdminDashboardStats } from "@/lib/hris";

export default async function AdminPage() {
  const admin = await requireAdminSession();
  const stats = await getAdminDashboardStats();

  return (
    <AdminShell
      title="Dashboard Admin"
      description="Semua ringkasan utama admin sekarang membaca langsung dari tabel di database hris_payroll_app."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin"
    >
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
          <div className="rounded-[28px] border border-[#dfe5ef] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a96ad]">
                  Overview
                </p>
                <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-[#172033]">
                  Dashboard Admin
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#66748f]">
                  Pantau ringkasan operasional HR, akses modul penting, dan cek
                  status data payroll langsung dari database aktif.
                </p>
              </div>

              <Link
                href="/admin/attendance"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5b4fff_0%,#4a6fff_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(76,91,255,0.24)] transition hover:translate-y-[-1px]"
              >
                Buka Rekap Absensi
              </Link>
            </div>
          </div>

          <article className="rounded-[28px] border border-[#dfe5ef] bg-[#0f172f] p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#92a0c5]">
              Status Sistem
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
              Database Live
            </p>
            <p className="mt-3 text-sm leading-7 text-[#a8b5d3]">
              Semua ringkasan di halaman ini sudah membaca data langsung dari
              tabel utama `karyawan`, `absensi`, dan `payroll`.
            </p>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a96ad]">
              Total Karyawan
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#172033]">
              {stats.totalEmployees}
            </p>
            <p className="mt-2 text-sm text-[#66748f]">Data dari tabel `karyawan`</p>
          </article>

          <article className="rounded-[24px] border border-[#dfe5ef] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a96ad]">
              Absensi Hari Ini
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#172033]">
              {stats.attendanceToday}
            </p>
            <p className="mt-2 text-sm text-[#66748f]">
              Tercatat di tabel `absensi`.
            </p>
          </article>

          <article className="rounded-[24px] border border-[#4b5cff]/10 bg-[linear-gradient(135deg,#5b4fff_0%,#4a6fff_100%)] p-5 text-white shadow-[0_18px_40px_rgba(76,91,255,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              Payroll Pending
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {stats.payrollPending}
            </p>
            <p className="mt-2 text-sm text-white/78">
              Draft dan processed di tabel `payroll`.
            </p>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr,0.9fr]">
          <Link
            href="/admin/attendance"
            className="group overflow-hidden rounded-[28px] border border-[#dfe5ef] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8a96ad]">
                  Quick Access
                </p>
                <h3 className="mt-4 text-[1.8rem] font-semibold leading-none tracking-[-0.05em] text-[#172033]">
                  Buka Rekap Absensi
                </h3>
                <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#66748f]">
                  Lihat tabel absensi bulanan bergaya spreadsheet yang ditarik
                  langsung dari tabel `absensi`, `karyawan`, dan `users`.
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#5b4fff_0%,#4a6fff_100%)] text-white shadow-[0_16px_36px_rgba(76,91,255,0.22)] transition-transform group-hover:translate-x-1">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" strokeLinecap="round" />
                  <path d="M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </Link>

          <div className="rounded-[28px] border border-[#dfe5ef] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8a96ad]">
              Modul Live
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#172033]">
              Terhubung ke DB
            </h3>
            <div className="mt-5 space-y-3">
              {[
                "Data Karyawan",
                "Absensi",
                "Lembur",
                "Pinjaman",
                "Payroll",
                "Slip Gaji",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-[20px] border border-[#e5eaf2] bg-[#f9fbfe] px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1f2a3d]">{item}</p>
                    <p className="mt-1 text-xs text-[#7a879f]">Baca data langsung dari MySQL</p>
                  </div>
                  <span className="text-sm font-semibold text-[#8a96ad]">
                    0{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
