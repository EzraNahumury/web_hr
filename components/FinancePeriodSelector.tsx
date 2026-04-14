"use client";

import { useRouter } from "next/navigation";

type PeriodOption = {
  month: number;
  year: number;
  label: string;
};

type Props = {
  options: PeriodOption[];
  selectedMonth: number;
  selectedYear: number;
};

export default function FinancePeriodSelector({
  selectedMonth,
  selectedYear,
}: Props) {
  const router = useRouter();
  const currentValue = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.value) return;
    const [year, month] = event.target.value.split("-");
    router.push(`/admin/finance?month=${Number(month)}&year=${Number(year)}`);
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-semibold text-[#7a3828]">Periode</label>
      <input
        type="month"
        value={currentValue}
        onChange={handleChange}
        className="h-10 rounded-full border border-[#ead9d6] bg-white px-4 text-sm font-semibold text-[#1b1314] shadow-none outline-none transition hover:border-[#d9b8b2] hover:bg-[#fff4f3] focus:border-[#c97a5e] focus:ring-0"
      />
    </div>
  );
}
