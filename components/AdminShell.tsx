"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  { label: "Dashboard", href: "/admin", description: "Ringkasan panel admin" },
  { label: "Data Karyawan", href: "/admin/employees", description: "Kelola master karyawan" },
  { label: "Absensi", href: "/admin/attendance", description: "Presensi dan keterlambatan" },
  { label: "Laporan Kunjungan", href: "/admin/visit-reports", description: "Timeline kunjungan Sales Area" },
  { label: "Lembur", href: "/admin/overtime", description: "Approval dan rekap lembur" },
  { label: "Approval Perjalanan Dinas", href: "/admin/business-trips", description: "Approval dinas luar kota karyawan" },
  { label: "Approval Reimburse", href: "/admin/reimbursements", description: "Approve nota reimburse" },
  { label: "Pinjaman", href: "/admin/loans", description: "Pinjaman karyawan" },
  { label: "Potongan Kontrak", href: "/admin/contract-deductions", description: "Potongan per bulan" },
  { label: "Summary Payroll", href: "/admin/payroll-summary", description: "Ringkasan payroll" },
  { label: "Payroll Bonus", href: "/admin/payroll-bonus", description: "Payroll bonus Sales, SPV, Manager, CS, Host Live" },
  { label: "Summary Sales Nasional", href: "/admin/payroll-summary/sales-nasional", description: "Payroll khusus Sales Nasional" },
  { label: "Summary Penjahit", href: "/admin/payroll-summary/penjahit", description: "Payroll khusus Penjahit (mingguan & bulanan)" },
  { label: "Finance", href: "/admin/finance", description: "Pembebanan dan pencairan" },
  { label: "Slip Gaji", href: "/admin/payslips", description: "Detail slip gaji" },
  { label: "Distribusi Slip", href: "/admin/payslip-distribution", description: "Log distribusi slip" },
  { label: "Role", href: "/admin/roles", description: "Kelola akun admin & SPV" },
];

function GridIcon({ active }: { active?: boolean }) {
  return (
    <span
      className={
        active
          ? "flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/15 text-white"
          : "flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/5 text-[#91a0c4]"
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-[18px] w-[18px]"
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

function HamburgerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h11" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6l-6 6-6 6" />
    </svg>
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const eyebrow = menuItems.find((item) => item.href === currentPath)?.label ?? "Admin Workspace";

  const NavList = (
    <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
      {menuItems.map((item) => {
        const active = item.href === currentPath;

        if (item.disabled) {
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 opacity-50"
            >
              <GridIcon />
              <span className="text-sm font-semibold text-[#f4dddd]">{item.label}</span>
            </div>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            className={
              active
                ? "flex items-center gap-3 rounded-xl bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] px-2.5 py-2 text-white shadow-[0_10px_24px_rgba(185,28,28,0.32)]"
                : "flex items-center gap-3 rounded-xl px-2.5 py-2 text-[#f7eaea] transition hover:bg-white/5"
            }
          >
            <GridIcon active={active} />
            <span className="text-sm font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const SidebarBody = (
    <div className="relative flex h-full min-h-0 flex-col px-4 py-5">
      <div className="flex flex-none items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ef4444_0%,#991b1b_100%)] shadow-[0_16px_32px_rgba(185,28,28,0.35)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4 text-white"
            aria-hidden="true"
          >
            <path d="M8 7h8" strokeLinecap="round" />
            <path d="M8 12h8" strokeLinecap="round" />
            <path d="M8 17h5" strokeLinecap="round" />
            <rect x="4" y="3.5" width="16" height="17" rx="3" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-white">HR Admin</p>
          <p className="text-[11px] text-[#c6b1b4]">AYRES Payroll System</p>
        </div>
      </div>

      {NavList}

      <div className="mt-4 flex-none space-y-3 border-t border-white/10 pt-4">
        <div className="rounded-2xl border border-white/8 bg-white/5 p-3.5 backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b08b91]">
            Admin Aktif
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-white">{adminName}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#d6bfc2]">{adminEmail}</p>
        </div>
        <div className="[&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl [&_button]:border [&_button]:border-white/10 [&_button]:bg-white/6 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-white [&_button]:shadow-none [&_button]:transition hover:[&_button]:bg-white/10 hover:[&_button]:text-white">
          <LogoutButton />
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f5f2f1] text-[#141414]">
      <section className="flex min-h-screen flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside className="relative hidden w-[252px] flex-none overflow-hidden bg-[linear-gradient(180deg,#090909_0%,#111111_55%,#1a0608_100%)] text-white lg:sticky lg:top-0 lg:block lg:h-screen">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.14),transparent_26%)]" />
          {SidebarBody}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />
            <aside className="absolute left-0 top-0 h-full w-[84%] max-w-[320px] overflow-hidden bg-[linear-gradient(180deg,#090909_0%,#111111_55%,#1a0608_100%)] text-white shadow-2xl animate-[slideIn_.2s_ease-out]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.14),transparent_26%)]" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Tutup menu"
              >
                <CloseIcon />
              </button>
              {SidebarBody}
            </aside>
          </div>
        ) : null}

        <section className="flex min-h-screen flex-1 flex-col bg-[#f6f3f2]">
          <header className="sticky top-0 z-30 border-b border-[#ead9d6] bg-[#fbf8f7]/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-[#ead9d6] bg-white text-[#7b4a4f] transition hover:border-[#c8716d] hover:text-[#8f1d22] lg:hidden"
                aria-label="Buka menu"
              >
                <HamburgerIcon />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a3767b] sm:text-[11px]">
                  {eyebrow}
                </p>
                <h1 className="mt-0.5 truncate text-[1.125rem] font-semibold leading-tight tracking-[-0.03em] text-[#1b1314] sm:text-[1.35rem] lg:text-[1.6rem]">
                  {title}
                </h1>
              </div>

            </div>
            {description ? (
              <p className="px-4 pb-3 pt-0 text-[13px] leading-5 text-[#7d5b60] sm:px-6 sm:pb-4 sm:text-sm sm:leading-6 lg:px-8">
                {description}
              </p>
            ) : null}
          </header>

          <div className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </section>
      </section>
    </main>
  );
}
