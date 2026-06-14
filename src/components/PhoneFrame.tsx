import { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="min-h-[100dvh] bg-[#020203] text-cx-text overflow-hidden">
      {/* Real mobile/PWA view */}
      <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-cx-bg md:hidden">
        {children}
      </div>

      {/* Desktop/laptop preview frame */}
      <div className="relative hidden min-h-screen items-center justify-center overflow-hidden bg-[#020203] p-6 md:flex">
        <div className="absolute top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cx-purple/[0.03] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-cx-green/[0.02] blur-[100px] pointer-events-none" />

        <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[52px] bg-cx-bg shadow-2xl">
          <div className="pointer-events-none absolute inset-0 z-50 rounded-[52px] border-[5px] border-[#1a1a22]" />
          <div className="pointer-events-none absolute inset-[5px] z-50 rounded-[47px] ring-1 ring-white/[0.03]" />

          <div className="absolute top-3 left-1/2 z-[60] flex h-[34px] w-[126px] -translate-x-1/2 items-center justify-end rounded-[20px] bg-black pr-4">
            <div className="h-3 w-3 rounded-full border border-[#22222a] bg-[#0a0a0f]" />
          </div>

          <div className="relative flex flex-1 flex-col overflow-hidden noise">
            {children}
          </div>

          <div className="absolute bottom-2 left-1/2 z-[60] h-[5px] w-[130px] -translate-x-1/2 rounded-full bg-white/[0.15]" />
        </div>
      </div>
    </div>
  );
}