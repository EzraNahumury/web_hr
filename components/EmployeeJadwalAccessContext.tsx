"use client";

import { createContext, useContext } from "react";

// True kalau karyawan yang login diberi izin akses Set Jadwal (jadwal_editor).
const EmployeeJadwalAccessContext = createContext<boolean>(false);

export function EmployeeJadwalAccessProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <EmployeeJadwalAccessContext.Provider value={value}>
      {children}
    </EmployeeJadwalAccessContext.Provider>
  );
}

export function useEmployeeJadwalAccess() {
  return useContext(EmployeeJadwalAccessContext);
}
