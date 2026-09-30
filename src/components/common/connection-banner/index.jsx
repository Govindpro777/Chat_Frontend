import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { Spinner } from "@/components/common/loader";

// Tells the user when the realtime connection drops and when it comes back
const ConnectionBanner = () => {
  const status = useAppStore((s) => s.socketStatus);
  const loggedIn = useAppStore((s) => !!s.userInfo);
  const [offlineShown, setOfflineShown] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const wasShown = useRef(false);

  const disconnected = loggedIn && status !== "connected";

  // Wait a moment so brief reconnects don't flash the banner
  useEffect(() => {
    if (disconnected) {
      const timer = setTimeout(() => {
        setOfflineShown(true);
        wasShown.current = true;
      }, 1500);
      return () => clearTimeout(timer);
    }
    setOfflineShown(false);
    if (wasShown.current && loggedIn) {
      wasShown.current = false;
      setBackOnline(true);
      const timer = setTimeout(() => setBackOnline(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [disconnected, loggedIn]);

  if (!offlineShown && !backOnline) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-2 z-[1500] flex justify-center px-3 pt-[env(safe-area-inset-top)]">
      {offlineShown ? (
        <div className="flex items-center gap-2 rounded-full bg-amber-500/95 px-4 py-1.5 text-xs sm:text-sm font-medium text-black shadow-lg">
          <Spinner className="h-3.5 w-3.5 border-black/30 border-t-black" />
          {navigator.onLine === false
            ? "You're offline. Messages will send when you're back."
            : "Reconnecting..."}
        </div>
      ) : (
        <div className="rounded-full bg-green-500/95 px-4 py-1.5 text-xs sm:text-sm font-medium text-black shadow-lg">
          Back online
        </div>
      )}
    </div>
  );
};

export default ConnectionBanner;
