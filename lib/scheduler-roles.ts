export function canSetSchedule(role: string | null | undefined) {
  const normalized = (role ?? "").trim().toLowerCase();
  return normalized === "supervisor" || normalized === "manager";
}
