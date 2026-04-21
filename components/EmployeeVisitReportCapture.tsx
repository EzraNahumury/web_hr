"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

type VisitReport = {
  id: number;
  tanggal: string;
  waktuSubmit: string;
  namaToko: string;
  fotoPath: string;
  latitude: number | null;
  longitude: number | null;
};

type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: number;
};

const LOCATION_CACHE_KEY = "web_hr_last_location";
const LOCATION_CACHE_MAX_AGE = 2 * 60 * 1000;

function formatJam(dateTime: string) {
  const timePart = dateTime.split(" ")[1] ?? dateTime.split("T")[1];
  if (!timePart) return dateTime;
  return timePart.slice(0, 5);
}

export default function EmployeeVisitReportCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestAccuracyRef = useRef<number | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [namaToko, setNamaToko] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reports, setReports] = useState<VisitReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isPending, startTransition] = useTransition();

  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }
  }, []);

  const applyLocationSnapshot = useCallback((snapshot: LocationSnapshot) => {
    if (bestAccuracyRef.current === null || snapshot.accuracy < bestAccuracyRef.current) {
      bestAccuracyRef.current = snapshot.accuracy;
      setLocation({ latitude: snapshot.latitude, longitude: snapshot.longitude });
      setLocationAccuracy(snapshot.accuracy);
      setLocationReady(true);
      sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(snapshot));
    }
  }, []);

  const startLocationTracking = useCallback(
    (forceRefresh = false) => {
      if (!navigator.geolocation) {
        setErrorMessage("Browser tidak mendukung GPS lokasi.");
        return;
      }

      stopLocationTracking();
      bestAccuracyRef.current = null;
      setIsLocating(true);
      setErrorMessage("");

      if (!forceRefresh) {
        const saved = sessionStorage.getItem(LOCATION_CACHE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as LocationSnapshot;
            if (Date.now() - parsed.capturedAt <= LOCATION_CACHE_MAX_AGE) {
              applyLocationSnapshot(parsed);
            } else {
              sessionStorage.removeItem(LOCATION_CACHE_KEY);
            }
          } catch {
            sessionStorage.removeItem(LOCATION_CACHE_KEY);
          }
        }
      }

      navigator.geolocation.getCurrentPosition(
        (position) =>
          applyLocationSnapshot({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: Date.now(),
          }),
        () => setErrorMessage("Izin lokasi dibutuhkan untuk laporan kunjungan."),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          applyLocationSnapshot({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: Date.now(),
          });
          if (position.coords.accuracy <= 30) {
            setIsLocating(false);
            stopLocationTracking();
          }
        },
        () => {
          setIsLocating(false);
          setErrorMessage("Izin lokasi dibutuhkan untuk laporan kunjungan.");
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );

      locationTimeoutRef.current = setTimeout(() => {
        setIsLocating(false);
        stopLocationTracking();
      }, 15000);
    },
    [applyLocationSnapshot, stopLocationTracking],
  );

  const loadTodayReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const response = await fetch("/api/employee/visit-report", { cache: "no-store" });
      const data = (await response.json()) as { reports?: VisitReport[] };
      setReports(data.reports ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    loadTodayReports();
  }, [loadTodayReports]);

  useEffect(() => {
    let active = true;
    const locationTimer = window.setTimeout(() => {
      startLocationTracking();
    }, 0);

    async function requestCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch {
        setErrorMessage("Izin kamera dibutuhkan untuk foto kunjungan.");
      }
    }

    requestCamera();

    return () => {
      active = false;
      window.clearTimeout(locationTimer);
      stopLocationTracking();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [startLocationTracking, stopLocationTracking]);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setErrorMessage("Kamera belum siap.");
      return;
    }
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const context = canvas.getContext("2d");
    if (!context) {
      setErrorMessage("Gagal memproses foto.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    setErrorMessage("");
  }

  function submit() {
    if (!namaToko.trim()) {
      setErrorMessage("Nama toko wajib diisi.");
      return;
    }
    if (!photoDataUrl) {
      setErrorMessage("Ambil foto lokasi terlebih dahulu.");
      return;
    }
    if (!location) {
      setErrorMessage("Lokasi belum tersedia.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const formData = new FormData();
      formData.append("namaToko", namaToko.trim());
      formData.append("photoDataUrl", photoDataUrl);
      formData.append("latitude", String(location.latitude));
      formData.append("longitude", String(location.longitude));

      const response = await fetch("/api/employee/visit-report", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(result.message ?? "Gagal menyimpan laporan kunjungan.");
        return;
      }

      setSuccessMessage(result.message ?? "Laporan kunjungan berhasil disimpan.");
      setNamaToko("");
      setPhotoDataUrl(null);
      await loadTodayReports();
    });
  }

  const mapUrl = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=18&output=embed`
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <section className="overflow-hidden rounded-3xl border border-[#ead7ce] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#f3ebe7] px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f63]">
                Laporan Kunjungan
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-[#241716] sm:text-lg">
                Submit Kunjungan Baru
              </h3>
            </div>
            <span
              className={`inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                cameraReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  cameraReady ? "bg-emerald-500" : "animate-pulse bg-amber-400"
                }`}
              />
              {cameraReady ? "Siap" : "Menyiapkan"}
            </span>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-5">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                Nama Toko / Customer
              </label>
              <input
                type="text"
                value={namaToko}
                onChange={(event) => setNamaToko(event.target.value)}
                placeholder="Contoh: Toko Sinar Jaya"
                className="w-full rounded-xl border border-[#ead7ce] bg-white px-3.5 py-2.5 text-sm text-[#241716] outline-none transition focus:border-[#c8716d] focus:ring-2 focus:ring-[#c8716d]/10"
              />
            </div>

            <div className="mx-auto w-full max-w-[360px]">
              <div className="overflow-hidden rounded-2xl border border-[#ead7ce] bg-[#111]">
                {!photoDataUrl ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-[4/5] w-full bg-black object-cover"
                  />
                ) : (
                  <Image
                    src={photoDataUrl}
                    alt="Foto kunjungan"
                    width={720}
                    height={900}
                    unoptimized
                    className="aspect-[4/5] w-full object-cover"
                  />
                )}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#a12228] to-[#8f1d22] px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(143,29,34,0.3)] transition hover:shadow-[0_4px_14px_rgba(143,29,34,0.35)] active:scale-[0.98] sm:h-11"
              >
                {photoDataUrl ? "Ambil Ulang" : "Ambil Foto"}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isPending}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e7d4cb] bg-white px-5 text-sm font-semibold text-[#3c2824] shadow-sm transition hover:border-[#c8a99e] hover:bg-[#fffbf9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:h-11"
              >
                {isPending ? "Menyimpan..." : "Kirim Laporan"}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-[#ead7ce] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f63]">
                Lokasi & GPS
              </p>
              <button
                type="button"
                onClick={() => startLocationTracking(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7d4cb] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3c2824] transition hover:border-[#c8a99e] hover:bg-[#fffbf9]"
              >
                {isLocating ? "Mencari..." : "Refresh"}
              </button>
            </div>
            <div className="mt-3 rounded-xl bg-[#f9f6f4] px-3 py-2.5">
              <p className="text-[12px] font-semibold text-[#4b3230]">
                {locationReady ? "Lokasi siap" : isLocating ? "Mencari lokasi..." : "Belum tersedia"}
              </p>
              {location ? (
                <p className="mt-1 truncate text-[11px] tabular-nums text-[#5c4a46]">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  {locationAccuracy ? ` • ~${Math.round(locationAccuracy)} m` : ""}
                </p>
              ) : null}
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-[#f7f1ec]">
              {mapUrl ? (
                <iframe
                  title="Peta lokasi kunjungan"
                  src={mapUrl}
                  className="block h-[180px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-[180px] items-center justify-center text-[12px] text-[#7a6059]">
                  Menunggu lokasi...
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#ead7ce] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f63]">
              Kunjungan Hari Ini ({reports.length})
            </p>
            <div className="mt-3 space-y-2">
              {loadingReports ? (
                <p className="text-[12px] text-[#7a6059]">Memuat...</p>
              ) : reports.length === 0 ? (
                <p className="text-[12px] text-[#7a6059]">Belum ada kunjungan hari ini.</p>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-3 rounded-xl border border-[#f3ebe7] bg-[#fffbf9] px-3 py-2"
                  >
                    <div className="flex h-10 w-10 flex-none overflow-hidden rounded-lg bg-[#f7f1ec]">
                      {report.fotoPath ? (
                        <Image
                          src={report.fotoPath}
                          alt={report.namaToko}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#241716]">
                        {report.namaToko}
                      </p>
                      <p className="text-[11px] tabular-nums text-[#7a6059]">
                        {formatJam(report.waktuSubmit)}
                        {report.latitude !== null && report.longitude !== null
                          ? ` • ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
