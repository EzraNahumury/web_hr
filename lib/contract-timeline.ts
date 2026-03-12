export const TRAINING_DURATION_MONTHS = 3;
export const CONTRACT_DURATION_MONTHS = 12;
export const CONTRACT_DEDUCTION_DURATION_MONTHS = 5;
export const DEFAULT_CONTRACT_DEDUCTION_NOMINAL = 200000;

const CONTRACT_DEDUCTION_BY_ROLE: Record<string, number> = {
  ceo: DEFAULT_CONTRACT_DEDUCTION_NOMINAL,
  secretary: DEFAULT_CONTRACT_DEDUCTION_NOMINAL,
  manager: DEFAULT_CONTRACT_DEDUCTION_NOMINAL,
  supervisor: DEFAULT_CONTRACT_DEDUCTION_NOMINAL,
  staff: DEFAULT_CONTRACT_DEDUCTION_NOMINAL,
};

type ParsedDate = {
  year: number;
  month: number;
  day: number;
};

export type EmploymentTimeline = {
  trainingStartDate: string;
  trainingEndDate: string;
  contractDate: string;
  contractEndDate: string;
  deductionStartDate: string;
  deductionEndDate: string;
};

export type ContractDeductionPeriod = {
  sequence: number;
  month: number;
  year: number;
  monthLabel: string;
};

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day } satisfies ParsedDate;
}

function formatIsoDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function getTodayInJakarta() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function addMonthsToIsoDate(value: string, months: number) {
  const parsed = parseIsoDate(value);

  if (!parsed) {
    return null;
  }

  const totalMonths = parsed.year * 12 + (parsed.month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;
  const targetDay = Math.min(parsed.day, getDaysInMonth(targetYear, targetMonthIndex));

  return formatIsoDate(new Date(Date.UTC(targetYear, targetMonthIndex, targetDay)));
}

export function calculateContractEndDate(contractDate: string) {
  return addMonthsToIsoDate(contractDate, CONTRACT_DURATION_MONTHS);
}

export function calculateEmploymentTimeline(firstJoinDate: string) {
  const contractDate = addMonthsToIsoDate(firstJoinDate, TRAINING_DURATION_MONTHS);

  if (!contractDate) {
    return null;
  }

  const contractEndDate = calculateContractEndDate(contractDate);
  const deductionEndDate = addMonthsToIsoDate(
    contractDate,
    CONTRACT_DEDUCTION_DURATION_MONTHS,
  );

  if (!contractEndDate || !deductionEndDate) {
    return null;
  }

  return {
    trainingStartDate: firstJoinDate,
    trainingEndDate: contractDate,
    contractDate,
    contractEndDate,
    deductionStartDate: contractDate,
    deductionEndDate,
  } satisfies EmploymentTimeline;
}

export function getFirstFiveContractPeriods(contractDate: string) {
  const parsed = parseIsoDate(contractDate);

  if (!parsed) {
    return [] satisfies ContractDeductionPeriod[];
  }

  return Array.from({ length: CONTRACT_DEDUCTION_DURATION_MONTHS }, (_, index) => {
    const yearMonth = addMonthsToIsoDate(
      `${parsed.year}-${`${parsed.month}`.padStart(2, "0")}-01`,
      index,
    );

    if (!yearMonth) {
      throw new Error("Periode potongan kontrak tidak valid.");
    }

    const period = parseIsoDate(yearMonth);

    if (!period) {
      throw new Error("Periode potongan kontrak tidak valid.");
    }

    return {
      sequence: index + 1,
      month: period.month,
      year: period.year,
      monthLabel: new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date(Date.UTC(period.year, period.month - 1, 1))),
    } satisfies ContractDeductionPeriod;
  });
}

export function isContractDeductionActive(
  contractDate: string,
  currentDate = getTodayInJakarta(),
) {
  const deductionEndDate = addMonthsToIsoDate(
    contractDate,
    CONTRACT_DEDUCTION_DURATION_MONTHS,
  );

  if (!deductionEndDate) {
    return false;
  }

  return currentDate >= contractDate && currentDate < deductionEndDate;
}

export function getContractDeductionNominalByRole(role: string | null | undefined) {
  const normalized = role?.trim().toLowerCase() ?? "";
  return CONTRACT_DEDUCTION_BY_ROLE[normalized] ?? DEFAULT_CONTRACT_DEDUCTION_NOMINAL;
}

export function buildContractDeductionDescription(sequence: number) {
  return `Potongan kontrak bulan ke-${sequence} dari 5`;
}

