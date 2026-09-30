import { create } from "zustand";
import { createAuthSlice } from "./slices/auth-slice";
import { createChatSlice } from "./slices/chat-slice";
import { createNotificationSlice } from "./slices/notification-slice";
import { createUiSlice } from "./slices/ui-slice";

export const useAppStore = create()((...a) => ({
  ...createAuthSlice(...a),
  ...createChatSlice(...a),
  ...createNotificationSlice(...a),
  ...createUiSlice(...a),
}));
