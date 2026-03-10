import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

type MenuItem = {
  label: string;
  href: string;
  description: string;
  disabled?: boolean;
};

type Props = {
  title: string;
  description: string;
  adminName: string;
  adminEmail: string;
  currentPath: string;
  children: React.ReactNode;
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    description: "Ringkasan panel admin",
  },
  {
    label: "Data Karyawan",
    href: "/admin/employees",
    description: "Kelola master karyawan",
  },
  {
    label: "Absensi",
    href: "/admin/attendance",
    description: "Presensi dan keterlambatan",
  },
  {
    label: "Lembur",
    href: "/admin/overtime",
    description: "Approval dan rekap lembur",
  },
  {
    label: "Pinjaman",
    href: "/admin/loans",
    description: "Pinjaman karyawan",
  },
  {
    label: "Potongan Kontrak",
    href: "/admin/contract-deductions",
    description: "Potongan per bulan",
  },
  {
    label: "Summary Payroll",
    href: "/admin/payroll-summary",
    description: "Ringkasan payroll",
  },
  {
    label: "Finance",
    href: "/admin/finance",
    description: "Pembebanan dan pencairan",
  },
  {
    label: "Slip Gaji",
    href: "/admin/payslips",
    description: "Detail slip gaji",
  },
  {
    label: "Distribusi Slip",
    href: "/admin/payslip-distribution",
    description: "Log distribusi slip",
  },
];

function GridIcon({ active }: { active?: boolean }) {
  return (
    <span
      className={
        active
          ? "flex h-10 w-10 items-center justify-center rounded-xl bg-white/14 text-white"
          : "flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#91a0c4]"
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

export default function AdminShell({
  title,
  description,
  adminName,
  adminEmail,
  currentPath,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-[#f5f2f1] text-[#141414]">
      <section className="min-h-screen xl:pl-[252px]">
        <aside className="relative w-full overflow-hidden bg-[linear-gradient(180deg,#090909_0%,#111111_55%,#1a0608_100%)] text-white xl:fixed xl:inset-y-0 xl:left-0 xl:z-30 xl:h-screen xl:w-[252px] xl:flex-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.14),transparent_26%)]" />
          <div className="relative flex h-full flex-col px-5 py-6 xl:overflow-y-auto">
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
                <p className="text-base font-semibold tracking-[-0.03em]">
                  HR Admin
                </p>
                <p className="text-xs text-[#c6b1b4]">AYRES Payroll System</p>
              </div>
            </div>

            <nav className="mt-8 space-y-1.5">
              {menuItems.map((item) => {
                const active = item.href === currentPath;

                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 opacity-50"
                    >
                        <GridIcon />
                      <div>
                        <p className="text-sm font-semibold text-[#f4dddd]">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#b08b91]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                  key={item.label}
                  href={item.href}
                  className={
                      active
                        ? "flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] px-3 py-2.5 text-white shadow-[0_16px_30px_rgba(185,28,28,0.34)]"
                        : "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[#f7eaea] transition hover:bg-white/5"
                    }
                  >
                    <GridIcon active={active} />
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p
                        className={
                          active
                            ? "mt-0.5 text-[11px] text-white/78"
                            : "mt-0.5 text-[11px] text-[#b08b91]"
                        }
                      >
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-5">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b08b91]">
                  Admin Aktif
                </p>
                <p className="mt-3 text-sm font-semibold text-white">
                  {adminName}
                </p>
                <p className="mt-1 break-all text-xs text-[#d6bfc2]">
                  {adminEmail}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-h-screen bg-[#f6f3f2]">
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
                    Admin Workspace
                  </p>
                  <h1 className="mt-1 text-[1.8rem] font-semibold tracking-[-0.04em] text-[#1b1314]">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="[&_button]:h-11 [&_button]:rounded-full [&_button]:border [&_button]:border-[#ead9d6] [&_button]:bg-white [&_button]:px-5 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-[#1b1314] [&_button]:shadow-none hover:[&_button]:border-[#d9b8b2] hover:[&_button]:bg-[#fff4f3]">
                <LogoutButton />
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7d5b60]">
              {description}
            </p>
          </header>

          <div className="px-6 py-6 sm:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </section>
      </section>
    </main>
  );
}
