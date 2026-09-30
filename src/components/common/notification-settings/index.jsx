import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store";
import {
  notificationsSupported,
  playNotificationSound,
  requestNotificationPermission,
} from "@/lib/notifications";

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
      checked ? "bg-[#8417ff]" : "bg-[#3a3b47]"
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
        checked ? "translate-x-4" : ""
      }`}
    />
  </button>
);

const Row = ({ title, description, children }) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <div className="min-w-0">
      <p className="text-sm sm:text-[15px] text-white/90">{title}</p>
      {description && (
        <p className="text-[11px] sm:text-xs text-white/40 mt-0.5">{description}</p>
      )}
    </div>
    {children}
  </div>
);

const NotificationSettings = () => {
  const {
    notificationsEnabled,
    notificationSound,
    notificationPreview,
    mutedChats,
    updateNotificationSettings,
    unmuteAllChats,
  } = useAppStore();
  const supported = notificationsSupported();
  const [permission, setPermission] = useState(
    supported ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    if (supported) setPermission(Notification.permission);
  }, [supported]);

  const handleMasterToggle = async (value) => {
    if (value) {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.error(
          "Notifications are blocked. Allow them in your browser's site settings."
        );
      }
    }
    updateNotificationSettings({ notificationsEnabled: value });
  };

  const handleSoundToggle = (value) => {
    updateNotificationSettings({ notificationSound: value });
    if (value) playNotificationSound();
  };

  return (
    <div className="w-full rounded-xl bg-[#2c2e3b]/60 border border-white/5 px-3.5 sm:px-5 py-1 text-white">
      <h3 className="pt-2.5 pb-1 text-xs uppercase tracking-widest text-white/50">
        Notifications
      </h3>
      {!supported && (
        <p className="py-3 text-sm text-yellow-400">
          This browser does not support notifications.
        </p>
      )}
      {permission === "denied" && (
        <p className="py-2 text-sm text-red-400">
          Notifications are blocked for this site. Enable them from the lock
          icon in the address bar.
        </p>
      )}
      <div className="divide-y divide-white/5">
        <Row
          title="Message notifications"
          description="Show a browser notification for new messages"
        >
          <Toggle
            checked={notificationsEnabled && permission !== "denied"}
            onChange={handleMasterToggle}
            disabled={!supported}
          />
        </Row>
        <Row title="Sound" description="Play a tone when a message arrives">
          <Toggle
            checked={notificationSound}
            onChange={handleSoundToggle}
            disabled={!notificationsEnabled}
          />
        </Row>
        <Row
          title="Message preview"
          description="Show the message text in the notification"
        >
          <Toggle
            checked={notificationPreview}
            onChange={(v) =>
              updateNotificationSettings({ notificationPreview: v })
            }
            disabled={!notificationsEnabled}
          />
        </Row>
        <Row
          title="Muted chats"
          description={
            mutedChats.length
              ? `${mutedChats.length} chat${mutedChats.length > 1 ? "s" : ""} muted`
              : "Mute a single chat from its header bell icon"
          }
        >
          <button
            type="button"
            disabled={!mutedChats.length}
            onClick={unmuteAllChats}
            className="text-xs sm:text-sm text-[#b47cff] disabled:text-white/30 shrink-0"
          >
            Unmute all
          </button>
        </Row>
      </div>
    </div>
  );
};

export default NotificationSettings;
