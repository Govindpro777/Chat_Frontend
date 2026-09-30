import { useEffect, useRef, useState } from "react";
import {
  IoCall,
  IoCameraReverse,
  IoMic,
  IoMicOff,
  IoVideocam,
  IoVideocamOff,
  IoVolumeHigh,
  IoVolumeMute,
} from "react-icons/io5";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HOST } from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  acceptCall,
  endCall,
  getLocalStream,
  getRemoteStream,
  rejectCall,
  switchCamera,
  toggleCamera,
  toggleMic,
  toggleSpeaker,
} from "@/lib/call";

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const nameOf = (peer) =>
  `${peer?.firstName || peer?.email || "Unknown"} ${peer?.lastName || ""}`.trim();

const PeerAvatar = ({ peer, size = "h-28 w-28 sm:h-36 sm:w-36", pulse }) => (
  <div className="relative flex items-center justify-center">
    {pulse && (
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8417ff]/30" />
    )}
    <Avatar className={`${size} relative`}>
      {peer?.image && (
        <AvatarImage
          src={`${HOST}/${peer.image}`}
          alt=""
          className="object-cover"
        />
      )}
      <AvatarFallback
        className={`uppercase text-4xl sm:text-5xl ${getColor(
          peer?.color
        )} flex items-center justify-center`}
      >
        {nameOf(peer).charAt(0)}
      </AvatarFallback>
    </Avatar>
  </div>
);

const Control = ({ onClick, label, children, tone = "default", active = true, size = "h-14 w-14" }) => {
  const tones = {
    default: active ? "bg-white/15 hover:bg-white/25" : "bg-white text-black hover:bg-white/90",
    danger: "bg-red-600 hover:bg-red-500",
    success: "bg-green-600 hover:bg-green-500",
  };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`flex ${size} items-center justify-center rounded-full text-2xl transition-colors ${tones[tone]}`}
      >
        {children}
      </button>
      <span className="text-[11px] text-white/70">{label}</span>
    </div>
  );
};

const CallOverlay = () => {
  const call = useAppStore((s) => s.call);
  const mediaVersion = useAppStore((s) => s.callMediaVersion);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  const { status, callType, peer, micOn, camOn, speakerOn, remoteMicOn, remoteCamOn } = call;
  const isVideo = callType === "video";
  const inCall = status === "connecting" || status === "active";
  const touchDevice =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  // Streams live outside React state, so re-attach them whenever they change
  useEffect(() => {
    const remote = getRemoteStream();
    const local = getLocalStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remote;
      remoteAudioRef.current.play?.().catch(() => {});
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = local;
  }, [mediaVersion, status, callType]);

  // The speaker button mutes what you hear
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !speakerOn;
  }, [speakerOn, status]);

  useEffect(() => {
    if (status !== "active" || !call.startedAt) {
      setElapsed(0);
      return;
    }
    const tick = () =>
      setElapsed(Math.floor((Date.now() - call.startedAt) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [status, call.startedAt]);

  if (status === "idle") return null;

  const statusText = {
    outgoing: "Calling...",
    incoming: `Incoming ${isVideo ? "video" : "voice"} call`,
    connecting: "Connecting...",
    active: call.reconnecting ? "Reconnecting..." : formatDuration(elapsed),
    ended: call.endReason,
  }[status];

  const showRemoteVideo = isVideo && inCall && remoteCamOn;
  const showLocalPreview = isVideo && (status === "outgoing" || inCall);

  return (
    <div
      role="dialog"
      aria-label="Call"
      className="fixed inset-0 z-[3000] flex flex-col overflow-hidden bg-[#0f1016] text-white"
    >
      {/* Always mounted so audio keeps playing */}
      <audio ref={remoteAudioRef} autoPlay />

      {isVideo && inCall && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${
            showRemoteVideo ? "" : "hidden"
          }`}
        />
      )}
      {isVideo && <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />}

      <div className="relative flex flex-1 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 pt-5 text-center">
          <p className="truncate text-lg font-semibold sm:text-xl">{nameOf(peer)}</p>
          <p
            className={`mt-0.5 text-sm ${
              call.reconnecting ? "text-amber-300" : "text-white/70"
            }`}
          >
            {statusText}
          </p>
          {inCall && !remoteMicOn && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-0.5 text-xs text-white/80">
              <IoMicOff /> {nameOf(peer).split(" ")[0]} is muted
            </p>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center px-4">
          {!showRemoteVideo && (
            <PeerAvatar
              peer={peer}
              pulse={status === "outgoing" || status === "incoming"}
            />
          )}
        </div>

        {showLocalPreview && (
          <div className="absolute right-3 top-20 h-36 w-24 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-xl sm:h-44 sm:w-32">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${camOn ? "" : "hidden"} -scale-x-100`}
            />
            {!camOn && (
              <div className="flex h-full w-full items-center justify-center text-white/60">
                <IoVideocamOff className="text-2xl" />
              </div>
            )}
          </div>
        )}

        {status !== "ended" && (
          <div className="px-4 pb-8 pt-4">
            {status === "incoming" ? (
              <div className="flex items-end justify-center gap-16">
                <Control label="Decline" tone="danger" size="h-16 w-16" onClick={rejectCall}>
                  <IoCall className="rotate-[135deg]" />
                </Control>
                <Control label="Accept" tone="success" size="h-16 w-16" onClick={acceptCall}>
                  {isVideo ? <IoVideocam /> : <IoCall />}
                </Control>
              </div>
            ) : (
              <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6">
                {inCall && (
                  <>
                    <Control label={micOn ? "Mute" : "Unmute"} active={micOn} onClick={toggleMic}>
                      {micOn ? <IoMic /> : <IoMicOff />}
                    </Control>
                    {isVideo && (
                      <Control
                        label={camOn ? "Camera off" : "Camera on"}
                        active={camOn}
                        onClick={toggleCamera}
                      >
                        {camOn ? <IoVideocam /> : <IoVideocamOff />}
                      </Control>
                    )}
                    <Control
                      label={speakerOn ? "Speaker" : "Speaker off"}
                      active={speakerOn}
                      onClick={toggleSpeaker}
                    >
                      {speakerOn ? <IoVolumeHigh /> : <IoVolumeMute />}
                    </Control>
                    {isVideo && touchDevice && camOn && (
                      <Control label="Flip" onClick={switchCamera}>
                        <IoCameraReverse />
                      </Control>
                    )}
                  </>
                )}
                <Control
                  label={status === "outgoing" ? "Cancel" : "End"}
                  tone="danger"
                  onClick={() => endCall("hangup")}
                >
                  <IoCall className="rotate-[135deg]" />
                </Control>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;
