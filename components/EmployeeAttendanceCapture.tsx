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
const CHECK_IN_OPTIONS: Array<{ value: CheckInStatus; label: string; helper: string }> = [
  { value: "hadir", label: "Masuk (O)", helper: "Selfie dan lokasi wajib." },
  { value: "izin", label: "Izin / Off (X)", helper: "Isi keterangan, tanpa selfie." },
  { value: "sakit", label: "Sakit Pakai Surat (S)", helper: "Upload surat sakit." },
  { value: "sakit_tanpa_surat", label: "Sakit Tanpa Surat (SX)", helper: "Isi keterangan sakit." },
  {
    value: "setengah_hari",
    label: "Setengah Hari (H)",
    helper: "Selfie dan lokasi wajib. Acuan jam: 08:30-12:00 atau 13:00-16:30.",
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
        `Lokasi saat ini berhasil diperbarui. Akurasi sekitar ${Math.round(snapshot.accuracy)} meter.`,
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
    setLocationMessage("Sedang mencari lokasi saat ini...");
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
          `Lokasi terbaik sudah ditemukan. Akurasi sekitar ${Math.round(bestAccuracyRef.current)} meter.`,
        );
      } else {
        setErrorMessage("Lokasi saat ini belum berhasil didapatkan. Coba cari ulang.");
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
        <section className="rounded-[32px] border border-[#ead7ce] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                Presensi Aktif
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[#241716]">
                {isCheckIn ? "Check-In Selfie" : "Check-Out Selfie"}
              </h3>
            </div>
            <span className="rounded-full bg-[#fff5ef] px-4 py-2 text-sm font-semibold text-[#8f1d22]">
              {cameraReady ? "Kamera aktif" : "Menyiapkan kamera"}
            </span>
          </div>

          {locationPromptActive && !locationReady ? (
            <div className="mt-4 rounded-2xl border border-[#f3d6ca] bg-[#fff6f1] px-4 py-3 text-sm text-[#8f1d22]">
              Izinkan akses lokasi saat ini agar sistem bisa mencari posisi presensi sekarang.
            </div>
          ) : null}

          <div className="mt-6">
            {isCheckOutBlocked ? (
              <div className="mb-5 rounded-2xl border border-[#f3d6ca] bg-[#fff6f1] px-4 py-3 text-sm text-[#8f1d22]">
                Status hari ini adalah {todayAttendance?.statusAbsensi}. Presensi pulang tidak
                diperlukan.
              </div>
            ) : null}
            {isCheckIn ? (
                <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {CHECK_IN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setCheckInStatus(option.value);
                      setSickFile(null);
                      setErrorMessage("");
                    }}
                    className={
                      checkInStatus === option.value
                        ? "rounded-2xl border border-[#c8716d] bg-[#fff3ef] px-4 py-3 text-left text-sm font-semibold text-[#8f1d22]"
                        : "rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-left text-sm font-semibold text-[#4b3230]"
                    }
                  >
                    <div>{option.label}</div>
                    <div className="mt-1 text-xs font-medium text-[#8c6d66]">{option.helper}</div>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mx-auto max-w-[360px] overflow-hidden rounded-[28px] border border-[#ead7ce] bg-[#fff8f4]">
              {isCheckIn && !needsSelfie ? (
                <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm text-[#7a6059]">
                  {checkInStatus === "sakit"
                    ? "Untuk status sakit pakai surat, upload bukti sakit. Selfie tidak diwajibkan."
                    : checkInStatus === "sakit_tanpa_surat"
                      ? "Untuk sakit tanpa surat, isi keterangan. Selfie tidak diwajibkan."
                      : "Untuk izin/off, isi keterangan. Selfie tidak diwajibkan."}
                </div>
              ) : isCheckOutBlocked ? (
                <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm text-[#7a6059]">
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

          <div className="mt-5 flex flex-wrap gap-3">
            {needsSelfie && !isCheckOutBlocked ? (
              <button
                type="button"
                onClick={captureSelfie}
                className="rounded-2xl bg-[#8f1d22] px-5 py-3 text-sm font-semibold text-white"
              >
                {photoDataUrl ? "Ambil Ulang Selfie" : "Ambil Selfie"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={submitAttendance}
              disabled={isPending || isCheckOutBlocked}
              className="rounded-2xl border border-[#e7d4cb] bg-white px-5 py-3 text-sm font-semibold text-[#3c2824] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending
                ? "Menyimpan..."
                : isCheckIn
                  ? checkInStatus === "sakit"
                    ? "Kirim Sakit Dengan Surat"
                    : checkInStatus === "sakit_tanpa_surat"
                      ? "Kirim Sakit Tanpa Surat"
                      : checkInStatus === "izin"
                        ? "Kirim Izin / Off"
                        : checkInStatus === "setengah_hari"
                          ? "Kirim Setengah Hari"
                          : "Kirim Presensi Masuk"
                  : "Kirim Presensi Pulang"}
            </button>
          </div>

          {isCheckIn && (needsSickProof || showsNote) ? (
            <div className="mt-5 space-y-4 rounded-[28px] border border-[#ead7ce] bg-[#fff8f4] p-4">
              {needsSickProof ? (
                <div>
                  <p className="text-sm font-semibold text-[#2f1f1d]">Upload Bukti Sakit</p>
                  <label className="mt-3 flex h-12 cursor-pointer items-center justify-between rounded-2xl border border-[#ead7ce] bg-white px-3.5 transition hover:border-[#d2b0a5]">
                    <span className="inline-flex h-9 items-center rounded-xl bg-[#8f1d22] px-4 text-sm font-semibold text-white">
                      Pilih File
                    </span>
                    <span className="ml-3 truncate text-sm text-[#7d635c]">
                      {sickFile ? sickFile.name : "Belum ada file dipilih"}
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
                    className="mt-3 w-full rounded-2xl border border-[#ead7ce] bg-white px-4 py-3 text-sm text-[#241716] outline-none focus:border-[#c8716d]"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="rounded-[32px] border border-[#ead7ce] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
              Data Karyawan
            </p>
            <p className="mt-4 text-xl font-semibold text-[#241716]">{employeeName}</p>
            <p className="mt-1 text-sm text-[#7a6059]">{employeeMeta}</p>
          </div>

          <div className="rounded-[32px] border border-[#ead7ce] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
                  Izin Device
                </p>
                <div className="mt-4 space-y-3 text-sm text-[#7a6059]">
                  <p>Kamera: {cameraReady ? "diizinkan" : "menunggu izin"}</p>
                  <p>
                    Lokasi:{" "}
                    {locationReady
                      ? "diizinkan"
                      : isLocating
                        ? "sedang mencari posisi saat ini"
                        : locationPromptActive
                          ? "meminta izin lokasi saat ini"
                          : "belum diizinkan"}
                  </p>
                  <p>
                    Koordinat:{" "}
                    {location
                      ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                      : "-"}
                  </p>
                  <p>Akurasi: {locationAccuracy ? `${Math.round(locationAccuracy)} meter` : "-"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => startLocationTracking(true)}
                className="rounded-2xl border border-[#e7d4cb] bg-white px-4 py-2 text-sm font-semibold text-[#3c2824]"
              >
                {isLocating ? "Mencari..." : "Cari Lokasi Saat Ini"}
              </button>
            </div>

            {locationMessage ? (
              <div className="mt-4 rounded-2xl border border-[#d9e6f8] bg-[#f5f9ff] px-4 py-3 text-sm text-[#34507a]">
                {locationMessage}
              </div>
            ) : null}
          </div>

          <div className="rounded-[32px] border border-[#ead7ce] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
              Lokasi Saat Ini
            </p>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-[#ead7ce] bg-[#f7f1ec]">
              {mapUrl ? (
                <iframe
                  title="Peta lokasi presensi"
                  src={mapUrl}
                  className="h-[260px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center px-6 text-center text-sm text-[#7a6059]">
                  Menunggu izin lokasi untuk menampilkan peta presensi.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#ead7ce] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a16f63]">
              Status Hari Ini
            </p>
            <div className="mt-4 space-y-3 text-sm text-[#7a6059]">
              <p>Tanggal: {todayAttendance?.tanggal || "-"}</p>
              <p>Jam masuk: {todayAttendance?.jamMasuk || "-"}</p>
              <p>Jam pulang: {todayAttendance?.jamPulang || "-"}</p>
              <p>Status: {todayAttendance?.statusAbsensi || "-"}</p>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
