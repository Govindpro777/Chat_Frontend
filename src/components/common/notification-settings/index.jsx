import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store";
import {
  notificationsSupported,
  playNotificationSound,
  requestNotificationPermission,
  showNotification,
} from "@/lib/notifications";

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
      checked ? "bg-[#8417ff]" : "bg-[#3a3b47]"
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
        checked ? "translate-x-5" : ""
      }`}
    />
  </button>
);

const Row = ({ title, description, children }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="min-w-0">
      <p className="text-white/90">{title}</p>
      {description && (
        <p className="text-xs text-white/40 mt-0.5">{description}</p>
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

  const sendTest = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result !== "granted") {
      toast.error("Please allow notifications in your browser first.");
      return;
    }
    if (notificationSound) playNotificationSound();
    showNotification({
      title: "Notifications are working",
      body: "You will be notified when new messages arrive.",
      tag: "test",
      url: "/chat",
    });
  };

  const active = notificationsEnabled && permission === "granted";

  return (
    <div className="w-full rounded-xl bg-[#2c2e3b]/60 border border-white/5 px-4 sm:px-5 py-2 text-white">
      <h3 className="pt-3 pb-1 text-sm uppercase tracking-widest text-white/50">
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
            className="text-sm text-[#b47cff] disabled:text-white/30"
          >
            Unmute all
          </button>
        </Row>
      </div>
      <div className="py-3">
        <button
          type="button"
          onClick={sendTest}
          disabled={!supported || !active}
          className="w-full rounded-lg border border-white/10 py-2 text-sm hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          Send test notification
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
