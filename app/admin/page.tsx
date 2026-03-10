import Image from "next/image";
import Link from "next/link";

import AdminShell from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/auth";
import { getAdminDashboardStats } from "@/lib/hris";

const statCards = [
  {
    key: "totalEmployees",
    label: "Total Karyawan",
    description: "Data master aktif yang sudah tercatat di sistem.",
    accent: "from-white to-[#faf4f3]",
    valueClassName: "text-[#161010]",
    inverse: false,
  },
  {
    key: "attendanceToday",
    label: "Absensi Hari Ini",
    description: "Jumlah record presensi yang masuk hari ini.",
    accent: "from-[#fff1f1] to-white",
    valueClassName: "text-[#b91c1c]",
    inverse: false,
  },
  {
    key: "payrollPending",
    label: "Payroll Pending",
    description: "Draft payroll yang masih menunggu proses berikutnya.",
    accent: "from-[#ef4444] to-[#7f1d1d]",
    valueClassName: "text-white",
    inverse: true,
  },
] as const;

const quickLinks = [
  {
    href: "/admin/employees",
    title: "Data Karyawan",
    description: "Kelola akun login, identitas kerja, kontrak, dan rekening.",
    badge: "Master",
  },
  {
    href: "/admin/attendance",
    title: "Rekap Absensi",
    description: "Pantau spreadsheet absensi mingguan dan bulanan.",
    badge: "Live",
  },
  {
    href: "/admin/overtime",
    title: "Approval Lembur",
    description: "Review bukti lembur dan ambil keputusan approval.",
    badge: "Action",
  },
  {
    href: "/admin/loans",
    title: "Pinjaman",
    description: "Lihat pinjaman aktif, cicilan, dan sisa kewajiban.",
    badge: "Finance",
  },
  {
    href: "/admin/payroll-summary",
    title: "Summary Payroll",
    description: "Cek komponen payroll bulanan sebelum distribusi.",
    badge: "Payroll",
  },
  {
    href: "/admin/payslips",
    title: "Slip Gaji",
    description: "Akses slip gaji yang sudah dibuat dan siap dibagikan.",
    badge: "Output",
  },
];

export default async function AdminDashboardPage() {
  const admin = await requireAdminSession();
  const stats = await getAdminDashboardStats();

  return (
    <AdminShell
      title="Dashboard Admin"
      description="Ringkasan utama admin yang terhubung langsung ke database payroll dan absensi."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin"
    >
      <section>
        <div className="overflow-hidden rounded-[28px] border border-[#ead9d6] bg-white shadow-[0_20px_60px_rgba(68,16,16,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.16),_transparent_42%),linear-gradient(135deg,_#ffffff,_#fff7f6)] p-8">
            <div className="mb-6 inline-flex rounded-full border border-[#f1cfcb] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#b91c1c]">
              Overview
            </div>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-4xl font-semibold tracking-tight text-[#161010]">
                  Panel admin yang lebih ringkas dan langsung ke modul kerja.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[#70575a]">
                  Kelola data karyawan, pantau absensi, review lembur, dan lanjut ke
                  proses payroll tanpa tampilan yang terlalu ramai.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center justify-center rounded-[24px] border border-[#ead9d6] bg-[#181010] px-5 py-4 shadow-[0_12px_30px_rgba(68,16,16,0.16)]">
                  <Image
                    src="/logo/new logo.png"
                    alt="AYRES"
                    width={180}
                    height={56}
                    priority
                    className="h-auto w-[140px] sm:w-[168px]"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/admin/employees"
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#161010] px-5 text-sm font-semibold text-white transition hover:bg-[#2b1718]"
                  >
                    Kelola Karyawan
                  </Link>
                  <Link
                    href="/admin/attendance"
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#ead9d6] bg-white px-5 text-sm font-semibold text-[#6d4d51] transition hover:border-[#d9b8b2] hover:text-[#b91c1c]"
                  >
                    Buka Rekap Absensi
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {statCards.map((card) => {
          const value = stats[card.key];

          return (
            <article
              key={card.key}
              className={[
                "rounded-[24px] border px-6 py-6 shadow-[0_16px_40px_rgba(68,16,16,0.06)]",
                card.inverse
                  ? "border-[#b91c1c] bg-gradient-to-br text-white shadow-[0_20px_50px_rgba(185,28,28,0.28)]"
                  : "border-[#ead9d6] bg-gradient-to-br text-[#161010]",
                card.accent,
              ].join(" ")}
            >
              <div
                className={[
                  "text-[11px] font-semibold uppercase tracking-[0.28em]",
                  card.inverse ? "text-[#ffe8e8]" : "text-[#a3767b]",
                ].join(" ")}
              >
                {card.label}
              </div>
              <div
                className={[
                  "mt-5 text-5xl font-semibold tracking-tight",
                  card.valueClassName,
                ].join(" ")}
              >
                {value}
              </div>
              <p
                className={[
                  "mt-3 text-sm leading-6",
                  card.inverse ? "text-[#fff1f1]" : "text-[#70575a]",
                ].join(" ")}
              >
                {card.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] border border-[#ead9d6] bg-white p-8 shadow-[0_16px_40px_rgba(68,16,16,0.06)]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a3767b]">
              Modul Utama
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#161010]">
              Akses cepat admin
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#70575a]">
              Pilih modul kerja yang paling sering dipakai tanpa harus scroll panjang.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[24px] border border-[#ead9d6] bg-[#fdf9f8] p-5 transition hover:-translate-y-0.5 hover:border-[#d9b8b2] hover:bg-white hover:shadow-[0_18px_32px_rgba(185,28,28,0.1)]"
              >
                <div className="inline-flex rounded-full border border-[#f1cfcb] bg-[#fff1f1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b91c1c]">
                  {item.badge}
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#161010]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#70575a]">{item.description}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#ead9d6] bg-white text-lg text-[#a3767b] transition group-hover:border-[#d9b8b2] group-hover:text-[#b91c1c]">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#ead9d6] bg-white p-8 shadow-[0_16px_40px_rgba(68,16,16,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a3767b]">
            Ringkas
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#161010]">
            Prioritas hari ini
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#70575a]">
            Blok ringkas untuk bantu admin fokus ke pekerjaan yang paling penting dulu.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-[#ead9d6] bg-[#fdf9f8] p-4">
              <div className="text-sm font-semibold text-[#161010]">Absensi masuk hari ini</div>
              <div className="mt-2 text-sm text-[#70575a]">
                {stats.attendanceToday} record presensi sudah masuk ke tabel absensi.
              </div>
            </div>
            <div className="rounded-2xl border border-[#ead9d6] bg-[#fdf9f8] p-4">
              <div className="text-sm font-semibold text-[#161010]">Draft payroll aktif</div>
              <div className="mt-2 text-sm text-[#70575a]">
                {stats.payrollPending} draft payroll masih menunggu proses lanjutan.
              </div>
            </div>
            <div className="rounded-2xl border border-[#ead9d6] bg-[#fdf9f8] p-4">
              <div className="text-sm font-semibold text-[#161010]">Distribusi slip</div>
              <div className="mt-2 text-sm text-[#70575a]">
                {stats.payslipsPending} slip gaji belum terdistribusi ke akun karyawan.
              </div>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
