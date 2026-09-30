export const createUiSlice = (set) => ({
  pendingRequests: 0,
  startRequest: () => set((s) => ({ pendingRequests: s.pendingRequests + 1 })),
  endRequest: () =>
    set((s) => ({ pendingRequests: Math.max(0, s.pendingRequests - 1) })),
});
