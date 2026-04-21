export function isSalesFieldRole(role: string | null | undefined) {
  const normalized = (role ?? "").trim().toLowerCase();
  return normalized === "sales area" || normalized === "sales nasional";
}

export function isSalesNasionalRole(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase() === "sales nasional";
}
