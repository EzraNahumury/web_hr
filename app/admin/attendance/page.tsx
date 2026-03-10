import AdminShell from "@/components/AdminShell";
import AdminAttendanceSheet from "@/components/AdminAttendanceSheet";
import { requireAdminSession } from "@/lib/auth";
import { getAttendanceSheet } from "@/lib/hris";
import Link from "next/link";

type SearchParams = Promise<{
  view?: string;
  week?: string;
  month?: string;
  year?: string;
}>;

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdminSession();
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "month";
  const week = Number(params.week ?? "1");
  const rawMonth = Number(params.month ?? "3");
  const rawYear = Number(params.year ?? "2026");
  const month = Number.isFinite(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : 3;
  const year = Number.isFinite(rawYear) && rawYear >= 2000 ? rawYear : 2026;
  const sheet = await getAttendanceSheet({
    month,
    year,
    view,
    week: Number.isFinite(week) ? week : 1,
  });
  const previousMonth = sheet.month === 1 ? 12 : sheet.month - 1;
  const previousYear = sheet.month === 1 ? sheet.year - 1 : sheet.year;
  const nextMonth = sheet.month === 12 ? 1 : sheet.month + 1;
  const nextYear = sheet.month === 12 ? sheet.year + 1 : sheet.year;
  const currentViewQuery =
    sheet.view === "week" ? `view=week&week=${sheet.week}` : "view=month";

  return (
    <AdminShell
      title="Manajemen Absensi"
      description="Rekap absensi bisa dilihat dalam mode bulanan atau mingguan. Data ditarik langsung dari tabel absensi, karyawan, dan users."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/attendance"
    >
      <div className="rounded-[32px] border border-[#ead7ce] bg-white shadow-[0_20px_60px_rgba(96,45,34,0.08)]">
        <div className="border-b border-[#eddad1] px-6 py-5">
          <div className="mb-5 flex items-center justify-center gap-4">
            <Link
              href={`/admin/attendance?${currentViewQuery}&month=${previousMonth}&year=${previousYear}`}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e4d6cf] bg-[#fff8f4] text-[#7a6059] transition hover:border-[#c8736d] hover:text-[#8f1d22]"
            >
              ‹
            </Link>
            <div className="min-w-[220px] text-center">
              <p className="text-3xl font-semibold tracking-[-0.04em] text-[#241716]">
                {monthNames[sheet.month - 1]} {sheet.year}
              </p>
            </div>
            <Link
              href={`/admin/attendance?${currentViewQuery}&month=${nextMonth}&year=${nextYear}`}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e4d6cf] bg-[#fff8f4] text-[#7a6059] transition hover:border-[#c8736d] hover:text-[#8f1d22]"
            >
              ›
            </Link>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a16f63]">
                {sheet.view === "week" ? "Spreadsheet Mingguan" : "Spreadsheet Bulanan"}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#241716]">
                Rekap Absensi {sheet.month}/{sheet.year}
              </h3>
              {sheet.view === "week" ? (
                <p className="mt-2 text-sm text-[#7a6059]">Tampilan minggu ke-{sheet.week}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-2xl border border-[#e4d6cf] bg-[#fff8f4] p-1">
                <Link
                  href={`/admin/attendance?view=month&month=${sheet.month}&year=${sheet.year}`}
                  className={
                    sheet.view === "month"
                      ? "rounded-xl bg-[#8f1d22] px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-xl px-4 py-2 text-sm font-semibold text-[#7a6059]"
                  }
                >
                  Per Bulan
                </Link>
                <Link
                  href={`/admin/attendance?view=week&week=${sheet.week}&month=${sheet.month}&year=${sheet.year}`}
                  className={
                    sheet.view === "week"
                      ? "rounded-xl bg-[#8f1d22] px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-xl px-4 py-2 text-sm font-semibold text-[#7a6059]"
                  }
                >
                  Per Minggu
                </Link>
              </div>

              {sheet.view === "week" ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: sheet.totalWeeks }, (_, index) => index + 1).map(
                    (weekNumber) => (
                      <Link
                        key={weekNumber}
                        href={`/admin/attendance?view=week&week=${weekNumber}&month=${sheet.month}&year=${sheet.year}`}
                        className={
                          weekNumber === sheet.week
                            ? "rounded-xl bg-[#2b5cff] px-3 py-2 text-sm font-semibold text-white"
                            : "rounded-xl border border-[#e4d6cf] bg-white px-3 py-2 text-sm font-semibold text-[#7a6059]"
                        }
                      >
                        Minggu {weekNumber}
                      </Link>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <AdminAttendanceSheet days={sheet.days} rows={sheet.rows} />
      </div>
    </AdminShell>
  );
}
