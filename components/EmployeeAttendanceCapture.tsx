"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  mode: "check-in" | "check-out";
  employeeName: string;
  employeeMeta: string;
  todayAttendance: {
    tanggal: string;
    jamMasuk: string | null;
    jamPulang: string | null;
    statusAbsensi: string | null;
  } | null;
};

type CheckInStatus = "hadir" | "izin" | "sakit" | "sakit_tanpa_surat" | "setengah_hari";

type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: number;
};

const LOCATION_CACHE_KEY = "web_hr_last_location";
const LOCATION_CACHE_MAX_AGE = 2 * 60 * 1000;
const CHECK_IN_OPTIONS: Array<{
  value: CheckInStatus;
  label: string;
  short: string;
  helper: string;
}> = [
  { value: "hadir", label: "Masuk", short: "O", helper: "Selfie dan lokasi wajib." },
  { value: "izin", label: "Izin / Off", short: "X", helper: "Isi keterangan, tanpa selfie." },
  { value: "sakit", label: "Sakit + Surat", short: "S", helper: "Upload surat sakit." },
  { value: "sakit_tanpa_surat", label: "Sakit", short: "SX", helper: "Isi keterangan sakit." },
  {
    value: "setengah_hari",
    label: "Setengah Hari",
    short: "H",
    helper: "Selfie wajib. 08:30-12:00 atau 13:00-16:30.",
  },
];

export default function EmployeeAttendanceCapture({
  mode,
  employeeName,
  employeeMeta,
  todayAttendance,
}: Props) {
  const isCheckIn = mode === "check-in";
  const isCheckOutBlocked =
    mode === "check-out" &&
    (todayAttendance?.statusAbsensi === "izin" || todayAttendance?.statusAbsensi === "sakit");
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestAccuracyRef = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cameraReady, setCameraReady] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [locationPromptActive, setLocationPromptActive] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>("hadir");
  const [sickFile, setSickFile] = useState<File | null>(null);
  const [sickNote, setSickNote] = useState("");
  const needsSelfie = !isCheckIn || checkInStatus === "hadir" || checkInStatus === "setengah_hari";
  const needsSickProof = isCheckIn && checkInStatus === "sakit";
  const showsNote =
    isCheckIn &&
    (checkInStatus === "izin" || checkInStatus === "sakit" || checkInStatus === "sakit_tanpa_surat");
  const noteIsRequired =
    isCheckIn && (checkInStatus === "izin" || checkInStatus === "sakit_tanpa_surat");

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
      setLocation({
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
      });
      setLocationAccuracy(snapshot.accuracy);
      setLocationReady(true);
      setLocationPromptActive(false);
      setLocationMessage(
        `Lokasi diperbarui. Akurasi ~${Math.round(snapshot.accuracy)} m.`,
      );
      sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(snapshot));
    }
  }, []);

  const startLocationTracking = useCallback((forceRefresh = false) => {
    if (!navigator.geolocation) {
      setLocationPromptActive(false);
      setLocationMessage("");
      setErrorMessage("Browser tidak mendukung GPS lokasi.");
      return;
    }

    stopLocationTracking();
    bestAccuracyRef.current = null;
    setIsLocating(true);
    setLocationPromptActive(true);
    setLocationMessage("Mencari lokasi saat ini...");
    setErrorMessage("");

    if (!forceRefresh) {
      const savedLocation = sessionStorage.getItem(LOCATION_CACHE_KEY);

      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation) as LocationSnapshot;
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
      (position) => {
        applyLocationSnapshot({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: Date.now(),
        });
      },
      () => {
        setErrorMessage("Izin lokasi dibutuhkan untuk presensi.");
        setLocationPromptActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
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
        setLocationPromptActive(false);
        setErrorMessage("Izin lokasi dibutuhkan untuk presensi.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );

    locationTimeoutRef.current = setTimeout(() => {
      setIsLocating(false);
      setLocationPromptActive(false);
      stopLocationTracking();

      if (bestAccuracyRef.current !== null) {
        setLocationMessage(
          `Lokasi terbaik ditemukan. Akurasi ~${Math.round(bestAccuracyRef.current)} m.`,
        );
      } else {
        setErrorMessage("Lokasi belum berhasil didapatkan. Coba cari ulang.");
      }
    }, 15000);
  }, [applyLocationSnapshot, stopLocationTracking]);

  useEffect(() => {
    let active = true;
    const locationTimer = window.setTimeout(() => {
      startLocationTracking();
    }, 0);

    async function requestCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
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
        setErrorMessage("Izin kamera dibutuhkan untuk selfie presensi.");
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

  function captureSelfie() {
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
      setErrorMessage("Gagal memproses selfie.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    setErrorMessage("");
  }

  function submitAttendance() {
    if (isCheckOutBlocked) {
      setErrorMessage("Status izin atau sakit hari ini tidak memerlukan presensi pulang.");
      return;
    }

    if (needsSickProof && !sickFile) {
      setErrorMessage("Upload bukti sakit terlebih dahulu.");
      return;
    }

    if (noteIsRequired && !sickNote.trim()) {
      setErrorMessage("Keterangan wajib diisi.");
      return;
    }

    if (needsSelfie) {
      if (!photoDataUrl) {
        setErrorMessage("Ambil selfie terlebih dahulu.");
        return;
      }

      if (!location) {
        setErrorMessage("Lokasi belum tersedia.");
        return;
      }
    }

    if (!photoDataUrl && needsSelfie) {
      setErrorMessage("Ambil selfie terlebih dahulu.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const endpoint =
        mode === "check-in"
          ? "/api/employee/attendance/check-in"
          : "/api/employee/attendance/check-out";

      const response =
        mode === "check-in"
          ? await (async () => {
              const formData = new FormData();
              formData.append("status", checkInStatus);
              formData.append("keterangan", sickNote);

              if (checkInStatus === "hadir" || checkInStatus === "setengah_hari") {
                formData.append("photoDataUrl", photoDataUrl ?? "");
                formData.append("latitude", String(location?.latitude ?? ""));
                formData.append("longitude", String(location?.longitude ?? ""));
              } else if (sickFile) {
                formData.append("sickProof", sickFile);
              }

              return fetch(endpoint, {
                method: "POST",
                body: formData,
              });
            })()
          : await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                photoDataUrl,
                latitude: location?.latitude,
                longitude: location?.longitude,
              }),
            });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(result.message || "Presensi gagal disimpan.");
        return;
      }

      setSuccessMessage(
        mode === "check-in"
          ? checkInStatus === "sakit"
            ? "Laporan sakit dengan surat berhasil dikirim."
            : checkInStatus === "sakit_tanpa_surat"
              ? "Laporan sakit tanpa surat berhasil dikirim."
              : checkInStatus === "izin"
                ? "Status izin/off berhasil disimpan."
                : checkInStatus === "setengah_hari"
                  ? "Presensi setengah hari berhasil disimpan."
                  : "Presensi masuk berhasil disimpan."
          : "Presensi pulang berhasil disimpan.",
      );
      if (mode === "check-in") {
        setCheckInStatus("hadir");
        setSickFile(null);
        setSickNote("");
        setPhotoDataUrl(null);
      }
      router.refresh();
    });
  }

  const mapUrl = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=18&output=embed`
    : null;

  const statusColor = todayAttendance?.statusAbsensi === "hadir"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : todayAttendance?.statusAbsensi === "izin"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : todayAttendance?.statusAbsensi === "sakit"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-[#f5f2f0] text-[#7a6059] border-[#ead7ce]";

  const primaryActionLabel = isCheckIn
    ? checkInStatus === "sakit"
      ? "Kirim Sakit + Surat"
      : checkInStatus === "sakit_tanpa_surat"
        ? "Kirim Sakit"
        : checkInStatus === "izin"
          ? "Kirim Izin / Off"
          : checkInStatus === "setengah_hari"
            ? "Kirim Setengah Hari"
            : "Kirim Presensi Masuk"
    : "Kirim Presensi Pulang";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Alerts */}
      {errorMessage ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] leading-5 text-rose-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 flex-none opacity-80" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <span className="flex-1">{errorMessage}</span>
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] leading-5 text-emerald-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 flex-none opacity-80" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <span className="flex-1">{successMessage}</span>
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        {/* ─── Capture card ─── */}
        <section className="overflow-hidden rounded-3xl border border-[#ead7ce] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[#f3ebe7] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#8f1d22] to-[#c44b3f] text-white shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f63]">
                  Presensi Aktif
                </p>
                <h3 className="truncate text-base font-semibold text-[#241716] sm:text-lg">
                  {isCheckIn ? "Check-In Selfie" : "Check-Out Selfie"}
                </h3>
              </div>
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
              {cameraReady ? "Aktif" : "Menyiapkan"}
            </span>
          </div>

          <div className="p-4 sm:p-6">
            {/* Inline prompt */}
            {locationPromptActive && !locationReady ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#f3d6ca] bg-[#fff8f5] px-3.5 py-2.5 text-[13px] leading-5 text-[#8f1d22]">
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 flex-none opacity-70" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Izinkan akses lokasi agar sistem bisa menemukan posisi Anda.
              </div>
            ) : null}

            {isCheckOutBlocked ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#f3d6ca] bg-[#fff8f5] px-3.5 py-2.5 text-[13px] leading-5 text-[#8f1d22]">
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 flex-none opacity-70" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                Status hari ini adalah {todayAttendance?.statusAbsensi}. Presensi pulang tidak diperlukan.
              </div>
            ) : null}

            {/* Status picker */}
            {isCheckIn ? (
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16f63]">
                  Jenis Presensi
                </p>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {CHECK_IN_OPTIONS.map((option) => {
                    const selected = checkInStatus === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setCheckInStatus(option.value);
                          setSickFile(null);
                          setErrorMessage("");
                        }}
                        className={
                          selected
                            ? "flex min-w-[150px] flex-none flex-col items-start gap-0.5 rounded-xl border border-[#8f1d22]/30 bg-[#fff3ef] px-3.5 py-2.5 text-left shadow-[0_1px_0_rgba(143,29,34,0.06)] sm:min-w-0"
                            : "flex min-w-[150px] flex-none flex-col items-start gap-0.5 rounded-xl border border-[#ead7ce] bg-white px-3.5 py-2.5 text-left transition hover:border-[#d2b0a5] hover:bg-[#fffbf9] sm:min-w-0"
                        }
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className={selected ? "text-sm font-semibold text-[#8f1d22]" : "text-sm font-semibold text-[#3c2824]"}>
                            {option.label}
                          </span>
                          <span
                            className={
                              selected
                                ? "rounded-md bg-[#8f1d22] px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                : "rounded-md bg-[#f1e7e3] px-1.5 py-0.5 text-[10px] font-semibold text-[#8c6d66]"
                            }
                          >
                            {option.short}
                          </span>
                        </div>
                        <span className="text-[11px] leading-snug text-[#8c6d66]">
                          {option.helper}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Camera / photo preview */}
            <div className="mx-auto w-full max-w-[360px]">
              <div className="overflow-hidden rounded-2xl border border-[#ead7ce] bg-[#111] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                {isCheckIn && !needsSelfie ? (
                  <div className="flex aspect-[4/5] items-center justify-center bg-[#fff8f4] px-5 text-center text-[13px] leading-6 text-[#7a6059]">
                    {checkInStatus === "sakit"
                      ? "Untuk sakit pakai surat, cukup upload bukti sakit. Selfie tidak diwajibkan."
                      : checkInStatus === "sakit_tanpa_surat"
                        ? "Untuk sakit tanpa surat, isi keterangan. Selfie tidak diwajibkan."
                        : "Untuk izin/off, isi keterangan. Selfie tidak diwajibkan."}
                  </div>
                ) : isCheckOutBlocked ? (
                  <div className="flex aspect-[4/5] items-center justify-center bg-[#fff8f4] px-5 text-center text-[13px] leading-6 text-[#7a6059]">
                    Presensi pulang dinonaktifkan untuk status izin dan sakit.
                  </div>
                ) : !photoDataUrl ? (
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
                    alt="Selfie presensi"
                    width={720}
                    height={900}
                    unoptimized
                    className="aspect-[4/5] w-full object-cover"
                  />
                )}
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              {needsSelfie && !isCheckOutBlocked ? (
                <button
                  type="button"
                  onClick={captureSelfie}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#a12228] to-[#8f1d22] px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(143,29,34,0.3)] transition hover:shadow-[0_4px_14px_rgba(143,29,34,0.35)] active:scale-[0.98] sm:h-11"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8z" />
                    <circle cx="10" cy="12" r="3" fill="white" />
                  </svg>
                  {photoDataUrl ? "Ambil Ulang" : "Ambil Selfie"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={submitAttendance}
                disabled={isPending || isCheckOutBlocked}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e7d4cb] bg-white px-5 text-sm font-semibold text-[#3c2824] shadow-sm transition hover:border-[#c8a99e] hover:bg-[#fffbf9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:h-11"
              >
                {isPending ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                    <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 opacity-60" aria-hidden="true">
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                  </svg>
                )}
                {isPending ? "Menyimpan..." : primaryActionLabel}
              </button>
            </div>

            {/* Sick proof / note */}
            {isCheckIn && (needsSickProof || showsNote) ? (
              <div className="mt-5 space-y-4 rounded-2xl border border-[#ead7ce] bg-[#fffbf9] p-4 sm:p-5">
                {needsSickProof ? (
                  <div>
                    <p className="text-sm font-semibold text-[#2f1f1d]">Upload Bukti Sakit</p>
                    <label className="mt-2.5 flex h-12 cursor-pointer items-center justify-between rounded-xl border border-[#ead7ce] bg-white px-3 transition hover:border-[#d2b0a5]">
                      <span className="inline-flex h-8 items-center rounded-lg bg-[#8f1d22] px-3.5 text-xs font-semibold text-white">
                        Pilih File
                      </span>
                      <span className="ml-3 truncate text-[13px] text-[#7d635c]">
                        {sickFile ? sickFile.name : "Belum ada file"}
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={(event) => setSickFile(event.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : null}
                {showsNote ? (
                  <div>
                    <p className="text-sm font-semibold text-[#2f1f1d]">Keterangan</p>
                    <textarea
                      value={sickNote}
                      onChange={(event) => setSickNote(event.target.value)}
                      rows={3}
                      placeholder={
                        checkInStatus === "izin"
                          ? "Contoh: izin keperluan keluarga / off."
                          : "Contoh: demam tinggi, istirahat di rumah."
                      }
                      className="mt-2.5 w-full rounded-xl border border-[#ead7ce] bg-white px-3.5 py-2.5 text-sm text-[#241716] outline-none transition focus:border-[#c8716d] focus:ring-2 focus:ring-[#c8716d]/10"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* ─── Info column ─── */}
        <section className="space-y-4">
          {/* Today status */}
          <div className="rounded-3xl border border-[#ead7ce] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f63]">
                Status Hari Ini
              </p>
              {todayAttendance?.statusAbsensi ? (
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusColor}`}>
                  {todayAttendance.statusAbsensi}
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#f9f6f4] px-3 py-2">
                <p className="text-[10px] font-medium text-[#8c6d66]">Tanggal</p>
                <p className="mt-0.5 text-[13px] font-semibold text-[#241716]">
                  {todayAttendance?.tanggal || "-"}
                </p>
              </div>
              <div className="rounded-xl bg-[#f9f6f4] px-3 py-2">
                <p className="text-[10px] font-medium text-[#8c6d66]">Masuk</p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#241716]">
                  {todayAttendance?.jamMasuk || "-"}
                </p>
              </div>
              <div className="rounded-xl bg-[#f9f6f4] px-3 py-2">
                <p className="text-[10px] font-medium text-[#8c6d66]">Pulang</p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#241716]">
                  {todayAttendance?.jamPulang || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Device permissions */}
          <div className="rounded-3xl border border-[#ead7ce] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f63]">
                Izin Device
              </p>
              <button
                type="button"
                onClick={() => startLocationTracking(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7d4cb] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3c2824] transition hover:border-[#c8a99e] hover:bg-[#fffbf9]"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3" aria-hidden="true">
                  <path d="M14 8a6 6 0 11-1.76-4.24" strokeLinecap="round" />
                  <path d="M14 3v3h-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isLocating ? "Mencari..." : "Refresh"}
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-[#f9f6f4] px-3 py-2.5">
                <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${cameraReady ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8z" />
                    <circle cx="10" cy="12" r="3" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[#4b3230]">Kamera</p>
                  <p className="text-[11px] text-[#7a6059]">{cameraReady ? "Diizinkan" : "Menunggu izin"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#f9f6f4] px-3 py-2.5">
                <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${locationReady ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[#4b3230]">Lokasi</p>
                  <p className="text-[11px] text-[#7a6059]">
                    {locationReady
                      ? "Diizinkan"
                      : isLocating
                        ? "Sedang mencari..."
                        : locationPromptActive
                          ? "Meminta izin..."
                          : "Belum diizinkan"}
                  </p>
                </div>
                {locationAccuracy ? (
                  <span className="whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[10px] font-medium tabular-nums text-[#5c4a46]">
                    ~{Math.round(locationAccuracy)} m
                  </span>
                ) : null}
              </div>

              {location ? (
                <div className="flex items-center gap-2 rounded-xl bg-[#f9f6f4] px-3 py-2">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-none text-[#a16f63]" aria-hidden="true">
                    <path fillRule="evenodd" d="M9.69 18.933C9.89 19.02 10 19 10 19s.11.02.31-.067C11.58 18.4 17 15.05 17 9A7 7 0 103 9c0 6.05 5.42 9.4 6.69 9.933zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate text-[11px] tabular-nums text-[#5c4a46]">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </span>
                </div>
              ) : null}
            </div>

            {locationMessage ? (
              <p className="mt-3 text-[11px] leading-4 text-[#7a6059]">{locationMessage}</p>
            ) : null}
          </div>

          {/* Map */}
          <div className="overflow-hidden rounded-3xl border border-[#ead7ce] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between px-4 pt-4 sm:px-5 sm:pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f63]">
                Lokasi Saat Ini
              </p>
              {location ? (
                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#8f1d22] hover:underline"
                >
                  Buka Maps
                </a>
              ) : null}
            </div>
            <div className="mt-3 bg-[#f7f1ec]">
              {mapUrl ? (
                <iframe
                  title="Peta lokasi presensi"
                  src={mapUrl}
                  className="block h-[200px] w-full border-0 sm:h-[240px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-[200px] items-center justify-center px-6 text-center text-[13px] text-[#7a6059] sm:h-[240px]">
                  <div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto h-7 w-7 text-[#c8b4ae]" aria-hidden="true">
                      <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <p className="mt-2">Menunggu izin lokasi untuk menampilkan peta.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Employee compact */}
          <div className="rounded-3xl border border-[#ead7ce] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-[#8f1d22] to-[#d06c4b] text-white shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f63]">
                  Karyawan
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#241716]">{employeeName}</p>
                <p className="truncate text-[11px] text-[#7a6059]">{employeeMeta}</p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
