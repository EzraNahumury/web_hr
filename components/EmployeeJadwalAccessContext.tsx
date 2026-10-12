"use client";

import { createContext, useContext } from "react";

type EmployeeAccess = {
  // True kalau karyawan yang login diberi izin akses Set Jadwal (jadwal_editor).
  canEditJadwal: boolean;
  // True kalau karyawan boleh approve lembur & absensi (SPV/Manager atau jabatan
  // yang ditandai "bisa approve" di Master Jabatan, mis. Leader).
  canApprove: boolean;
};

const EmployeeJadwalAccessContext = createContext<EmployeeAccess>({
  canEditJadwal: false,
  canApprove: false,
});

export function EmployeeJadwalAccessProvider({
  value,
  children,
}: {
  value: EmployeeAccess;
  children: React.ReactNode;
}) {
  return (
    <EmployeeJadwalAccessContext.Provider value={value}>
      {children}
    </EmployeeJadwalAccessContext.Provider>
  );
}

export function useEmployeeJadwalAccess() {
  return useContext(EmployeeJadwalAccessContext).canEditJadwal;
}

export function useEmployeeCanApprove() {
  return useContext(EmployeeJadwalAccessContext).canApprove;
}
