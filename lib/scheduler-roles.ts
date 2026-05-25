export function canSetSchedule(role: string | null | undefined) {
  const normalized = (role ?? "").trim().toLowerCase();
  return normalized === "supervisor" || normalized === "manager";
}

export function isManager(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase() === "manager";
}

export function isSupervisorRole(role: string | null | undefined) {
  const n = (role ?? "").trim().toLowerCase();
  return n === "supervisor" || n === "spv";
}
