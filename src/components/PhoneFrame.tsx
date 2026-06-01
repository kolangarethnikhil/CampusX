import { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#020203] p-6 overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-cx-purple/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cx-green/[0.02] blur-[100px] pointer-events-none" />
      
      {/* Phone container */}
      <div className="relative w-[390px] h-[844px] rounded-[52px] bg-cx-bg overflow-hidden flex flex-col shadow-2xl">
        {/* Phone border/bezel */}
        <div className="absolute inset-0 rounded-[52px] border-[5px] border-[#1a1a22] pointer-events-none z-50" />
        
        {/* Inner glow edge */}
        <div className="absolute inset-[5px] rounded-[47px] ring-1 ring-white/[0.03] pointer-events-none z-50" />
        
        {/* Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-[20px] z-[60] flex items-center justify-end pr-4">
          <div className="w-3 h-3 rounded-full bg-[#0a0a0f] border border-[#22222a]" />
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative noise">
          {children}
        </div>

        {/* Bottom home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-white/[0.15] rounded-full z-[60]" />
        
        {/* Side buttons visual */}
        <div className="absolute top-[120px] -left-[3px] w-[3px] h-[28px] bg-[#2a2a32] rounded-l" />
        <div className="absolute top-[160px] -left-[3px] w-[3px] h-[56px] bg-[#2a2a32] rounded-l" />
        <div className="absolute top-[230px] -left-[3px] w-[3px] h-[56px] bg-[#2a2a32] rounded-l" />
        <div className="absolute top-[150px] -right-[3px] w-[3px] h-[84px] bg-[#2a2a32] rounded-r" />
      </div>
    </div>
  );
}


