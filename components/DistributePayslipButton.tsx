"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function DistributePayslipButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  function handleClick() {
    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/payslip-distribution", {
          method: "POST",
        });
        const result = (await response.json()) as { message?: string; distributed?: number };

        if (!response.ok) {
          setFeedback({ type: "error", text: result.message || "Gagal mendistribusikan slip." });
          return;
        }

        setFeedback({
          type: "success",
          text: result.message || "Distribusi berhasil.",
        });
        router.refresh();
      } catch {
        setFeedback({ type: "error", text: "Terjadi kesalahan jaringan." });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-2xl bg-[#8f1d22] px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(143,29,34,0.25)] transition hover:bg-[#a12228] hover:shadow-[0_4px_14px_rgba(143,29,34,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-20"
            />
            <path
              d="M12 2a10 10 0 019.95 9"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        )}
        {isPending ? "Mendistribusikan..." : "Distribusi Slip Gaji"}
      </button>

      {feedback ? (
        <p
          className={
            feedback.type === "success"
              ? "max-w-xs rounded-lg bg-emerald-50 px-3 py-1.5 text-right text-xs font-medium text-emerald-700"
              : "max-w-xs rounded-lg bg-rose-50 px-3 py-1.5 text-right text-xs font-medium text-rose-700"
          }
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
