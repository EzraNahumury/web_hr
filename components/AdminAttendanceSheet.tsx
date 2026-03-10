"use client";

import Image from "next/image";
import { useState } from "react";
import type { AttendanceDayDetail } from "@/lib/hris";

type Row = {
  employeeId: number;
  name: string;
  nip: string;
  role: string;
  division: string;
  department: string;
  email: string;
  passwordLabel: string;
  daily: Record<number, AttendanceDayDetail>;
};

type Props = {
  days: number[];
  rows: Row[];
};

type SelectedAttendance = {
  employeeName: string;
  day: number;
  detail: AttendanceDayDetail;
} | null;

function AttendanceDetailModal({
  selected,
  onClose,
}: {
  selected: SelectedAttendance;
  onClose: () => void;
}) {
  if (!selected) {
    return null;
  }

  const mapInput =
    selected.detail.latitudeIn !== null && selected.detail.longitudeIn !== null
      ? `${selected.detail.latitudeIn},${selected.detail.longitudeIn}`
      : selected.detail.latitudeOut !== null && selected.detail.longitudeOut !== null
        ? `${selected.detail.latitudeOut},${selected.detail.longitudeOut}`
        : null;
  const mapUrl = mapInput
    ? `https://www.google.com/maps?q=${mapInput}&z=18&output=embed`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e9dfda] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
              Detail Absensi
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#241716]">
              {selected.employeeName} - Tanggal {selected.day}
            </h3>
            <p className="mt-2 text-sm text-[#7a6059]">
              Status: {selected.detail.status || "-"} | Kode: {selected.detail.code || "-"}
            </p>
            <p className="mt-2 text-sm text-[#7a6059]">
              Jam masuk: {selected.detail.timeIn || "-"} | Jam pulang: {selected.detail.timeOut || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#e8d5cc] bg-white px-4 py-2 text-sm font-semibold text-[#3c2824]"
          >
            Tutup
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#3c2824]">Foto Selfie Masuk</p>
              <div className="mt-3 overflow-hidden rounded-[22px] border border-[#ead7ce] bg-[#f8f3ef]">
                {selected.detail.photoIn ? (
                  <Image
                    src={selected.detail.photoIn}
                    alt="Foto selfie masuk"
                    width={720}
                    height={900}
                    unoptimized
                    className="h-[280px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-[#8a6f68]">
                    Foto masuk belum tersedia.
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#3c2824]">Foto Selfie Pulang</p>
              <div className="mt-3 overflow-hidden rounded-[22px] border border-[#ead7ce] bg-[#f8f3ef]">
                {selected.detail.photoOut ? (
                  <Image
                    src={selected.detail.photoOut}
                    alt="Foto selfie pulang"
                    width={720}
                    height={900}
                    unoptimized
                    className="h-[280px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-[#8a6f68]">
                    Foto pulang belum tersedia.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[22px] border border-[#ead7ce] bg-[#fff8f4] p-4 text-sm text-[#7a6059]">
              <p>Jam masuk: {selected.detail.timeIn || "-"}</p>
              <p className="mt-2">Jam pulang: {selected.detail.timeOut || "-"}</p>
              <p className="mt-4">Latitude masuk: {selected.detail.latitudeIn ?? "-"}</p>
              <p className="mt-2">Longitude masuk: {selected.detail.longitudeIn ?? "-"}</p>
              <p className="mt-4">Latitude pulang: {selected.detail.latitudeOut ?? "-"}</p>
              <p className="mt-2">Longitude pulang: {selected.detail.longitudeOut ?? "-"}</p>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#ead7ce] bg-[#f8f3ef]">
              {mapUrl ? (
                <iframe
                  title="Lokasi absensi tersimpan"
                  src={mapUrl}
                  className="h-[360px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-[#8a6f68]">
                  Lokasi absensi belum tersedia.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAttendanceSheet({ days, rows }: Props) {
  const [selected, setSelected] = useState<SelectedAttendance>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-[1800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#efe0d8] bg-[#fff8f4] text-xs uppercase tracking-[0.18em] text-[#9e7467]">
              <th className="px-4 py-4">Nama</th>
              <th className="px-4 py-4">NIP</th>
              <th className="px-4 py-4">Jabatan</th>
              <th className="px-4 py-4">Divisi</th>
              <th className="px-4 py-4">Departemen</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Password</th>
              {days.map((day) => (
                <th key={day} className="px-3 py-4 text-center">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employeeId} className="border-b border-[#f1e5de] text-[#513d39]">
                <td className="px-4 py-4 font-semibold text-[#241716]">{row.name}</td>
                <td className="px-4 py-4">{row.nip}</td>
                <td className="px-4 py-4">{row.role}</td>
                <td className="px-4 py-4">{row.division}</td>
                <td className="px-4 py-4">{row.department}</td>
                <td className="px-4 py-4">{row.email}</td>
                <td className="px-4 py-4 text-[#9a7a72]">{row.passwordLabel}</td>
                {days.map((day) => {
                  const detail = row.daily[day];
                  const isClickable =
                    !!detail &&
                    (!!detail.photoIn ||
                      !!detail.photoOut ||
                      detail.latitudeIn !== null ||
                      detail.latitudeOut !== null);

                  return (
                    <td key={day} className="px-3 py-4 text-center font-medium">
                      {detail ? (
                        <button
                          type="button"
                          onClick={() =>
                            isClickable
                              ? setSelected({
                                  employeeName: row.name,
                                  day,
                                  detail,
                                })
                              : undefined
                          }
                          className={
                            isClickable
                              ? "inline-flex min-w-8 items-center justify-center rounded-lg bg-[#fff4ee] px-2 py-1 text-xs transition hover:bg-[#f5ddd2] hover:text-[#8f1d22]"
                              : "inline-flex min-w-8 items-center justify-center rounded-lg bg-[#fff4ee] px-2 py-1 text-xs"
                          }
                        >
                          {detail.code || "-"}
                        </button>
                      ) : (
                        <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-[#fff4ee] px-2 py-1 text-xs">
                          -
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AttendanceDetailModal selected={selected} onClose={() => setSelected(null)} />
    </>
  );
}
