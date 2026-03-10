"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } finally {
      router.push("/");
      router.refresh();
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className="h-12 w-full rounded-[22px] border border-[#e8d3cb] bg-white px-5 text-sm font-semibold text-[#3a2623] shadow-[0_12px_24px_rgba(93,55,45,0.08)] hover:-translate-y-0.5 hover:border-[#c6716b] hover:text-[#8f1d22] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isSubmitting ? "Keluar..." : "Logout"}
    </button>
  );
}
