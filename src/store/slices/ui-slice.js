export const createUiSlice = (set) => ({
  pendingRequests: 0,
  startRequest: () => set((s) => ({ pendingRequests: s.pendingRequests + 1 })),
  endRequest: () =>
    set((s) => ({ pendingRequests: Math.max(0, s.pendingRequests - 1) })),

  // "connecting" | "connected" | "reconnecting" | "disconnected"
  socketStatus: "connecting",
  setSocketStatus: (socketStatus) => set({ socketStatus }),
  // Bumped after every re-connection so screens can re-sync missed data
  reconnectCount: 0,
  bumpReconnect: () => set((s) => ({ reconnectCount: s.reconnectCount + 1 })),
});
