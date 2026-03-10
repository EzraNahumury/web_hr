"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import GridScan from "@/components/GridScan";

export default function Home() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("ezra.kristanto@ti.ukdw.ac.id");
  const [password, setPassword] = useState("ftiukdw2022");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Login gagal.");
      }

      router.push("/admin");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan saat login.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-10 sm:px-6">
      <div className="absolute inset-0">
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_36%),linear-gradient(180deg,rgba(3,3,3,0.18)_0%,rgba(5,5,5,0.56)_48%,rgba(5,5,5,0.82)_100%)]" />
        <div className="floating-orb absolute left-[8%] top-[12%] h-56 w-56 rounded-full bg-red-600/18 blur-3xl" />
        <div className="floating-orb-delayed absolute right-[10%] top-[18%] h-72 w-72 rounded-full bg-white/6 blur-3xl" />
        <div className="floating-orb-slow absolute bottom-[8%] left-[14%] h-64 w-64 rounded-full bg-red-500/12 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-md">
        <div className="rounded-[32px] border border-white/12 bg-white/[0.08] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-[18px] sm:p-8">
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo/new logo.png"
              alt="Kayres"
              width={180}
              height={52}
              priority
              className="h-auto w-[156px]"
            />
          </div>

          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-red-200/80">
              Employee Portal
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white">
              Login
            </h1>
            <p className="text-sm leading-7 text-white/68">
              Masuk untuk melanjutkan ke portal karyawan.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white/82">
                Email kerja
              </label>
              <input
                id="email"
                type="email"
                placeholder="nama@kayres.co.id"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-14 w-full rounded-2xl border border-white/14 bg-black/18 px-4 text-white outline-none placeholder:text-white/35 focus:border-red-400/70 focus:bg-black/24 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-white/82"
                >
                  Password
                </label>
                <a href="#" className="text-sm text-white/64 hover:text-red-200">
                  Lupa password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-14 w-full rounded-2xl border border-white/14 bg-black/18 px-4 pr-14 text-white outline-none placeholder:text-white/35 focus:border-red-400/70 focus:bg-black/24 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/55 hover:bg-white/6 hover:text-white"
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 3l18 18"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.88 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 7.5a11.8 11.8 0 01-4.24 5.19"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.61 6.61A11.84 11.84 0 001 11.5C2.73 15.89 7 19 12 19a10.9 10.9 0 004.14-.81"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <label className="flex items-center gap-3 text-sm text-white/72">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-red-500 focus:ring-red-400"
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-950 shadow-[0_16px_32px_rgba(255,255,255,0.16)] hover:-translate-y-0.5 hover:bg-red-50"
            >
              {isSubmitting ? "Memproses..." : "Log In"}
            </button>

            {errorMessage ? (
              <p className="rounded-2xl border border-red-400/20 bg-red-500/12 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </p>
            ) : null}
          </form>

          <p className="mt-7 text-center text-sm text-white/62">
            Butuh bantuan akses?{" "}
            <a
              href="https://wa.me/6289620631551?text=Halo%20Mbak%20El%2C%20saya%20butuh%20bantuan%20akses%20portal%20karyawan."
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:text-red-200"
            >
              Hubungi admin
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
