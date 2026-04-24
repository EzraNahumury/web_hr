export function isPenjahitRole(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase() === "penjahit";
}
