"use client";

import { useRouter } from "next/navigation";

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

// Pemilih periode payroll (per bulan) untuk Riwayat Absensi karyawan.
export default function EmployeeAttendancePeriodPicker({ value }: { value: string }) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const [year, month] = e.target.value.split("-").map(Number);
    if (month && year) {
      router.push(`/employee/attendance-history?month=${month}&year=${year}`);
    }
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[#ead7ce] bg-white px-4 py-2.5 text-sm font-semibold text-[#241716] shadow-[0_10px_24px_rgba(96,45,34,0.08)] transition hover:border-[#c97f5b] hover:text-[#8f1d22]">
      <CalendarIcon />
      <input
        type="month"
        value={value}
        onChange={onChange}
        className="bg-transparent text-sm font-semibold text-[#241716] outline-none"
      />
    </label>
  );
}
