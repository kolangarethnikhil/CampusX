import { MessageStatus } from "../../services/chatService";

interface MessageStatusDotsProps {
  status: MessageStatus;
}

export default function MessageStatusDots({ status }: MessageStatusDotsProps) {
  if (status === "seen") {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-kjc-accent shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-kjc-accent shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
    </span>
  );
}