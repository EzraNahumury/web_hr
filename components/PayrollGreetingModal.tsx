"use client";

import { useEffect, useRef, useState } from "react";

type GreetingPayload = { name?: string };

const CONFETTI_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#fbbf24",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#10b981",
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  shape: "rect" | "circle";
};

function spawnParticles(width: number, height: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.random() > 0.5 ? "rect" : "circle",
    });
  }
  return particles;
}

export default function PayrollGreetingModal() {
  const [open, setOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("payrollGreeting");
      if (!raw) return;
      sessionStorage.removeItem("payrollGreeting");
      const parsed = JSON.parse(raw) as GreetingPayload;
      setEmployeeName(parsed.name ?? "");
      setOpen(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particlesRef.current = spawnParticles(canvas.width, canvas.height, 180);

    const startTime = Date.now();
    const burstInterval = window.setInterval(() => {
      if (Date.now() - startTime < 4000) {
        particlesRef.current.push(...spawnParticles(canvas.width, canvas.height, 80));
      }
    }, 1200);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter((p) => p.y < canvas.height + 50);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      animationRef.current = window.requestAnimationFrame(tick);
    };
    animationRef.current = window.requestAnimationFrame(tick);

    const stopTimer = window.setTimeout(() => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      window.clearInterval(burstInterval);
    }, 8000);

    return () => {
      window.removeEventListener("resize", resize);
      window.clearInterval(burstInterval);
      window.clearTimeout(stopTimer);
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center px-4 py-6">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      <button
        type="button"
        aria-label="Tutup"
        onClick={() => setOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-[#1c0e0a]/55 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(160deg,#fff8ed_0%,#ffe9c2_55%,#ffd28a_100%)] shadow-[0_30px_80px_rgba(58,24,12,0.32)] animate-[scaleIn_260ms_cubic-bezier(0.2,0.8,0.2,1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payroll-greeting-title"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.7),transparent_70%)]" />
        <div className="pointer-events-none absolute -left-12 -bottom-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,193,7,0.35),transparent_70%)]" />

        <div className="relative px-7 pb-7 pt-9 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-4xl shadow-[0_10px_28px_rgba(58,24,12,0.18)]">
            🎉
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7c5b00]">Hari Gajian</p>
          <h2 id="payroll-greeting-title" className="mt-2 text-2xl font-semibold text-[#3d2400] sm:text-3xl">
            Selamat Menerima Gaji!
          </h2>
          {employeeName ? (
            <p className="mt-3 text-base font-medium text-[#5b4400]">
              Hai, <span className="font-bold uppercase">{employeeName}</span> 👋
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-[#6e5230]">
            Gaji kamu sudah ditransfer hari ini. Terima kasih atas dedikasi dan kerja kerasnya — semoga berkah dan bermanfaat. ✨
          </p>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#3d2400] px-8 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(58,24,12,0.28)] transition hover:bg-[#5b4400]"
          >
            Terima Kasih!
          </button>
        </div>

        <style jsx global>{`
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: translateY(16px) scale(0.94);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
