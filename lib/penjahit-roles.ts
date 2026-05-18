export function isPenjahit(subDivision: string | null | undefined) {
  return (subDivision ?? "").trim().toLowerCase() === "penjahit";
}

// Backwards-compatible alias — beberapa caller lama masih pakai isPenjahitRole.
// Karena identifikasi penjahit kini dari sub_divisi, terima parameter sub_divisi.
export const isPenjahitRole = isPenjahit;
