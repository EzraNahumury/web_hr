import Link from "next/link";

type Props = {
  title: string;
  description: string;
  employeeName: string;
  employeeMeta: string;
  currentPath: string;
  children: React.ReactNode;
};

const menuItems = [
  { label: "Dashboard", href: "/employee" },
  { label: "Presensi Masuk", href: "/employee/check-in" },
  { label: "Presensi Pulang", href: "/employee/check-out" },
  { label: "Riwayat Absensi", href: "/employee/attendance-history" },
  { label: "Data Lembur", href: "/employee/overtime" },
  { label: "Status Pinjaman", href: "/employee/loans" },
  { label: "Informasi Kontrak", href: "/employee/contract" },
  { label: "Slip Gaji", href: "/employee/payslips" },
];

export default function EmployeeShell({
  title,
  description,
  employeeName,
  employeeMeta,
  currentPath,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f1ec_0%,#f3ebe5_100%)] px-4 py-5 text-[#1f1715] sm:px-6">
      <section className="mx-auto max-w-[1500px]">
        <div className="grid gap-6 xl:grid-cols-[280px,minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[34px] border border-[#ead7ce] bg-[linear-gradient(180deg,#fffaf7_0%,#f8eee8_100%)] shadow-[0_30px_80px_rgba(96,45,34,0.08)]">
            <div className="border-b border-[#ecd9d1] px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#9c6b62]">
                Portal Karyawan
              </p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-none tracking-[-0.05em] text-[#2e1b18]">
                My HR
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#7e5f58]">
                Akses pribadi untuk absensi, lembur, pinjaman, kontrak, dan slip gaji.
              </p>
            </div>

            <div className="px-4 py-4">
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const active = item.href === currentPath;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        active
                          ? "block rounded-[22px] border border-[#c65e61]/25 bg-[linear-gradient(135deg,#fff3ef_0%,#f8e2db_100%)] px-4 py-3 shadow-[0_16px_36px_rgba(162,70,62,0.12)]"
                          : "block rounded-[22px] px-4 py-3 hover:bg-white/75"
                      }
                    >
                      <p className="text-sm font-semibold text-[#2f1f1d]">{item.label}</p>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 rounded-[28px] bg-[linear-gradient(135deg,#8f1d22_0%,#ba4846_100%)] p-5 text-white shadow-[0_22px_50px_rgba(143,29,34,0.24)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/72">
                  Karyawan
                </p>
                <p className="mt-4 text-xl font-semibold">{employeeName}</p>
                <p className="mt-1 text-sm text-white/78">{employeeMeta}</p>
              </div>
            </div>
          </aside>

          <section className="overflow-hidden rounded-[34px] border border-[#ead7ce] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,250,247,0.92)_100%)] shadow-[0_30px_90px_rgba(96,45,34,0.08)]">
            <header className="border-b border-[#ecd9d1] px-6 py-6 sm:px-8">
              <h2 className="font-[family-name:var(--font-display)] text-[2.6rem] leading-none tracking-[-0.06em] text-[#241716]">
                {title}
              </h2>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#7a6059]">
                {description}
              </p>
            </header>

            <div className="px-6 py-6 sm:px-8">{children}</div>
          </section>
        </div>
      </section>
    </main>
  );
}
