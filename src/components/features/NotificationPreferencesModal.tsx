import React, { useEffect, useState } from "react";
import { Bell, Loader2, Mail, Megaphone, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.tsx";
import {
  isPushSupported,
  requestPushPermissionAndToken,
} from "../../services/pushNotificationService.ts";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  const { profile, updateProfile } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingPush, setRequestingPush] = useState(false);

  useEffect(() => {
    if (!isOpen || !profile) return;

    setNotificationsEnabled(Boolean(profile.notificationsEnabled));
    setEmailNotifications(Boolean(profile.emailNotifications));
    setMarketingOptIn(Boolean(profile.marketingOptIn));

    isPushSupported().then(setPushSupported).catch(() => setPushSupported(false));
  }, [isOpen, profile]);

  if (!isOpen || !profile) return null;

  const enableMessageAlerts = async () => {
    if (!pushSupported) {
      alert("Push notifications are not supported on this browser/device yet.");
      return;
    }

    setRequestingPush(true);

    try {
      const pushResult = await requestPushPermissionAndToken();

      if (!pushResult.token) {
        await updateProfile({
          notificationsEnabled: false,
          pushPermission: pushResult.permission,
        });

        setNotificationsEnabled(false);
        alert(
          pushResult.errorMessage ||
            (pushResult.permission === "unsupported"
              ? "Push notifications are not supported on this browser or device."
              : "Notification permission was not granted.")
        );
        return;
      }

      await updateProfile({
        notificationsEnabled: true,
        fcmToken: pushResult.token,
        fcmTokenUpdatedAt: new Date(),
        pushPermission: pushResult.permission,
      });
      setNotificationsEnabled(true);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setRequestingPush(false);
    }
  };

  const save = async () => {
    setSaving(true);

    try {
      await updateProfile({
        notificationsEnabled,
        emailNotifications,
        marketingOptIn,
      });

      onClose();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/85"
        aria-label="Close notification settings"
      />

      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[44px] border border-white/10 bg-black p-8 shadow-pro-lg scrollbar-hide sm:rounded-[44px]">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-kjc-accent">
              Preferences
            </p>
            <h2 className="mt-2 text-4xl pro-heading tracking-tighter">
              Notification <span className="text-kjc-accent italic">settings</span>
            </h2>
            <p className="mt-3 text-xs font-bold leading-relaxed text-white/40">
              Enable important chat/listing alerts. CampusX updates stay off unless you allow them.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/45"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          <PreferenceCard
            icon={
              requestingPush ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Bell size={20} />
              )
            }
            title="Message alerts"
            description={
              pushSupported
                ? "Get browser/app alerts when someone messages you or pings your listing."
                : "Push alerts are not supported on this browser/device."
            }
            active={notificationsEnabled}
            disabled={requestingPush || !pushSupported}
            onClick={() => {
              if (notificationsEnabled) {
                setNotificationsEnabled(false);
                return;
              }

              void enableMessageAlerts();
            }}
          />

          <PreferenceCard
            icon={<Mail size={20} />}
            title="Email fallback"
            description="If push alerts are unavailable, CampusX can email important chat/listing alerts."
            active={emailNotifications}
            onClick={() => setEmailNotifications((prev) => !prev)}
          />

          <PreferenceCard
            icon={<Megaphone size={20} />}
            title="CampusX updates"
            description="Optional launch updates, useful marketplace updates, and product news."
            active={marketingOptIn}
            onClick={() => setMarketingOptIn((prev) => !prev)}
          />

          <div className="flex gap-3 rounded-[26px] border border-emerald-500/15 bg-emerald-500/10 p-5">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-400" />
            <p className="text-xs font-bold leading-relaxed text-white/55">
              Marketing updates will only be sent if CampusX updates are enabled.
              Important app/security messages may still appear inside CampusX.
            </p>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving || requestingPush}
            className="mt-4 w-full rounded-[32px] bg-kjc-accent py-6 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreferenceCard({
  icon,
  title,
  description,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-4 rounded-[30px] border p-5 text-left transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50 ${
        active
          ? "border-kjc-accent bg-kjc-accent/15"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          active ? "bg-kjc-accent text-white" : "bg-white/5 text-white/45"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
          {title}
        </p>
        <p className="mt-1 text-xs font-bold leading-relaxed text-white/40">
          {description}
        </p>
      </div>

      <span
        className={`relative h-7 w-12 rounded-full border transition-colors ${
          active
            ? "border-kjc-accent bg-kjc-accent"
            : "border-white/15 bg-white/5"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
            active ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}