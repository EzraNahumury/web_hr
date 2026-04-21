"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Client error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e0e0e] p-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#1a1414] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <h1 className="text-xl font-semibold text-white">Terjadi kesalahan</h1>
        <p className="text-sm text-white/60">
          Halaman sedang bermasalah. Coba muat ulang halaman atau kembali ke halaman awal.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#8f1d22] px-5 text-sm font-semibold text-white transition hover:bg-[#7a171c]"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white/80 transition hover:border-white/30"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    </main>
  );
}
