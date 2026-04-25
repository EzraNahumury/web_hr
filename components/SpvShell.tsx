import LogoutButton from "@/components/LogoutButton";

type Props = {
  title: string;
  description: string;
  spvName: string;
  spvEmail: string;
  children: React.ReactNode;
};

export default function SpvShell({
  title,
  description,
  spvName,
  spvEmail,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-[#f5f2f1] text-[#141414]">
      <header className="border-b border-[#ead9d6] bg-[linear-gradient(135deg,#1a0608_0%,#3a0d11_55%,#560f15_100%)] text-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ef4444_0%,#991b1b_100%)] shadow-[0_16px_32px_rgba(185,28,28,0.35)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4 text-white"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 10h18" />
              <path d="M8 2v4" strokeLinecap="round" />
              <path d="M16 2v4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f0a8ad]">
              SPV Workspace
            </p>
            <h1 className="mt-0.5 truncate text-[1.125rem] font-semibold leading-tight tracking-[-0.03em] sm:text-[1.35rem]">
              {title}
            </h1>
          </div>
          <div className="hidden text-right text-xs leading-tight md:block">
            <p className="font-semibold text-white">{spvName}</p>
            <p className="text-[#f4cfd1]">{spvEmail}</p>
          </div>
          <div className="w-32 [&_button]:!bg-white/10 [&_button]:!border-white/15 [&_button]:!text-white hover:[&_button]:!bg-white/20">
            <LogoutButton />
          </div>
        </div>
        {description ? (
          <p className="mx-auto max-w-[1600px] px-4 pb-4 text-[13px] leading-5 text-[#f4cfd1] sm:px-6 sm:text-sm sm:leading-6 lg:px-8">
            {description}
          </p>
        ) : null}
      </header>

      <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 sm:pb-8 lg:px-8">
        {children}
      </div>
    </main>
  );
}
