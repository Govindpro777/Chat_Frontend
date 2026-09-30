const idleCall = {
  // "idle" | "outgoing" | "incoming" | "connecting" | "active" | "ended"
  status: "idle",
  callId: null,
  peer: null,
  callType: "audio",
  isCaller: false,
  startedAt: null,
  micOn: true,
  camOn: true,
  speakerOn: true,
  remoteMicOn: true,
  remoteCamOn: true,
  reconnecting: false,
  endReason: null,
};

export const createCallSlice = (set, get) => ({
  call: idleCall,
  setCall: (patch) => set({ call: { ...get().call, ...patch } }),
  resetCall: () => set({ call: idleCall }),
  // Streams live outside the store; this tells the UI to re-attach them
  callMediaVersion: 0,
  bumpCallMedia: () =>
    set((s) => ({ callMediaVersion: s.callMediaVersion + 1 })),
});
