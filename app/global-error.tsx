"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global client error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, background: "#0e0e0e", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420, background: "#1a1414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Terjadi kesalahan</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.55, marginBottom: 20 }}>
              Halaman sedang bermasalah. Coba muat ulang atau kembali ke halaman login.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{ height: 44, padding: "0 20px", borderRadius: 12, background: "#8f1d22", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.href = "/";
                }}
                style={{ height: 44, padding: "0 20px", borderRadius: 12, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.15)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Kembali ke Login
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
