import {
  ArrowLeft,
  Crown,
  Eye,
  MoreVertical,
  Plus,
  Send,
  Smile,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppIcon, { type AppIconName } from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import { requestModeratorRole } from "../services/moderatorRequestService";
import {
  sendSpaceMessage,
  subscribeToSpaceMessages,
} from "../services/spaceMessageService";
import { joinSpace, subscribeToSpaceMembers } from "../services/spaceService";
import type { CampusSpace, SpaceMember, SpaceMessage } from "../types/space";

interface MemberUi {
  name: string;
  role: "Admin" | "Moderator" | "Member";
  initial: string;
  color: string;
  online?: boolean;
}

function memberToUi(member: SpaceMember): MemberUi {
  const role =
    member.role === "admin"
      ? "Admin"
      : member.role === "moderator"
        ? "Moderator"
        : "Member";

  const name = member.displayName || "CampusX user";

  return {
    name,
    role,
    initial: name.charAt(0).toUpperCase() || "X",
    color:
      role === "Admin"
        ? "#f59e0b"
        : role === "Moderator"
          ? "#8b5cf6"
          : "#06b6d4",
    online: true,
  };
}

function messageTime(message: SpaceMessage) {
  const ms = message.createdAt?.toMillis?.();

  if (!ms) return "now";

  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RoomChatScreenProps {
  space: CampusSpace;
  onBack: () => void;
}

export default function RoomChatScreen({ space, onBack }: RoomChatScreenProps) {
  const [message, setMessage] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [members, setMembers] = useState<MemberUi[]>([]);
  const [messages, setMessages] = useState<SpaceMessage[]>([]);
  const [status, setStatus] = useState("");

  const { user, signIn } = useAuth();

  const icon = (space.icon || "networking") as AppIconName;
  const accent = space.accent || "#8b5cf6";

  const memberCount = Math.max(space.memberCount || 0, members.length);
  const onlineCount = space.activeCount || members.filter((m) => m.online).length;

  useEffect(() => {
    let unsubMembers: (() => void) | undefined;
    let unsubMessages: (() => void) | undefined;

    try {
      unsubMembers = subscribeToSpaceMembers(space.id, (items) => {
        setMembers(items.map(memberToUi));
      });

      unsubMessages = subscribeToSpaceMessages(space.id, (items) => {
        setMessages(items);
      });
    } catch (error) {
      console.error("Room subscriptions failed", error);
    }

    return () => {
      unsubMembers?.();
      unsubMessages?.();
    };
  }, [space.id]);

  useEffect(() => {
    if (!user) return;

    void joinSpace(space).catch((error) => {
      console.error("joinSpace failed", error);
    });
  }, [space, user]);

  const moderatorName = useMemo(() => {
    return (
      members.find((member) => member.role === "Admin")?.name ||
      members.find((member) => member.role === "Moderator")?.name ||
      "CampusX Admin"
    );
  }, [members]);

  const handleSend = async () => {
    const text = message.trim();

    if (!text) return;

    if (!user) {
      setStatus("Sign in to send messages.");
      await signIn().catch(() => null);
      return;
    }

    setMessage("");

    try {
      await joinSpace(space);

      await sendSpaceMessage({
        spaceId: space.id,
        campusId: space.campusId,
        text,
      });
    } catch (error) {
      console.error(error);
      setMessage(text);
      setStatus("Could not send message. Try again.");
    }
  };

  const handleRequestModerator = async () => {
    if (!user) {
      await signIn().catch(() => null);
      return;
    }

    try {
      await requestModeratorRole({
        spaceId: space.id,
        campusId: space.campusId,
        reason: `I want to help moderate ${space.name}.`,
      });

      setStatus("Moderator request sent.");
    } catch (error) {
      console.error(error);
      setStatus("Could not request moderator role.");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cx-bg">
      <div className="relative pt-14 px-4 pb-4 bg-gradient-radial overflow-hidden">
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] opacity-30"
          style={{ background: accent }}
        />

        <div className="relative flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full glass interactive-glass flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-cx-text" />
          </button>

          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            <div
              className="w-11 h-11 rounded-2xl glass flex items-center justify-center overflow-hidden"
              style={{ background: `${accent}12` }}
            >
              <AppIcon name={icon} size={36} />
            </div>

            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold text-cx-text truncate">
                {space.name}
              </h2>
              <p className="text-cx-text-muted text-[11px] truncate">
                {onlineCount} online · {memberCount} members
              </p>
            </div>
          </button>

          <button
            onClick={() => setShowInfo(true)}
            className="w-9 h-9 rounded-full glass interactive-glass flex items-center justify-center"
          >
            <Eye size={16} className="text-cx-text-secondary" />
          </button>

          <button
            onClick={() => setShowInfo(true)}
            className="w-9 h-9 rounded-full glass interactive-glass flex items-center justify-center"
          >
            <MoreVertical size={16} className="text-cx-text-secondary" />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-white/[0.035] bg-cx-bg/70">
        <p className="text-cx-purple-bright text-[10px] text-center tracking-wide">
          Rules: Be respectful · No spam · Moderator can remove unsafe posts
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-mesh">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div
              className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-4"
              style={{ background: `${accent}12` }}
            >
              <AppIcon name={icon} size={38} />
            </div>
            <p className="text-[15px] font-semibold text-cx-text">
              No messages yet
            </p>
            <p className="text-[11px] text-cx-text-muted mt-1 leading-relaxed">
              Join the space and start the first real conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.uid;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  } animate-fade-up`}
                >
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <span className="text-cx-purple-bright text-[10px] font-medium tracking-wide">
                        {msg.senderName || "CampusX user"}
                      </span>

                      {msg.senderRole === "moderator" && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cx-amber/10 text-cx-amber">
                          MOD
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? "bg-cx-purple/75 rounded-tr-md"
                        : "glass-elevated rounded-tl-md"
                    }`}
                  >
                    <p className="text-[13px] text-cx-text leading-relaxed">
                      {msg.text}
                    </p>
                  </div>

                  <span
                    className={`text-cx-text-muted text-[9px] mt-1 ${
                      isMe ? "mr-1" : "ml-1"
                    }`}
                  >
                    {messageTime(msg)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {status && (
          <p className="text-[10px] text-cx-text-muted mt-3 text-center">
            {status}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-3 border-t border-white/[0.04] bg-cx-bg/90 backdrop-blur-2xl">
        <button
          onClick={() => setShowInfo(true)}
          className="w-9 h-9 rounded-full glass interactive-glass flex items-center justify-center flex-shrink-0"
        >
          <Plus size={17} className="text-cx-text-secondary" />
        </button>

        <input
          type="text"
          placeholder={user ? "Type a message..." : "Sign in to message..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSend();
          }}
          className="flex-1 input-premium rounded-full px-4 py-2.5 text-[13px] text-cx-text placeholder:text-cx-text-muted"
        />

        <button className="w-9 h-9 rounded-full glass interactive-glass flex items-center justify-center flex-shrink-0">
          <Smile size={17} className="text-cx-text-secondary" />
        </button>

        <button
          onClick={handleSend}
          className="w-9 h-9 rounded-full bg-cx-purple hover:bg-cx-purple-dim transition-all flex items-center justify-center flex-shrink-0 shadow-lg shadow-cx-purple/20"
        >
          <Send size={15} className="text-white" />
        </button>
      </div>

      {showInfo && (
        <div className="absolute inset-0 z-[80] bg-black/70 flex items-end animate-fade-in">
          <button className="absolute inset-0" onClick={() => setShowInfo(false)} />

          <div className="relative w-full rounded-t-[30px] bg-cx-card-elevated border-t border-white/[0.08] p-5 animate-slide-up">
            <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />

            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-2xl glass flex items-center justify-center overflow-hidden"
                style={{ background: `${accent}12` }}
              >
                <AppIcon name={icon} size={40} />
              </div>

              <div>
                <h3 className="text-[18px] font-semibold text-cx-text">
                  {space.name}
                </h3>
                <p className="text-[11px] text-cx-text-muted">
                  {memberCount} members · {onlineCount} online
                </p>
              </div>
            </div>

            <p className="text-[11px] text-cx-text-muted leading-relaxed mb-4">
              {space.description}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={handleRequestModerator}
                className="rounded-2xl bg-cx-purple/10 border border-cx-purple/20 py-3 text-[11px] font-semibold text-cx-purple-bright"
              >
                Request moderator
              </button>

              <button className="rounded-2xl bg-white/[0.035] border border-white/[0.06] py-3 text-[11px] font-semibold text-cx-text-secondary">
                View members
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {members.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.025] border border-white/[0.04] px-3 py-4 text-center">
                  <p className="text-[11px] text-cx-text-muted">
                    No members yet. Join this space to appear here.
                  </p>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center justify-between rounded-2xl bg-white/[0.025] border border-white/[0.04] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                        style={{ background: member.color }}
                      >
                        {member.initial}
                      </div>

                      <div>
                        <p className="text-[12px] font-medium text-cx-text">
                          {member.name}
                        </p>
                        <p className="text-[9px] text-cx-text-muted">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    {member.role !== "Member" ? (
                      <Crown size={13} className="text-cx-amber" />
                    ) : member.online ? (
                      <span className="text-[9px] text-cx-lime font-semibold">
                        online
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <p className="text-[10px] text-cx-text-muted mt-3">
              Moderation: {moderatorName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}