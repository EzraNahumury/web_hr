"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ConfirmTone = "danger" | "warning" | "info";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type InternalState = ConfirmOptions & {
  open: boolean;
  resolver?: (value: boolean) => void;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

const TONE_STYLES: Record<ConfirmTone, { ring: string; iconBg: string; iconColor: string; button: string }> = {
  danger: {
    ring: "ring-[#f3c8c2]",
    iconBg: "bg-[#fdecea]",
    iconColor: "text-[#c0392b]",
    button: "bg-[#c0392b] hover:bg-[#a82d20] focus-visible:ring-[#c0392b]/40 text-white",
  },
  warning: {
    ring: "ring-[#f5e3b3]",
    iconBg: "bg-[#fff5d6]",
    iconColor: "text-[#a67500]",
    button: "bg-[#a67500] hover:bg-[#8a6100] focus-visible:ring-[#a67500]/40 text-white",
  },
  info: {
    ring: "ring-[#d2e3f3]",
    iconBg: "bg-[#e6f0fb]",
    iconColor: "text-[#1f5896]",
    button: "bg-[#1f5896] hover:bg-[#174677] focus-visible:ring-[#1f5896]/40 text-white",
  },
};

function ToneIcon({ tone }: { tone: ConfirmTone }) {
  const className = `h-6 w-6 ${TONE_STYLES[tone].iconColor}`;
  if (tone === "danger") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6 17.5 21a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InternalState>({ open: false });
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        tone: options.tone,
        resolver: resolve,
      });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setState((prev) => {
      prev.resolver?.(value);
      return { open: false };
    });
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      } else if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    const focusTimer = window.setTimeout(() => confirmButtonRef.current?.focus(), 30);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [state.open, close]);

  const tone: ConfirmTone = state.tone ?? "danger";
  const toneStyle = TONE_STYLES[tone];
  const title = state.title ?? "Konfirmasi tindakan";
  const description = state.description ?? "Apakah Anda yakin ingin melanjutkan?";
  const confirmLabel = state.confirmLabel ?? "Ya, lanjutkan";
  const cancelLabel = state.cancelLabel ?? "Batal";

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state.open ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={() => close(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-[#1c0e0a]/55 backdrop-blur-sm transition-opacity duration-200 animate-[fadeIn_180ms_ease-out]"
          />
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)] shadow-[0_30px_80px_rgba(58,24,12,0.28)] ring-1 ${toneStyle.ring} animate-[scaleIn_220ms_cubic-bezier(0.2,0.8,0.2,1)]`}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(192,57,43,0.18),transparent_70%)]" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(166,117,0,0.12),transparent_70%)]" />

            <div className="relative px-7 pt-7">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneStyle.iconBg} shadow-[0_10px_24px_rgba(58,24,12,0.08)]`}>
                  <ToneIcon tone={tone} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="confirm-dialog-title" className="text-lg font-semibold text-[#241716]">{title}</h2>
                  <p id="confirm-dialog-description" className="mt-2 text-sm leading-relaxed text-[#6e574f]">{description}</p>
                </div>
              </div>
            </div>

            <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[#f1e1d8] bg-white/60 px-7 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => close(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#e2cfc6] bg-white px-5 text-sm font-semibold text-[#5a443d] transition hover:bg-[#fdf6f1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e2cfc6]/60"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => close(true)}
                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold shadow-[0_12px_28px_rgba(58,24,12,0.18)] transition focus-visible:outline-none focus-visible:ring-4 ${toneStyle.button}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>

          <style jsx global>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { opacity: 0; transform: translateY(12px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return ctx;
}
