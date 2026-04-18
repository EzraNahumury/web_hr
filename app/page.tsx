"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GridScan = dynamic(() => import("@/components/GridScan"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    const canUseGrid =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches &&
      !window.matchMedia("(pointer: coarse)").matches;
    setShowGrid(canUseGrid);
  }, []);

  async function requestLoginLocation() {
    if (!navigator.geolocation) return;
    setLocationStatus("Meminta izin lokasi...");
    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { sessionStorage.setItem("web_hr_last_location", JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, capturedAt: Date.now() })); setLocationStatus("Izin lokasi diizinkan."); resolve(); },
        () => { setLocationStatus("Izin lokasi ditolak."); reject(new Error("Izin lokasi dibutuhkan untuk presensi karyawan.")); },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    });
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setIsSubmitting(true); setErrorMessage("");
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const r = (await res.json()) as { message?: string; redirectTo?: string; role?: "admin" | "karyawan" };
      if (!res.ok) throw new Error(r.message || "Login gagal.");
      if (r.role === "karyawan") {
        try { await requestLoginLocation(); } catch { /* biarkan login lanjut */ }
      }
      router.push(r.redirectTo || "/");
    } catch (err) { setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan."); }
    finally { setIsSubmitting(false); }
  }

  async function handleSignupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErrorMessage(""); setSuccessMessage("");
    if (!signupEmail || !signupPassword) { setErrorMessage("Email dan password wajib diisi."); return; }
    if (signupPassword.length < 6) { setErrorMessage("Password minimal 6 karakter."); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: signupEmail, password: signupPassword }) });
      const r = (await res.json()) as { message?: string }; if (!res.ok) throw new Error(r.message || "Gagal.");
      setSuccessMessage(r.message || "Pendaftaran berhasil!"); setSignupEmail(""); setSignupPassword("");
    } catch (err) { setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan."); } finally { setIsSubmitting(false); }
  }

  function switchTab(tab: "login" | "signup") { setActiveTab(tab); setErrorMessage(""); setSuccessMessage(""); }

  const inputClass = "h-14 w-full rounded-xl border border-white/15 bg-white/[0.04] px-5 text-white outline-none placeholder:text-white/25 focus:border-[#e74c4c]/50 focus:bg-white/[0.07] transition";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e0e0e] p-4 sm:p-8">
      {/* Animated background (desktop only; fallback gradient di mobile untuk hemat battery & cegah crash WebGL) */}
      <div className="absolute inset-0">
        {showGrid ? (
          <GridScan
            sensitivity={0.55}
            lineThickness={1}
            linesColor="#2f2228"
            gridScale={0.1}
            scanColor="#ff4d5e"
            scanOpacity={0.4}
            enablePost
            bloomIntensity={0.6}
            chromaticAberration={0.002}
            noiseIntensity={0.01}
            className="absolute inset-0"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(143,29,34,0.28),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(143,29,34,0.18),transparent_55%),#0e0e0e]" />
        )}
      </div>
      <div className="absolute right-[15%] top-[10%] h-[400px] w-[400px] rounded-full bg-[#8f1d22]/8 blur-[120px]" />
      <div className="absolute bottom-[15%] left-[10%] h-[300px] w-[300px] rounded-full bg-[#8f1d22]/5 blur-[100px]" />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-[960px] overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(135deg,rgba(20,18,18,0.95),rgba(14,12,12,0.98))] shadow-[0_50px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl">

        {/* Left - Form */}
        <div className="flex w-full flex-col justify-center px-8 py-10 sm:px-12 sm:py-14 lg:w-[55%]">
          <h1 className="text-[1.75rem] font-extrabold uppercase tracking-wide text-[#e74c4c] sm:text-[2rem]">
            {activeTab === "login" ? "Welcome Back!" : "Create Account"}
          </h1>
          <p className="mt-2 text-sm text-white/40">
            {activeTab === "login" ? (
              <>Belum punya akun? <button type="button" onClick={() => switchTab("signup")} className="font-semibold text-white/70 underline decoration-white/30 underline-offset-2 hover:text-white">Sign Up</button></>
            ) : (
              <>Sudah punya akun? <button type="button" onClick={() => switchTab("login")} className="font-semibold text-white/70 underline decoration-white/30 underline-offset-2 hover:text-white">Sign In</button></>
            )}
          </p>

          {activeTab === "login" ? (
            <form className="mt-10 space-y-5" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Email</label>
                <input type="email" placeholder="nama@kayres.co.id" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M3 3l18 18" strokeLinecap="round" /><path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" strokeLinecap="round" /><path d="M9.88 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 7.5a11.8 11.8 0 01-4.24 5.19" strokeLinecap="round" /><path d="M6.61 6.61A11.84 11.84 0 001 11.5C2.73 15.89 7 19 12 19a10.9 10.9 0 004.14-.81" strokeLinecap="round" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" strokeLinecap="round" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="!mt-8 flex h-14 w-full max-w-[220px] items-center justify-center rounded-xl border-2 border-[#e74c4c] bg-[#e74c4c]/10 text-sm font-bold uppercase tracking-wider text-[#e74c4c] transition hover:bg-[#e74c4c] hover:text-white">
                {isSubmitting ? "Memproses..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form className="mt-10 space-y-5" onSubmit={handleSignupSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Email</label>
                <input type="email" placeholder="nama@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className={inputClass} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Password</label>
                <input type="password" placeholder="Minimal 6 karakter" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className={inputClass} required minLength={6} />
              </div>
              <button type="submit" disabled={isSubmitting} className="!mt-8 flex h-14 w-full max-w-[220px] items-center justify-center rounded-xl border-2 border-[#e74c4c] bg-[#e74c4c]/10 text-sm font-bold uppercase tracking-wider text-[#e74c4c] transition hover:bg-[#e74c4c] hover:text-white">
                {isSubmitting ? "Memproses..." : "Sign Up"}
              </button>
            </form>
          )}

          {errorMessage ? <p className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMessage}</p> : null}
          {successMessage ? <p className="mt-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{successMessage}</p> : null}
          {locationStatus ? <p className="mt-5 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/50">{locationStatus}</p> : null}
        </div>

        {/* Right - Visual */}
        <div className="relative hidden flex-1 items-center justify-center lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(143,29,34,0.15),transparent_70%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          <div className="relative flex flex-col items-center">
            {/* Logo circle */}
            <div className="flex h-[220px] w-[220px] items-center justify-center rounded-full border-2 border-white/[0.08] bg-[radial-gradient(circle,rgba(143,29,34,0.2),transparent_70%)] shadow-[0_0_80px_rgba(143,29,34,0.15)]">
              <Image src="/logo/new logo.png" alt="Kayres" width={200} height={58} className="h-auto w-[120px]" />
            </div>

            <h3 className="mt-8 text-center text-lg font-bold text-white/80">Employee Portal</h3>
            <p className="mt-2 max-w-[200px] text-center text-xs leading-relaxed text-white/30">
              Absensi, payroll, kontrak &amp; lembur dalam satu platform.
            </p>

            <a
              href="https://wa.me/6289620631551?text=Halo%20Mbak%20El%2C%20saya%20butuh%20bantuan%20akses%20portal%20karyawan."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-xs font-semibold text-white/40 transition hover:border-white/20 hover:text-white/60"
            >
              Hubungi Admin
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
