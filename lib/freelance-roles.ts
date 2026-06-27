export function isFreelanceJabatan(role: string | null | undefined) {
  return (role ?? "").trim().toLowerCase() === "freelance";
}
