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
    <main className="min-h-screen bg-[#eef2f7] text-[#0f172a]">
      <section className="flex min-h-screen flex-col xl:flex-row">
        <aside className="relative w-full overflow-hidden bg-[linear-gradient(180deg,#08112d_0%,#091533_52%,#071126_100%)] text-white xl:min-h-screen xl:w-[252px] xl:flex-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(98,86,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(0,195,255,0.08),transparent_22%)]" />
          <div className="relative flex h-full flex-col px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5b4fff_0%,#4a6fff_100%)] shadow-[0_16px_32px_rgba(91,79,255,0.32)]">
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
                <p className="text-xs text-[#92a0c5]">AYRES Payroll System</p>
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
                        <p className="text-sm font-semibold text-[#d9e2ff]">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#7f91bc]">
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
                        ? "flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#5b4fff_0%,#4a6fff_100%)] px-3 py-2.5 text-white shadow-[0_16px_30px_rgba(76,91,255,0.34)]"
                        : "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[#dfe7ff] transition hover:bg-white/5"
                    }
                  >
                    <GridIcon active={active} />
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p
                        className={
                          active
                            ? "mt-0.5 text-[11px] text-white/72"
                            : "mt-0.5 text-[11px] text-[#7f91bc]"
                        }
                      >
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7f91bc]">
                  Admin Aktif
                </p>
                <p className="mt-3 text-sm font-semibold text-white">
                  {adminName}
                </p>
                <p className="mt-1 break-all text-xs text-[#9baad0]">
                  {adminEmail}
                </p>
              </div>
              <div className="[&_button]:h-11 [&_button]:w-full [&_button]:rounded-2xl [&_button]:border [&_button]:border-white/10 [&_button]:bg-white/6 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-white [&_button]:transition hover:[&_button]:bg-white/10">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <section className="min-h-screen flex-1 bg-[#f3f5f9]">
          <header className="sticky top-0 z-20 border-b border-[#dbe2ee] bg-[#f8fafc]/95 px-6 py-4 backdrop-blur sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d8e0ef] bg-white text-[#5b6680]">
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
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a96ad]">
                    Admin Workspace
                  </p>
                  <h1 className="mt-1 text-[1.8rem] font-semibold tracking-[-0.04em] text-[#162033]">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border border-[#dbe3f1] bg-white px-4 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a96ad]">
                    Database
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#1f2a3d]">
                    hris_payroll_app
                  </p>
                </div>
                <div className="rounded-full border border-[#dbe3f1] bg-white px-4 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a96ad]">
                    Session
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#1f2a3d]">
                    Admin aktif
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#66748f]">
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
