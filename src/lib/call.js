import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { useAppStore } from "@/store";
import { showNotification } from "@/lib/notifications";

// 1-to-1 voice/video calls. The socket carries signalling only; audio and video
// travel peer to peer over WebRTC.

const RING_TIMEOUT = 45000;
const CONNECT_TIMEOUT = 30000;
const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const END_LABELS = {
  hangup: "Call ended",
  cancelled: "Call cancelled",
  rejected: "Call declined",
  busy: "User is busy",
  "no-answer": "No answer",
  missed: "Missed call",
  unavailable: "User is unavailable",
  disconnected: "Connection lost",
  failed: "Call failed",
};

const runtime = {
  socket: null,
  pc: null,
  local: null,
  remote: null,
  facing: "user",
  iceServers: null,
  pendingCandidates: [],
  ringTimer: null,
  connectTimer: null,
  ringInterval: null,
  disconnectTimer: null,
  wakeLock: null,
};

export const getLocalStream = () => runtime.local;
export const getRemoteStream = () => runtime.remote;

const store = () => useAppStore.getState();
const getCall = () => store().call;
const setCall = (patch) => store().setCall(patch);
const bump = () => store().bumpCallMedia();

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const displayName = (user) =>
  `${user?.firstName || user?.email || "Someone"} ${user?.lastName || ""}`.trim();

// ---------------------------------------------------------------- sounds
let audioCtx;
const beep = (freq, offset, duration, volume) => {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const start = audioCtx.currentTime + offset;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  } catch {
    // audio blocked until the user interacts with the page
  }
};

const stopRinging = () => {
  clearInterval(runtime.ringInterval);
  runtime.ringInterval = null;
};

const startRinging = (kind) => {
  stopRinging();
  const cycle = () => {
    if (kind === "incoming") {
      beep(880, 0, 0.35, 0.25);
      beep(660, 0.45, 0.35, 0.25);
    } else {
      beep(440, 0, 0.9, 0.12); // soft ring-back tone for the caller
    }
  };
  cycle();
  runtime.ringInterval = setInterval(cycle, kind === "incoming" ? 2200 : 3000);
};

// ---------------------------------------------------------------- media
const mediaErrorMessage = (error) => {
  if (error?.name === "NotAllowedError") {
    return "Allow microphone and camera access in your browser to make calls.";
  }
  if (error?.name === "NotFoundError") {
    return "No microphone or camera was found on this device.";
  }
  if (error?.name === "NotReadableError") {
    return "Your microphone or camera is being used by another app.";
  }
  return "Could not start the call. Check your microphone and camera.";
};

const getMedia = (callType, facing) =>
  navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video:
      callType === "video"
        ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
  });

const loadIceServers = async () => {
  if (runtime.iceServers) return runtime.iceServers;
  try {
    const { data } = await apiClient.get("/api/call/ice-servers");
    runtime.iceServers = data.iceServers;
  } catch {
    runtime.iceServers = DEFAULT_ICE_SERVERS;
  }
  return runtime.iceServers;
};

const acquireWakeLock = async () => {
  try {
    runtime.wakeLock = await navigator.wakeLock?.request("screen");
  } catch {
    // not supported or denied
  }
};

const sendMediaState = () => {
  const { callId, micOn, camOn } = getCall();
  runtime.socket?.emit("call:media-state", { callId, micOn, camOn });
};

// ---------------------------------------------------------------- lifecycle
const cleanup = (reason) => {
  stopRinging();
  clearTimeout(runtime.ringTimer);
  clearTimeout(runtime.connectTimer);
  clearTimeout(runtime.disconnectTimer);
  runtime.local?.getTracks().forEach((track) => track.stop());
  if (runtime.pc) {
    runtime.pc.onicecandidate = null;
    runtime.pc.ontrack = null;
    runtime.pc.onconnectionstatechange = null;
    runtime.pc.close();
  }
  runtime.wakeLock?.release?.().catch(() => {});
  Object.assign(runtime, {
    pc: null,
    local: null,
    remote: null,
    pendingCandidates: [],
    wakeLock: null,
    facing: "user",
  });
  bump();

  const { callId, status } = getCall();
  if (status === "idle") return;
  setCall({ status: "ended", endReason: END_LABELS[reason] || "Call ended" });
  setTimeout(() => {
    if (getCall().callId === callId) store().resetCall();
  }, 1800);
};

const createPeerConnection = async (callId) => {
  const iceServers = await loadIceServers();
  const pc = new RTCPeerConnection({ iceServers });
  runtime.pc = pc;
  runtime.remote = new MediaStream();
  // pendingCandidates is deliberately kept: candidates can arrive before the offer is processed

  runtime.local.getTracks().forEach((track) => pc.addTrack(track, runtime.local));

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      runtime.socket?.emit("call:signal", {
        callId,
        data: { candidate: event.candidate },
      });
    }
  };

  pc.ontrack = (event) => {
    if (!runtime.remote.getTracks().includes(event.track)) {
      runtime.remote.addTrack(event.track);
    }
    bump();
  };

  pc.onconnectionstatechange = () => {
    if (runtime.pc !== pc) return;
    switch (pc.connectionState) {
      case "connected":
        clearTimeout(runtime.connectTimer);
        clearTimeout(runtime.disconnectTimer);
        stopRinging();
        setCall({
          status: "active",
          startedAt: getCall().startedAt || Date.now(),
          reconnecting: false,
        });
        sendMediaState();
        if (getCall().callType === "video") acquireWakeLock();
        break;
      case "disconnected":
        setCall({ reconnecting: true });
        clearTimeout(runtime.disconnectTimer);
        runtime.disconnectTimer = setTimeout(() => {
          if (runtime.pc === pc && pc.connectionState !== "connected") {
            endCall("disconnected");
          }
        }, 12000);
        break;
      case "failed":
        endCall("failed");
        break;
      default:
    }
  };

  return pc;
};

const flushCandidates = async () => {
  const queued = runtime.pendingCandidates;
  runtime.pendingCandidates = [];
  for (const candidate of queued) {
    try {
      await runtime.pc.addIceCandidate(candidate);
    } catch (error) {
      console.log("ICE candidate rejected", error);
    }
  }
};

const armConnectTimeout = () => {
  clearTimeout(runtime.connectTimer);
  runtime.connectTimer = setTimeout(() => {
    if (getCall().status === "connecting") endCall("failed");
  }, CONNECT_TIMEOUT);
};

// ---------------------------------------------------------------- actions
export const startCall = async (peer, callType) => {
  const socket = runtime.socket;
  if (getCall().status !== "idle") {
    toast.info("You're already in a call.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    toast.error("Calls need a secure (https) connection and a supported browser.");
    return;
  }
  if (!socket?.connected) {
    toast.error("You're offline. Try again once you're reconnected.");
    return;
  }

  let stream;
  try {
    stream = await getMedia(callType, "user");
  } catch (error) {
    toast.error(mediaErrorMessage(error));
    return;
  }

  runtime.local = stream;
  const callId = newId();
  store().resetCall();
  setCall({
    status: "outgoing",
    callId,
    peer,
    callType,
    isCaller: true,
    micOn: true,
    camOn: callType === "video",
  });
  bump();
  startRinging("outgoing");
  loadIceServers();
  runtime.ringTimer = setTimeout(() => endCall("no-answer"), RING_TIMEOUT);

  socket
    .timeout(8000)
    .emit("call:invite", { to: peer._id, callId, callType }, (err, res) => {
      if (getCall().callId !== callId) return;
      if (err || !res?.ok) cleanup(err ? "unavailable" : res.reason || "failed");
    });
};

export const acceptCall = async () => {
  const call = getCall();
  if (call.status !== "incoming") return;
  stopRinging();
  clearTimeout(runtime.ringTimer);

  try {
    runtime.local = await getMedia(call.callType, "user");
  } catch (error) {
    toast.error(mediaErrorMessage(error));
    rejectCall();
    return;
  }

  setCall({
    status: "connecting",
    micOn: true,
    camOn: call.callType === "video",
  });
  bump();
  loadIceServers();
  armConnectTimeout();
  runtime.socket?.emit("call:accept", { callId: call.callId });
};

export const rejectCall = () => {
  const { callId } = getCall();
  runtime.socket?.emit("call:reject", { callId });
  cleanup("rejected");
};

export const endCall = (reason = "hangup") => {
  const { callId, status } = getCall();
  if (status === "idle") return;
  // Hanging up before the other person answers is a cancellation
  const finalReason =
    status === "outgoing" && reason === "hangup" ? "cancelled" : reason;
  runtime.socket?.emit("call:end", { callId, reason: finalReason });
  cleanup(finalReason);
};

export const toggleMic = () => {
  const track = runtime.local?.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  setCall({ micOn: track.enabled });
  sendMediaState();
};

export const toggleCamera = () => {
  const track = runtime.local?.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  setCall({ camOn: track.enabled });
  sendMediaState();
  bump();
};

// "Speaker" here controls whether you hear the other person
export const toggleSpeaker = () => setCall({ speakerOn: !getCall().speakerOn });

export const switchCamera = async () => {
  const oldTrack = runtime.local?.getVideoTracks()[0];
  if (!oldTrack || !runtime.pc) return;
  const next = runtime.facing === "user" ? "environment" : "user";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: next },
    });
    const newTrack = stream.getVideoTracks()[0];
    newTrack.enabled = oldTrack.enabled;
    const sender = runtime.pc.getSenders().find((s) => s.track?.kind === "video");
    await sender?.replaceTrack(newTrack);
    runtime.local.removeTrack(oldTrack);
    oldTrack.stop();
    runtime.local.addTrack(newTrack);
    runtime.facing = next;
    bump();
  } catch (error) {
    toast.error("Could not switch the camera.");
  }
};

// ---------------------------------------------------------------- socket events
export const registerCallHandlers = (socket) => {
  runtime.socket = socket;

  const onIncoming = ({ callId, callType, from }) => {
    if (getCall().status !== "idle") {
      socket.emit("call:reject", { callId });
      return;
    }
    store().resetCall();
    setCall({
      status: "incoming",
      callId,
      peer: from,
      callType,
      isCaller: false,
      micOn: true,
      camOn: callType === "video",
    });
    startRinging("incoming");
    runtime.ringTimer = setTimeout(() => {
      if (getCall().callId === callId && getCall().status === "incoming") {
        cleanup("missed");
      }
    }, RING_TIMEOUT + 5000);
    if (document.hidden) {
      showNotification({
        title: `Incoming ${callType} call`,
        body: displayName(from),
        tag: "incoming-call",
        url: `/chat/contact/${from._id}`,
        icon: undefined,
      });
    }
  };

  // Callee picked up: the caller starts the WebRTC handshake
  const onAccepted = async ({ callId }) => {
    if (getCall().callId !== callId || getCall().status !== "outgoing") return;
    stopRinging();
    clearTimeout(runtime.ringTimer);
    setCall({ status: "connecting" });
    armConnectTimeout();
    try {
      const pc = await createPeerConnection(callId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:signal", {
        callId,
        data: { sdp: pc.localDescription },
      });
    } catch (error) {
      console.log("Could not create offer", error);
      endCall("failed");
    }
  };

  const onSignal = async ({ callId, data }) => {
    if (getCall().callId !== callId || !data) return;
    try {
      if (data.sdp?.type === "offer") {
        const pc = runtime.pc || (await createPeerConnection(callId));
        await pc.setRemoteDescription(data.sdp);
        await flushCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:signal", {
          callId,
          data: { sdp: pc.localDescription },
        });
      } else if (data.sdp?.type === "answer") {
        await runtime.pc?.setRemoteDescription(data.sdp);
        await flushCandidates();
      } else if (data.candidate) {
        if (runtime.pc?.remoteDescription) {
          await runtime.pc.addIceCandidate(data.candidate);
        } else {
          runtime.pendingCandidates.push(data.candidate);
        }
      }
    } catch (error) {
      console.log("Signalling error", error);
    }
  };

  const onEnded = ({ callId, reason }) => {
    if (getCall().callId !== callId) return;
    // From the callee's side an unanswered call is a missed call
    const label =
      reason === "no-answer" && !getCall().isCaller ? "missed" : reason;
    cleanup(label);
  };

  const onMediaState = ({ callId, micOn, camOn }) => {
    if (getCall().callId !== callId) return;
    setCall({ remoteMicOn: micOn, remoteCamOn: camOn });
  };

  const onPageHide = () => {
    if (getCall().status !== "idle") {
      socket.emit("call:end", { callId: getCall().callId, reason: "hangup" });
    }
  };

  socket.on("call:incoming", onIncoming);
  socket.on("call:accepted", onAccepted);
  socket.on("call:signal", onSignal);
  socket.on("call:ended", onEnded);
  socket.on("call:media-state", onMediaState);
  window.addEventListener("pagehide", onPageHide);

  return () => {
    socket.off("call:incoming", onIncoming);
    socket.off("call:accepted", onAccepted);
    socket.off("call:signal", onSignal);
    socket.off("call:ended", onEnded);
    socket.off("call:media-state", onMediaState);
    window.removeEventListener("pagehide", onPageHide);
    if (getCall().status !== "idle") cleanup("hangup");
    if (runtime.socket === socket) runtime.socket = null;
  };
};
