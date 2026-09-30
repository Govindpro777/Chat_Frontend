import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import Logo from "@/components/common/logo";

export const Spinner = ({ className = "h-5 w-5" }) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-[#8417ff] ${className}`}
  />
);

// Shown while the app boots; explains the delay when the free server is waking up
export const FullPageLoader = () => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-[#1b1c24] px-6 text-center text-white">
      <Logo />
      <Spinner className="h-8 w-8 border-[3px]" />
      <p className="max-w-xs text-sm text-white/50">
        {slow
          ? "Waking up the server, this can take up to a minute..."
          : "Loading..."}
      </p>
    </div>
  );
};

// Thin bar at the top of the screen whenever any request is in flight
export const TopProgressBar = () => {
  const pending = useAppStore((s) => s.pendingRequests);
  const [visible, setVisible] = useState(false);

  // Short delay so quick requests don't flash the bar
  useEffect(() => {
    if (pending > 0) {
      const timer = setTimeout(() => setVisible(true), 200);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [pending]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[2000] h-0.5 overflow-hidden bg-[#8417ff]/20">
      <div className="h-full w-1/3 animate-[progress_1.1s_ease-in-out_infinite] rounded-full bg-[#8417ff]" />
    </div>
  );
};

export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-white/10 ${className}`} />
);

export const MessagesSkeleton = () => (
  <div className="flex flex-col gap-4 py-2" aria-hidden>
    {[
      ["w-40", false],
      ["w-56", true],
      ["w-32", false],
      ["w-48", true],
      ["w-64", false],
      ["w-28", true],
    ].map(([width, own], i) => (
      <div key={i} className={`flex ${own ? "justify-end" : "justify-start"}`}>
        <Skeleton className={`h-9 ${width} max-w-[70%] rounded-2xl`} />
      </div>
    ))}
  </div>
);

export const ContactsSkeleton = ({ rows = 3 }) => (
  <div className="flex flex-col gap-1 py-1" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 pl-5 sm:pl-10 py-2">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 pr-6">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);
