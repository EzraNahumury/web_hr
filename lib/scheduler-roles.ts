export function canSetSchedule(role: string | null | undefined) {
  const normalized = (role ?? "").trim().toLowerCase();
  return normalized === "supervisor" || normalized === "manager";
}

const JADWAL_NAME_WHITELIST = ["Fara Ais Umainah"];

export function isJadwalWhitelisted(nama: string | null | undefined) {
  const normalized = (nama ?? "").trim().toLowerCase();
  return JADWAL_NAME_WHITELIST.some((n) => n.trim().toLowerCase() === normalized);
}

export function isManager(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase() === "manager";
}

export function isSupervisorRole(role: string | null | undefined) {
  const n = (role ?? "").trim().toLowerCase();
  return n === "supervisor" || n === "spv";
}
