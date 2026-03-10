import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

type Props = {
  title: string;
  description: string;
  employeeName: string;
  employeeMeta: string;
  currentPath: string;
  children: React.ReactNode;
};

const menuItems = [
  { label: "Dashboard", href: "/employee", description: "Ringkasan akun karyawan" },
  { label: "Presensi Masuk", href: "/employee/check-in", description: "Selfie dan lokasi masuk" },
  { label: "Presensi Pulang", href: "/employee/check-out", description: "Selfie dan lokasi pulang" },
  { label: "Riwayat Absensi", href: "/employee/attendance-history", description: "Rekap kehadiran pribadi" },
  { label: "Data Lembur", href: "/employee/overtime", description: "Pengajuan dan status lembur" },
  { label: "Status Pinjaman", href: "/employee/loans", description: "Sisa pinjaman dan cicilan" },
  { label: "Informasi Kontrak", href: "/employee/contract", description: "Kontrak dan potongan kerja" },
  { label: "Slip Gaji", href: "/employee/payslips", description: "Daftar slip gaji pribadi" },
];

function MenuIcon({ active }: { active?: boolean }) {
  return (
    <span
      className={
        active
          ? "flex h-10 w-10 items-center justify-center rounded-xl bg-white/14 text-white"
          : "flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#c6b1b4]"
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="6" height="6" rx="1.4" />
        <rect x="14" y="4" width="6" height="6" rx="1.4" />
        <rect x="4" y="14" width="6" height="6" rx="1.4" />
        <rect x="14" y="14" width="6" height="6" rx="1.4" />
      </svg>
    </span>
  );
}

export default function EmployeeShell({
  title,
  description,
  employeeName,
  employeeMeta,
  currentPath,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-[#f5f2f1] text-[#141414]">
      <section className="flex min-h-screen flex-col xl:flex-row">
        <aside className="relative w-full overflow-hidden bg-[linear-gradient(180deg,#090909_0%,#111111_55%,#1a0608_100%)] text-white xl:min-h-screen xl:w-[252px] xl:flex-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.14),transparent_26%)]" />
          <div className="relative flex h-full flex-col px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ef4444_0%,#991b1b_100%)] shadow-[0_16px_32px_rgba(185,28,28,0.35)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M8 7h8" strokeLinecap="round" />
                  <path d="M8 12h8" strokeLinecap="round" />
                  <path d="M8 17h5" strokeLinecap="round" />
                  <rect x="4" y="3.5" width="16" height="17" rx="3" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold tracking-[-0.03em]">Portal Karyawan</p>
                <p className="text-xs text-[#c6b1b4]">AYRES HR System</p>
              </div>
            </div>

            <nav className="mt-8 space-y-1.5">
              {menuItems.map((item) => {
                const active = item.href === currentPath;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] px-3 py-2.5 text-white shadow-[0_16px_30px_rgba(185,28,28,0.34)]"
                        : "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[#f7eaea] transition hover:bg-white/5"
                    }
                  >
                    <MenuIcon active={active} />
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className={active ? "mt-0.5 text-[11px] text-white/78" : "mt-0.5 text-[11px] text-[#b08b91]"}>
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b08b91]">
                  Karyawan Aktif
                </p>
                <p className="mt-3 text-sm font-semibold text-white">{employeeName}</p>
                <p className="mt-1 text-xs text-[#d6bfc2]">{employeeMeta}</p>
              </div>
              <div className="[&_button]:h-11 [&_button]:w-full [&_button]:rounded-2xl [&_button]:border [&_button]:border-white/10 [&_button]:bg-white/6 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-white [&_button]:shadow-none [&_button]:transition hover:[&_button]:bg-white/10 hover:[&_button]:text-white">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <section className="min-h-screen flex-1 bg-[#f6f3f2]">
          <header className="sticky top-0 z-20 border-b border-[#ead9d6] bg-[#fbf8f7]/95 px-6 py-4 backdrop-blur sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ead9d6] bg-white text-[#7b4a4f]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M4 7h16" strokeLinecap="round" />
                    <path d="M4 12h16" strokeLinecap="round" />
                    <path d="M4 17h10" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3767b]">
                    Employee Workspace
                  </p>
                  <h1 className="mt-1 text-[1.8rem] font-semibold tracking-[-0.04em] text-[#1b1314]">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="rounded-full border border-[#ead9d6] bg-white px-4 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a3767b]">
                  Akses
                </p>
                <p className="mt-1 text-xs font-semibold text-[#1b1314]">Karyawan aktif</p>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7d5b60]">{description}</p>
          </header>

          <div className="px-6 py-6 sm:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </section>
      </section>
    </main>
  );
}
