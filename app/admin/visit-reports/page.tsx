import AdminShell from "@/components/AdminShell";
import AdminVisitReports from "@/components/AdminVisitReports";
import { requireAdminSession } from "@/lib/auth";
import {
  getVisitReportMonthlySummary,
  listSalesAreaEmployees,
  listVisitReports,
} from "@/lib/visit-reports";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function getJakartaToday() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    month: Number(values.month),
    year: Number(values.year),
  };
}

export default async function AdminVisitReportsPage() {
  const admin = await requireAdminSession();
  const today = getJakartaToday();

  const startDate = `${today.year}-${pad(today.month)}-01`;
  const endDate = today.date;

  const [reports, summary, salesEmployees] = await Promise.all([
    listVisitReports({ startDate, endDate }),
    getVisitReportMonthlySummary(today.month, today.year),
    listSalesAreaEmployees(),
  ]);

  return (
    <AdminShell
      title="Laporan Kunjungan Sales"
      description="Timeline dan rekap bulanan kunjungan Sales Area. Data diambil dari laporan yang disubmit karyawan via mobile."
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath="/admin/visit-reports"
    >
      <AdminVisitReports
        initialReports={reports}
        initialSummary={summary}
        salesEmployees={salesEmployees}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
        defaultMonth={today.month}
        defaultYear={today.year}
      />
    </AdminShell>
  );
}
